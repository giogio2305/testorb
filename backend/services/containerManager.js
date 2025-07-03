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
}

module.exports = ContainerManager;