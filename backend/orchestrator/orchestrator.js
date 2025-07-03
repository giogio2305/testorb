
// Import dependencies using CommonJS syntax
const Docker = require('dockerode');
const config = require('../config/orchestrator.config');

// Define the base orchestrator class
class BaseOrchestrator {
    async startEmulator(applicationId) {
        throw new Error('Method must be implemented by subclass');
    }
    async stopEmulator(applicationId) {
        throw new Error('Method must be implemented by subclass');
    }
    async getEmulatorStatus(applicationId) {
        throw new Error('Method must be implemented by subclass');
    }
    async installApp(applicationId, packageName) {
        throw new Error('Method must be implemented by subclass');
    }
}

// Factory class to create the appropriate orchestrator
class OrchestratorFactory {
    static async create() {
        // Use require here to avoid ESM cycles
        const LocalOrchestrator = require('./providers/LocalOrchestrator');
        const RemoteOrchestrator = require('./providers/RemoteOrchestrator');
        switch (config.mode) {
            case 'local':
                return new LocalOrchestrator();
            case 'remote':
                return new RemoteOrchestrator();
            default:
                throw new Error(`Unsupported orchestrator mode: ${config.mode}`);
        }
    }
}

// Create Docker instance
const docker = new Docker();

// Helper function for waiting for service to be healthy
async function waitForServiceHealthy(serviceName, timeoutMs = 60000) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const { stdout } = await execAsync('docker-compose ps --format json', {
                cwd: require('path').resolve(__dirname, '../../')
            });
            
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

            const service = services.find(s => s.Service === serviceName);
            if (service && service.Health === 'healthy') {
                console.log(`Service ${serviceName} is healthy`);
                return;
            }
            
            console.log(`Waiting for ${serviceName} to be healthy... Current status: ${service?.Health || 'unknown'}`);
            await new Promise(res => setTimeout(res, 5000));
            
        } catch (error) {
            console.log(`Health check error for ${serviceName}:`, error.message);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    throw new Error(`Service ${serviceName} failed to become healthy within ${timeoutMs}ms`);
}

// Emulator starter function using docker-compose
async function startEmulator(applicationId) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
        // Check if containers are already running
        const { stdout: psOutput } = await execAsync('docker-compose ps --format json', {
            cwd: require('path').resolve(__dirname, '../../')
        });
        
        const services = psOutput.split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(service => service !== null);

        const androidService = services.find(s => s.Service === 'android');
        const appiumService = services.find(s => s.Service === 'appium');
        
        // Start Android emulator if not running
        if (!androidService || androidService.State !== 'running') {
            console.log('Starting Android emulator via docker-compose...');
            await execAsync('docker-compose up -d android', {
                cwd: require('path').resolve(__dirname, '../../')
            });
            
            // Wait for Android to be healthy
            console.log('Waiting for Android emulator to be healthy...');
            await waitForServiceHealthy('android', 120000);
        }
        
        // Start Appium if not running
        if (!appiumService || appiumService.State !== 'running') {
            console.log('Starting Appium server via docker-compose...');
            await execAsync('docker-compose up -d appium', {
                cwd: require('path').resolve(__dirname, '../../')
            });
            
            // Wait for Appium to be healthy
            console.log('Waiting for Appium server to be healthy...');
            await waitForServiceHealthy('appium', 60000);
        }
        
        // Return the VNC URL
        return {
            vncUrl: 'http://localhost:6080/?autoconnect=true',
            noVncUrl: 'http://localhost:6080/?autoconnect=true',
            appiumUrl: 'http://localhost:4724'
        };
        
    } catch (error) {
        console.error('Failed to start emulator:', error);
        throw new Error(`Failed to start emulator: ${error.message}`);
    }
}

// Helper function to create an orchestrator
async function createOrchestrator() {
    return await OrchestratorFactory.create();
}

// Stop emulator function using docker-compose
async function stopEmulator(applicationId) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
        console.log('Stopping emulator and related services via docker-compose...');
        
        // Stop all services (android, appium, and any test runners)
        await execAsync('docker-compose down', {
            cwd: require('path').resolve(__dirname, '../../')
        });
        
        return { 
            success: true, 
            message: 'Emulator and related services stopped successfully.' 
        };
        
    } catch (error) {
        console.error('Failed to stop emulator:', error);
        return { 
            success: false, 
            message: 'Failed to stop emulator services.', 
            error: error.message 
        };
    }
}

async function installApp(applicationId, packageName) {
    const orchestrator = await createOrchestrator();
    const result = await orchestrator.isAppInstalled(applicationId, packageName);
    return result;
}


// Export all symbols in a single object to avoid overwriting
module.exports = {
    BaseOrchestrator,
    OrchestratorFactory,
    startEmulator,
    stopEmulator,
    createOrchestrator,
    installApp
};



