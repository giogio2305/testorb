const Docker = require('dockerode');
const { BaseOrchestrator } = require('../orchestrator');
const config = require('../../config/orchestrator.config');
const path = require('path'); // Ensure path is required at the top
const fs = require('fs'); // Using standard fs
const SmartContainerManager = require('../../services/smartContainerManager');

class LocalOrchestrator extends BaseOrchestrator {
    constructor() {
        super();
        this.docker = new Docker(config.local);
        this.containerManager = new SmartContainerManager();
    }

    async startEmulator(applicationId) {
        try {
            console.log('🚀 Starting emulator with smart container management...');
            
            // Utiliser le gestionnaire intelligent
            const result = await this.containerManager.smartStartServices(['android', 'appium', 'app']);
            
            console.log('📊 Smart start result:', {
                servicesStarted: result.servicesStarted,
                servicesRestarted: result.servicesRestarted,
                totalTime: `${result.totalTime}ms`
            });
            
            return {
                success: true,
                vncUrl: 'http://localhost:6080/?autoconnect=true',
                noVncUrl: 'http://localhost:6080/?autoconnect=true',
                appiumUrl: 'http://localhost:4723',
                message: result.message,
                optimizationStats: {
                    servicesStarted: result.servicesStarted,
                    servicesRestarted: result.servicesRestarted,
                    totalTime: result.totalTime
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to start emulator services:', error);
            return {
                success: false,
                message: 'Failed to start emulator services.',
                error: error.message
            };
        }
    }

    async startEmulator(applicationId) {
        const containerName = `android_${applicationId}`;
        const containers = await this.docker.listContainers({ all: true });
        
        let emulatorContainer = containers.find(c => 
            c.Names.some(name => 
                name.includes('android') || 
                name.includes('mobile-e2e-android-1') ||
                name.includes(containerName)
            )
        );
        
        let container;
        let isNewContainer = false; // Flag to track if a new container was created
        
        if (emulatorContainer) {
            console.log('Using existing android container:', emulatorContainer.Names[0]);
            container = this.docker.getContainer(emulatorContainer.Id);
            
            if (emulatorContainer.State !== 'running') {
                console.log('Starting existing android container...');
                await container.start();
            }
        } else {
            isNewContainer = true; // Set flag as new container is being created
            console.log('Creating new android container for application:', applicationId);
            try {
                const existingNamedContainer = this.docker.getContainer(containerName);
                await existingNamedContainer.inspect(); 
                console.log(`Removing existing stopped container: ${containerName}`);
                await existingNamedContainer.remove({ force: true });
            } catch (error) {
                console.log(`No existing container found with name ${containerName} to remove, or error inspecting it.`);
            }
            
            container = await this.docker.createContainer({
                Image: 'budtmo/docker-android:emulator_11.0',
                name: containerName,
                Env: [
                    'DEVICE=Samsung Galaxy S10',
                    'WEB_VNC=true',
                    'APPIUM=true'
                ],
                HostConfig: {
                    PortBindings: {
                        "6080/tcp": [{ HostPort: "" }],
                        "4723/tcp": [{ HostPort: "" }]
                    },
                    Privileged: true,
                    ShmSize: 4 * 1024 * 1024 * 1024
                }
            });
            await container.start();
            console.log('New container started.');
        }

        const hostPort = await this.waitForNoVnc(container);

        if (isNewContainer) { 
            const Application = require('../../models/Application');
            const app = await Application.findById(applicationId);
            let apkPathToInstall = null;
            let apkFileName = null;

            if (app && app.filePath) {
                console.log('[startEmulator] Application found in DB, filePath:', app.filePath);
                // const path = require('path'); // Moved to top
                // const fs = require('fs'); // Moved to top

                if (app.filePath.startsWith('backend/')) {
                    apkPathToInstall = path.resolve(__dirname, '../..', app.filePath.replace('backend/', ''));
                } else {
                    apkPathToInstall = path.resolve(__dirname, '../..', app.filePath);
                }
                console.log('[startEmulator] Resolved APK path for installation:', apkPathToInstall);

                if (fs.existsSync(apkPathToInstall)) {
                    apkFileName = path.basename(apkPathToInstall);
                    const uploadsDir = path.dirname(apkPathToInstall);
                    const remoteApkPath = `/tmp/${apkFileName}`;

                    console.log(`[startEmulator] APK to install on new container: ${apkFileName} from ${uploadsDir}`);
                    
                    const tar = require('tar-fs');
                    console.log(`[startEmulator] Creating tar stream for APK file: ${apkFileName}`);
                    const tarStream = tar.pack(uploadsDir, { entries: [apkFileName] });
                    console.log('[startEmulator] Copying APK to container /tmp directory...');
                    await container.putArchive(tarStream, { path: '/tmp' });
                    console.log('[startEmulator] APK copied to /tmp successfully');

                    console.log(`[startEmulator] Setting permissions for ${remoteApkPath} inside container...`);
                    const chmodExec = await container.exec({
                        Cmd: ['chmod', '777', remoteApkPath],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    await new Promise((resolve, reject) => {
                        chmodExec.start((err, stream) => {
                            if (err) return reject(err);
                            let chmodOutput = '';
                            stream.on('data', (chunk) => { chmodOutput += chunk.toString(); });
                            stream.on('end', () => {
                                console.log('[startEmulator] chmod output:', chmodOutput.trim());
                                resolve();
                            });
                            stream.on('error', reject);
                        });
                    });
                    console.log('[startEmulator] Permissions set for APK file.');

                    console.log(`[startEmulator] Attempting to install APK: ${remoteApkPath}`);
                    try {
                        const exec = await container.exec({
                            Cmd: ['adb', 'install', '-r', remoteApkPath],
                            AttachStdout: true,
                            AttachStderr: true
                        });
                        let adbOutput = '';
                        await new Promise((resolve, reject) => {
                            exec.start((err, stream) => {
                                if (err) return reject(err);
                                stream.on('data', chunk => { 
                                    const data = chunk.toString();
                                    console.log('[startEmulator] ADB output:', data.trim());
                                    adbOutput += data;
                                });
                                stream.on('end', () => {
                                    console.log('[startEmulator] ADB command completed');
                                    resolve();
                                });
                                stream.on('error', reject);
                            });
                        });
                        console.log('[startEmulator] Full ADB output:', adbOutput.trim());
                        if (adbOutput.includes('Success')) {
                            console.log('[startEmulator] APK installed successfully on new container.');
                        } else {
                            console.log('[startEmulator] APK installation failed on new container.');
                        }
                    } catch (err) {
                        console.log('[startEmulator] ADB installation error on new container:', err);
                    }
                } else {
                    console.log(`[startEmulator] APK file not found at ${apkPathToInstall}, skipping installation.`);
                }
            } else {
                console.log('[startEmulator] No application filePath found in DB or application not found, skipping APK installation.');
            }
        } else {
            console.log('[startEmulator] Existing container started, skipping APK installation.');
        }

        return {
            vncUrl: `http://localhost:${hostPort}/?autoconnect=true`,
            containerId: container.id,
            mode: 'local'
        };
    }

    async waitForNoVnc(container, timeoutMs = 60000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const data = await container.inspect();
            const ports = data.NetworkSettings.Ports['6080/tcp'];
            if (ports && ports[0] && ports[0].HostPort) {
                return ports[0].HostPort;
            }
            await new Promise(res => setTimeout(res, 1000));
        }
        throw new Error('noVNC port not available after waiting');
    }

    async startEmulator(applicationId) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            console.log('Checking current container status...');
            
            // Vérifier d'abord l'état des conteneurs (comme ensureServicesRunning)
            const allRunning = await this.areAllServicesRunning();
            
            if (allRunning) {
                console.log('All services are already running, checking health...');
                
                // Vérifier si les services sont en bonne santé
                const allHealthy = await this.areAllServicesHealthy();
                
                if (allHealthy) {
                    console.log('All services are already running and healthy!');
                    return {
                        success: true,
                        vncUrl: 'http://localhost:6080/?autoconnect=true',
                        noVncUrl: 'http://localhost:6080/?autoconnect=true',
                        appiumUrl: 'http://localhost:4723',
                        message: 'Services were already running and healthy'
                    };
                } else {
                    console.log('Services are running but not healthy, waiting for health...');
                    await this.waitForServicesHealthy();
                    return {
                        success: true,
                        vncUrl: 'http://localhost:6080/?autoconnect=true',
                        noVncUrl: 'http://localhost:6080/?autoconnect=true',
                        appiumUrl: 'http://localhost:4723',
                        message: 'Services were running, waited for health check'
                    };
                }
            } else {
                console.log('Not all services are running, starting missing services...');
                
                // Démarrer seulement les services manquants
                await execAsync('docker-compose up -d android appium app', {
                    cwd: require('path').resolve(__dirname, '../../../')
                });
                
                // Attendre que les services soient prêts
                console.log('Waiting for services to be healthy...');
                await this.waitForServicesHealthy();
                
                return {
                    success: true,
                    vncUrl: 'http://localhost:6080/?autoconnect=true',
                    noVncUrl: 'http://localhost:6080/?autoconnect=true',
                    appiumUrl: 'http://localhost:4723',
                    message: 'Services started successfully'
                };
            }
            
        } catch (error) {
            console.error('Failed to start emulator services:', error);
            return {
                success: false,
                message: 'Failed to start emulator services.',
                error: error.message
            };
        }
    }

    // Ajouter les méthodes de vérification d'état (inspirées de ContainerManager)
    async areAllServicesRunning() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            const { stdout } = await execAsync('docker-compose ps --format json', {
                cwd: require('path').resolve(__dirname, '../../../')
            });
            
            const services = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try { return JSON.parse(line); }
                    catch { return null; }
                })
                .filter(service => service !== null);
            
            const requiredServices = ['android', 'appium', 'app'];
            
            return requiredServices.every(serviceName => {
                const service = services.find(s => s.Service === serviceName);
                return service && service.State === 'running';
            });
        } catch (error) {
            console.error('Error checking service status:', error);
            return false;
        }
    }

    async areAllServicesHealthy() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            const { stdout } = await execAsync('docker-compose ps --format json', {
                cwd: require('path').resolve(__dirname, '../../../')
            });
            
            const services = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try { return JSON.parse(line); }
                    catch { return null; }
                })
                .filter(service => service !== null);
            
            const android = services.find(s => s.Service === 'android');
            const appium = services.find(s => s.Service === 'appium');
            const app = services.find(s => s.Service === 'app');
            
            // Android et Appium doivent être healthy, App doit juste être running
            const androidHealthy = android?.Health === 'healthy';
            const appiumHealthy = appium?.Health === 'healthy';
            const appRunning = app?.State === 'running';
            
            return androidHealthy && appiumHealthy && appRunning;
        } catch (error) {
            console.error('Error checking service health:', error);
            return false;
        }
    }

    // Méthode helper pour attendre que les services soient prêts
    async waitForServicesHealthy(timeoutMs = 120000) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const { stdout } = await execAsync('docker-compose ps --format json', {
                    cwd: require('path').resolve(__dirname, '../../../')
                });
                
                const services = stdout.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try { return JSON.parse(line); }
                        catch { return null; }
                    })
                    .filter(service => service !== null);
                
                const android = services.find(s => s.Service === 'android');
                const appium = services.find(s => s.Service === 'appium');
                
                if (android?.Health === 'healthy' && appium?.Health === 'healthy') {
                    console.log('All services are healthy!');
                    return true;
                }
                
                console.log('Waiting for services to be healthy...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                console.log('Health check error, retrying...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        throw new Error('Services failed to become healthy within timeout');
    }

    async stopEmulator(applicationId) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            console.log('Stopping Docker Compose services...');
            
            // Utiliser la même commande que ContainerManager.stopServices()
            const command = 'docker-compose stop android appium app';
            
            await execAsync(command, {
                cwd: require('path').resolve(__dirname, '../../../')
            });
            
            console.log('Docker Compose services stopped successfully');
            return { 
                success: true, 
                message: 'Emulator services stopped successfully.' 
            };
            
        } catch (error) {
            console.error('Failed to stop Docker Compose services:', error);
            return { 
                success: false, 
                message: 'Failed to stop emulator services.', 
                error: error.message 
            };
        }
    }

    async installApp(applicationId, packageName) { // packageName was apkPath in my previous suggestion, reverting to your original packageName
        const containerName = `android_${applicationId}`;
        const containers = await this.docker.listContainers({ all: true });
        let emulatorContainer = containers.find(c =>
            c.Names.some(name =>
                name.includes('android') ||
                name.includes('mobile-e2e-android-1') ||
                name.includes(containerName)
            )
        );
        if (!emulatorContainer) {
            return { success: false, message: 'Emulator container not found.' };
        }
        const container = this.docker.getContainer(emulatorContainer.Id);
        
        const Application = require('../../models/Application');
        const app = await Application.findById(applicationId);
        if (!app || !app.filePath) {
            return { success: false, message: 'Application or filePath not found in database.' };
        }
        
        console.log('[installApp] Application file path from DB:', app.filePath);
        
        // const fs = require('fs'); // Moved to top
        // const path = require('path'); // Moved to top
        
        let apkPathOnHost;
        if (app.filePath.startsWith('backend/')) {
            apkPathOnHost = path.resolve(__dirname, '../..', app.filePath.replace('backend/', ''));
        } else {
            apkPathOnHost = path.resolve(__dirname, '../..', app.filePath);
        }
        
        console.log('[installApp] Resolved APK path on host:', apkPathOnHost);
        
        if (!fs.existsSync(apkPathOnHost)) {
            console.log('[installApp] APK file does not exist at path:', apkPathOnHost);
            return { success: false, message: `APK file not found at path: ${apkPathOnHost}` };
        }
        
        const apkFile = path.basename(apkPathOnHost);
        const uploadsDir = path.dirname(apkPathOnHost);
        const remoteApkPath = `/tmp/${apkFile}`;
        
        console.log('[installApp] APK file name:', apkFile);
        console.log('[installApp] Uploads directory:', uploadsDir);

        // Removed whoami and ls commands for brevity, they were for debugging the /tmp issue
        
        const tar = require('tar-fs');
        console.log('[installApp] Creating tar stream for APK file...');
        const tarStream = tar.pack(uploadsDir, { entries: [apkFile] });
        console.log('[installApp] Copying APK to container /tmp directory...');
        await container.putArchive(tarStream, { path: '/tmp' });
        console.log('[installApp] APK copied to /tmp successfully');

        console.log(`[installApp] Setting permissions for ${remoteApkPath} inside container...`);
        const chmodExec = await container.exec({
            Cmd: ['chmod', '777', remoteApkPath],
            AttachStdout: true,
            AttachStderr: true
        });
        await new Promise((resolve, reject) => {
            chmodExec.start((err, stream) => {
                if (err) return reject(err);
                let chmodOutput = '';
                stream.on('data', (chunk) => { chmodOutput += chunk.toString(); });
                stream.on('end', () => {
                    console.log('[installApp] chmod output:', chmodOutput.trim());
                    resolve();
                });
                stream.on('error', reject);
            });
        });
        console.log('[installApp] Permissions set for APK file.');

        try {
            console.log('[installApp] Starting ADB install command...');
            const exec = await container.exec({
                Cmd: ['adb', 'install', '-r', remoteApkPath],
                AttachStdout: true,
                AttachStderr: true
            });
            let output = '';
            await new Promise((resolve, reject) => {
                exec.start((err, stream) => {
                    if (err) {
                        console.log('[installApp] Error starting exec:', err);
                        return reject(err);
                    }
                    stream.on('data', chunk => { 
                        const data = chunk.toString();
                        console.log('[installApp] ADB output:', data.trim());
                        output += data;
                    });
                    stream.on('end', () => {
                        console.log('[installApp] ADB command completed');
                        resolve();
                    });
                    stream.on('error', (err) => {
                        console.log('[installApp] Stream error:', err);
                        reject(err);
                    });
                });
            });
            console.log('[installApp] Full ADB output:', output.trim());

            if (output.includes('Success')) {
                return { success: true, message: 'App installed successfully.' };
            } else {
                return { success: false, message: 'App installation failed.', output };
            }
        } catch (err) {
            return { success: false, message: 'App installation error.', error: err.message };
        }
    }

    async isAppInstalled(applicationId, packageName) {
        const containerName = `android_${applicationId}`;
        const containers = await this.docker.listContainers({ all: true });
        let emulatorContainer = containers.find(c =>
            c.Names.some(name =>
                name.includes('android') ||
                name.includes('mobile-e2e-android-1') ||
                name.includes(containerName)
            )
        );
        if (!emulatorContainer) {
            console.log(`[isAppInstalled] Emulator container not found for applicationId: ${applicationId}`);
            return { installed: false, message: 'Emulator container not found.' };
        }
        const container = this.docker.getContainer(emulatorContainer.Id);
        try {
            const adbCmd = ['adb', 'shell', 'pm', 'list', 'packages', packageName];
            console.log(`[isAppInstalled] Running command: ${adbCmd.join(' ')}`);
            const exec = await container.exec({
                Cmd: adbCmd,
                AttachStdout: true,
                AttachStderr: true
            });
            const output = await new Promise((resolve, reject) => {
                exec.start((err, stream) => {
                    if (err) return reject(err);
                    let result = '';
                    stream.on('data', chunk => { result += chunk.toString(); });
                    stream.on('end', () => resolve(result));
                    stream.on('error', reject);
                });
            });
            console.log(`[isAppInstalled] ADB output:`, output);
            if (!output.trim()) {
                console.log(`[isAppInstalled] No output from ADB. App is NOT installed.`);
                return { installed: false, output };
            }
            const lines = output.split('\n').map(l => l.trim());
            const installed = lines.some(line => line === `package:${packageName}`);
            if (!installed) {
                console.log(`[isAppInstalled] Package ${packageName} not found in output. App is NOT installed.`);
            }
            return { installed, output };
        } catch (err) {
            console.log(`[isAppInstalled] Error:`, err);
            return { installed: false, error: err.message };
        }
    }
    async getEmulatorStatus(applicationId) {
        const containerName = `android_${applicationId}`;
        const containers = await this.docker.listContainers({ all: true });
        let emulatorContainer = containers.find(c =>
            c.Names.some(name =>
                name.includes('android') ||
                name.includes('mobile-e2e-android-1') ||
                name.includes(containerName)
            )
        );
        if (!emulatorContainer) {
            return { running: false, message: 'Emulator container not found.' };
        }
        return {
            running: emulatorContainer.State === 'running',
            status: emulatorContainer.State,
            containerId: emulatorContainer.Id,
            names: emulatorContainer.Names
        };
    }
}

module.exports = LocalOrchestrator;