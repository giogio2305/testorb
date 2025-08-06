const { exec } = require('child_process');
const path = require('path');
const ContainerManager = require('./containerManager');

class SmartContainerManager extends ContainerManager {
    constructor() {
        super();
        this.serviceStartupOrder = ['android', 'appium', 'app'];
        this.serviceDependencies = {
            'appium': ['android'],
            'app': ['android', 'appium']
        };
        this.healthCheckCache = new Map();
        this.cacheTimeout = 5000; // 5 secondes de cache
    }

    /**
     * Démarrage intelligent des services - évite les redémarrages inutiles
     */
    async smartStartServices(requestedServices = null) {
        const servicesToCheck = requestedServices || Object.values(this.services);
        console.log(`🚀 Smart start initiated for services: ${servicesToCheck.join(', ')}`);

        try {
            // 1. Vérification rapide de l'état actuel
            const currentStatus = await this.getDetailedServiceStatus();
            const analysis = this.analyzeServiceStatus(currentStatus, servicesToCheck);

            console.log('📊 Service analysis:', {
                healthy: analysis.healthy,
                needsStart: analysis.needsStart,
                needsRestart: analysis.needsRestart,
                readyToUse: analysis.readyToUse
            });

            // 2. Si tout est déjà prêt, retourner immédiatement
            if (analysis.readyToUse.length === servicesToCheck.length) {
                console.log('✅ All requested services are already healthy and ready!');
                return {
                    success: true,
                    message: 'All services were already running and healthy',
                    servicesStarted: [],
                    servicesRestarted: [],
                    totalTime: 0
                };
            }

            const startTime = Date.now();
            const results = {
                servicesStarted: [],
                servicesRestarted: [],
                errors: []
            };

            // 3. Redémarrer les services défaillants en premier
            if (analysis.needsRestart.length > 0) {
                console.log(`🔄 Restarting unhealthy services: ${analysis.needsRestart.join(', ')}`);
                await this.restartSpecificServices(analysis.needsRestart);
                results.servicesRestarted = analysis.needsRestart;
            }

            // 4. Démarrer les services manquants dans l'ordre des dépendances
            if (analysis.needsStart.length > 0) {
                console.log(`▶️ Starting missing services: ${analysis.needsStart.join(', ')}`);
                const orderedServices = this.orderServicesByDependencies(analysis.needsStart);
                await this.startServicesInOrder(orderedServices);
                results.servicesStarted = analysis.needsStart;
            }

            // 5. Attendre que tous les services demandés soient prêts
            await this.waitForSpecificServicesHealthy(servicesToCheck);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Smart start completed in ${totalTime}ms`);

            return {
                success: true,
                message: 'Services started successfully with smart optimization',
                ...results,
                totalTime
            };

        } catch (error) {
            console.error('❌ Smart start failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyse détaillée de l'état des services
     */
    async getDetailedServiceStatus() {
        const cacheKey = 'detailed_status';
        const cached = this.healthCheckCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const command = `${this.dockerComposeCmd} ps --format json`;
            const { stdout } = await this.execCommand(command);
            
            const services = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try { return JSON.parse(line); }
                    catch { return null; }
                })
                .filter(service => service !== null);

            const detailedStatus = {};
            services.forEach(service => {
                detailedStatus[service.Service] = {
                    state: service.State,
                    health: service.Health || 'unknown',
                    status: service.Status,
                    exitCode: service.ExitCode || 0,
                    isRunning: service.State === 'running',
                    isHealthy: service.Health === 'healthy' || (service.State === 'running' && !service.Health)
                };
            });

            // Ajouter les services manquants
            Object.values(this.services).forEach(serviceName => {
                if (!detailedStatus[serviceName]) {
                    detailedStatus[serviceName] = {
                        state: 'not_found',
                        health: 'unknown',
                        status: 'Not created',
                        exitCode: 0,
                        isRunning: false,
                        isHealthy: false
                    };
                }
            });

            // Mettre en cache
            this.healthCheckCache.set(cacheKey, {
                data: detailedStatus,
                timestamp: Date.now()
            });

            return detailedStatus;
        } catch (error) {
            console.error('Failed to get detailed service status:', error.message);
            return {};
        }
    }

    /**
     * Analyse l'état des services et détermine les actions nécessaires
     */
    analyzeServiceStatus(currentStatus, requestedServices) {
        const analysis = {
            healthy: [],
            needsStart: [],
            needsRestart: [],
            readyToUse: []
        };

        requestedServices.forEach(serviceName => {
            const service = currentStatus[serviceName];
            
            if (!service || service.state === 'not_found') {
                analysis.needsStart.push(serviceName);
            } else if (service.isRunning && service.isHealthy) {
                analysis.healthy.push(serviceName);
                analysis.readyToUse.push(serviceName);
            } else if (service.isRunning && !service.isHealthy) {
                // Service en cours d'exécution mais pas healthy - attendre un peu
                if (serviceName === 'app' || service.health === 'starting') {
                    analysis.healthy.push(serviceName); // App n'a pas de healthcheck
                    analysis.readyToUse.push(serviceName);
                } else {
                    analysis.needsRestart.push(serviceName);
                }
            } else {
                // Service arrêté ou en erreur
                if (service.exitCode !== 0) {
                    analysis.needsRestart.push(serviceName);
                } else {
                    analysis.needsStart.push(serviceName);
                }
            }
        });

        return analysis;
    }

    /**
     * Ordonne les services selon leurs dépendances
     */
    orderServicesByDependencies(services) {
        const ordered = [];
        const remaining = [...services];

        while (remaining.length > 0) {
            const canStart = remaining.filter(service => {
                const deps = this.serviceDependencies[service] || [];
                return deps.every(dep => ordered.includes(dep) || !services.includes(dep));
            });

            if (canStart.length === 0) {
                // Pas de dépendances circulaires, ajouter le reste
                ordered.push(...remaining);
                break;
            }

            canStart.forEach(service => {
                ordered.push(service);
                remaining.splice(remaining.indexOf(service), 1);
            });
        }

        return ordered;
    }

    /**
     * Démarre les services dans l'ordre avec gestion des dépendances
     */
    async startServicesInOrder(orderedServices) {
        for (const serviceName of orderedServices) {
            console.log(`🔧 Starting service: ${serviceName}`);
            
            const command = `${this.dockerComposeCmd} up -d ${serviceName}`;
            await this.execCommand(command, { timeout: 60000 });
            
            // Attendre un délai minimal pour que le service démarre
            await this.sleep(2000);
            
            // Pour les services critiques, attendre qu'ils soient au moins en cours d'exécution
            if (['android', 'appium'].includes(serviceName)) {
                await this.waitForServiceRunning(serviceName, 30000);
            }
        }
    }

    /**
     * Redémarre des services spécifiques
     */
    async restartSpecificServices(services) {
        const command = `${this.dockerComposeCmd} restart ${services.join(' ')}`;
        await this.execCommand(command, { timeout: 120000 });
        
        // Attendre que les services redémarrés soient au moins en cours d'exécution
        for (const service of services) {
            await this.waitForServiceRunning(service, 30000);
        }
    }

    /**
     * Attend qu'un service soit en cours d'exécution
     */
    async waitForServiceRunning(serviceName, timeoutMs = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getDetailedServiceStatus();
            if (status[serviceName]?.isRunning) {
                console.log(`✅ Service ${serviceName} is now running`);
                return true;
            }
            
            await this.sleep(2000);
        }
        
        throw new Error(`Service ${serviceName} failed to start within ${timeoutMs}ms`);
    }

    /**
     * Attend que des services spécifiques soient healthy
     */
    async waitForSpecificServicesHealthy(services, timeoutMs = 120000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getDetailedServiceStatus();
            
            const allReady = services.every(serviceName => {
                const service = status[serviceName];
                if (serviceName === 'app') {
                    return service?.isRunning; // App n'a pas de healthcheck
                }
                return service?.isHealthy;
            });
            
            if (allReady) {
                console.log(`✅ All requested services are healthy: ${services.join(', ')}`);
                return true;
            }
            
            // Log du statut actuel
            const statusSummary = services.map(s => {
                const svc = status[s];
                return `${s}: ${svc?.state || 'unknown'}/${svc?.health || 'unknown'}`;
            }).join(', ');
            
            console.log(`⏳ Waiting for services to be healthy... ${statusSummary}`);
            await this.sleep(5000);
        }
        
        throw new Error(`Services failed to become healthy within ${timeoutMs}ms: ${services.join(', ')}`);
    }

    /**
     * Vide le cache de statut
     */
    clearStatusCache() {
        this.healthCheckCache.clear();
    }

    /**
     * Méthode de compatibilité avec l'ancien système
     */
    async ensureServicesRunning() {
        return await this.smartStartServices();
    }
}

module.exports = SmartContainerManager;