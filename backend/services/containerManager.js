const { exec } = require('child_process');
const path = require('path');

class ContainerManager {
    constructor() {
        this.dockerComposeCmd = process.platform === 'win32' ? 'docker-compose' : 'docker compose';
        this.projectRoot = path.resolve(__dirname, '../../');
        this.services = {
            android: 'android',
            appium: 'appium',
            app: 'app'
        };
    }

    async execCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const execOptions = {
                cwd: this.projectRoot,
                timeout: options.timeout || 30000,
                ...options
            };

            exec(command, execOptions, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}. stderr: ${stderr}`));
                } else {
                    resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
                }
            });
        });
    }

    async getServiceStatus() {
        try {
            const command = `${this.dockerComposeCmd} ps --format json`;
            const { stdout } = await this.execCommand(command);
            
            if (!stdout) {
                return {};
            }

            const services = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(service => service !== null);

            const status = {};
            services.forEach(service => {
                status[service.Service] = {
                    state: service.State,
                    health: service.Health || 'unknown',
                    status: service.Status
                };
            });

            return status;
        } catch (error) {
            console.error('Failed to get service status:', error.message);
            return {};
        }
    }

    async isServiceRunning(serviceName) {
        const status = await this.getServiceStatus();
        const service = status[serviceName];
        return service && service.state === 'running';
    }

    async isServiceHealthy(serviceName) {
        const status = await this.getServiceStatus();
        const service = status[serviceName];
        return service && (service.health === 'healthy' || service.state === 'running');
    }

    async areAllServicesRunning() {
        const requiredServices = Object.values(this.services);
        const status = await this.getServiceStatus();
        
        return requiredServices.every(serviceName => {
            const service = status[serviceName];
            return service && service.state === 'running';
        });
    }

    async areAllServicesHealthy() {
        const status = await this.getServiceStatus();
        
        // Check Android and Appium for health, App service for running state
        const androidHealthy = status[this.services.android]?.health === 'healthy';
        const appiumHealthy = status[this.services.appium]?.health === 'healthy';
        const appRunning = status[this.services.app]?.state === 'running';
        
        return androidHealthy && appiumHealthy && appRunning;
    }

    async startServices(serviceNames = null) {
        const servicesToStart = serviceNames || Object.values(this.services);
        const command = `${this.dockerComposeCmd} up -d ${servicesToStart.join(' ')}`;
        
        try {
            console.log(`Starting services: ${servicesToStart.join(', ')}`);
            const result = await this.execCommand(command, { timeout: 120000 });
            console.log('Services started successfully');
            return result;
        } catch (error) {
            console.error('Failed to start services:', error.message);
            throw error;
        }
    }

    async stopServices(serviceNames = null) {
        const servicesToStop = serviceNames || Object.values(this.services);
        const command = `${this.dockerComposeCmd} stop ${servicesToStop.join(' ')}`;
        
        try {
            console.log(`Stopping services: ${servicesToStop.join(', ')}`);
            const result = await this.execCommand(command);
            console.log('Services stopped successfully');
            return result;
        } catch (error) {
            console.error('Failed to stop services:', error.message);
            throw error;
        }
    }

    async restartServices(serviceNames = null) {
        const servicesToRestart = serviceNames || Object.values(this.services);
        const command = `${this.dockerComposeCmd} restart ${servicesToRestart.join(' ')}`;
        
        try {
            console.log(`Restarting services: ${servicesToRestart.join(', ')}`);
            const result = await this.execCommand(command, { timeout: 120000 });
            console.log('Services restarted successfully');
            return result;
        } catch (error) {
            console.error('Failed to restart services:', error.message);
            throw error;
        }
    }

    async waitForServicesHealthy(timeoutMs = 120000, checkIntervalMs = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const allHealthy = await this.areAllServicesHealthy();
                if (allHealthy) {
                    console.log('All services are healthy and ready');
                    return true;
                }
                
                const status = await this.getServiceStatus();
                console.log('Waiting for services to be healthy...', {
                    android: status[this.services.android]?.health || 'unknown',
                    appium: status[this.services.appium]?.health || 'unknown',
                    app: status[this.services.app]?.state || 'unknown'
                });
                
                await this.sleep(checkIntervalMs);
            } catch (error) {
                console.error('Health check error:', error.message);
                await this.sleep(checkIntervalMs);
            }
        }
        
        throw new Error(`Services failed to become healthy within ${timeoutMs}ms`);
    }

    async ensureServicesRunning() {
        const allRunning = await this.areAllServicesRunning();
        
        if (!allRunning) {
            console.log('Not all services are running. Starting missing services...');
            await this.startServices();
            await this.waitForServicesHealthy();
        } else {
            console.log('All services are already running');
            // Still check if they're healthy
            const allHealthy = await this.areAllServicesHealthy();
            if (!allHealthy) {
                console.log('Services are running but not healthy. Waiting for health...');
                await this.waitForServicesHealthy();
            }
        }
    }

    async getServiceLogs(serviceName, lines = 50) {
        try {
            const command = `${this.dockerComposeCmd} logs --tail=${lines} ${serviceName}`;
            const { stdout } = await this.execCommand(command);
            return stdout;
        } catch (error) {
            console.error(`Failed to get logs for ${serviceName}:`, error.message);
            return '';
        }
    }

    async executeInService(serviceName, command, options = {}) {
        const dockerCommand = `${this.dockerComposeCmd} exec -T ${serviceName} ${command}`;
        return await this.execCommand(dockerCommand, options);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getContainerHealth() {
        const status = await this.getServiceStatus();
        return {
            android: {
                running: status[this.services.android]?.state === 'running',
                healthy: status[this.services.android]?.health === 'healthy',
                status: status[this.services.android]?.status || 'unknown'
            },
            appium: {
                running: status[this.services.appium]?.state === 'running',
                healthy: status[this.services.appium]?.health === 'healthy',
                status: status[this.services.appium]?.status || 'unknown'
            },
            app: {
                running: status[this.services.app]?.state === 'running',
                healthy: status[this.services.app]?.state === 'running', // App service doesn't have health check
                status: status[this.services.app]?.status || 'unknown'
            }
        };
    }

    async waitForEmulatorReady(timeoutMs = 300000, checkIntervalMs = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                // Vérifier que le conteneur Android est healthy
                const androidHealthy = await this.isServiceHealthy('android');
                if (!androidHealthy) {
                    console.log('Android container not healthy yet, waiting...');
                    await this.sleep(checkIntervalMs);
                    continue;
                }
                
                // Vérifier que ADB fonctionne
                const adbCheck = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb devices`);
                if (!adbCheck.stdout.includes('emulator-5554\tdevice')) {
                    console.log('ADB not ready yet, waiting...');
                    await this.sleep(checkIntervalMs);
                    continue;
                }
                
                // Vérifier que le boot est complet
                const bootCheck = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb shell getprop sys.boot_completed`);
                if (!bootCheck.stdout.trim().includes('1')) {
                    console.log('Android boot not completed yet, waiting...');
                    await this.sleep(checkIntervalMs);
                    continue;
                }
                
                // Vérifier que l'interface utilisateur est prête
                const uiCheck = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb shell dumpsys window | grep mCurrentFocus`);
                if (uiCheck.stdout.includes('StatusBar') || uiCheck.stdout.includes('Launcher')) {
                    console.log('✅ Emulator is fully ready for testing');
                    return true;
                }
                
                console.log('UI not ready yet, waiting...');
                await this.sleep(checkIntervalMs);
                
            } catch (error) {
                console.error('Emulator readiness check error:', error.message);
                await this.sleep(checkIntervalMs);
            }
        }
        
        throw new Error(`Emulator failed to become ready within ${timeoutMs}ms`);
    }

    async checkEmulatorHealth() {
        try {
            // Vérifications multiples pour s'assurer que l'émulateur fonctionne
            const checks = {
                containerRunning: false,
                adbConnected: false,
                bootCompleted: false,
                uiReady: false,
                memoryOk: false
            };
            
            // 1. Vérifier que le conteneur tourne
            const containerStatus = await this.getServiceStatus();
            checks.containerRunning = containerStatus.android?.state === 'running';
            
            if (!checks.containerRunning) {
                return { healthy: false, checks, issue: 'Container not running' };
            }
            
            // 2. Vérifier ADB
            try {
                const adbResult = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb devices`);
                checks.adbConnected = adbResult.stdout.includes('device');
            } catch (e) {
                checks.adbConnected = false;
            }
            
            // 3. Vérifier boot completed
            try {
                const bootResult = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb shell getprop sys.boot_completed`);
                checks.bootCompleted = bootResult.stdout.trim() === '1';
            } catch (e) {
                checks.bootCompleted = false;
            }
            
            // 4. Vérifier l'interface utilisateur
            try {
                const uiResult = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb shell dumpsys window | grep mCurrentFocus`);
                checks.uiReady = !uiResult.stdout.includes('null');
            } catch (e) {
                checks.uiReady = false;
            }
            
            // 5. Vérifier la mémoire
            try {
                const memResult = await this.execCommand(`${this.dockerComposeCmd} exec -T android adb shell cat /proc/meminfo | grep MemAvailable`);
                const availableMem = parseInt(memResult.stdout.match(/\d+/)?.[0] || '0');
                checks.memoryOk = availableMem > 500000; // Au moins 500MB disponible
            } catch (e) {
                checks.memoryOk = false;
            }
            
            const allHealthy = Object.values(checks).every(check => check === true);
            
            return {
                healthy: allHealthy,
                checks,
                issue: allHealthy ? null : 'Some health checks failed'
            };
            
        } catch (error) {
            return {
                healthy: false,
                checks: {},
                issue: error.message
            };
        }
    }

    async ensureEmulatorHealthyWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Attempt ${attempt}/${maxRetries} to ensure emulator health`);
            
            try {
                const healthCheck = await this.checkEmulatorHealth();
                
                if (healthCheck.healthy) {
                    console.log('✅ Emulator is healthy');
                    return true;
                }
                
                console.log(`❌ Emulator unhealthy: ${healthCheck.issue}`, healthCheck.checks);
                
                if (attempt < maxRetries) {
                    console.log('🔄 Attempting to recover emulator...');
                    await this.recoverEmulator();
                    await this.sleep(30000); // Attendre 30s avant le prochain essai
                }
                
            } catch (error) {
                console.error(`Health check attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    await this.sleep(15000); // Attendre 15s avant retry
                }
            }
        }
        
        throw new Error('Failed to ensure emulator health after all retries');
    }
    
    async recoverEmulator() {
        try {
            console.log('🚨 Starting emulator recovery process...');
            
            // 1. Redémarrer ADB
            await this.execCommand(`${this.dockerComposeCmd} exec -T android adb kill-server`);
            await this.sleep(2000);
            await this.execCommand(`${this.dockerComposeCmd} exec -T android adb start-server`);
            await this.sleep(5000);
            
            // 2. Vérifier si le conteneur répond
            const containerHealth = await this.isServiceHealthy('android');
            if (!containerHealth) {
                console.log('Container unhealthy, restarting...');
                await this.restartServices(['android']);
                await this.waitForServicesHealthy(180000); // 3 minutes
            }
            
            // 3. Nettoyer les processus zombies
            try {
                await this.execCommand(`${this.dockerComposeCmd} exec -T android pkill -f "qemu-system"`);
                await this.sleep(5000);
            } catch (e) {
                // Ignore si pas de processus à tuer
            }
            
            console.log('✅ Emulator recovery completed');
            
        } catch (error) {
            console.error('❌ Emulator recovery failed:', error.message);
            throw error;
        }
    }
}

module.exports = ContainerManager;
