const express = require('express');
const SmartContainerManager = require('../../services/smartContainerManager');
const router = express.Router();

const containerManager = new SmartContainerManager();

/**
 * GET /api/containers/status
 * Get the current status of all Docker containers
 */
router.get('/status', async (req, res) => {
    try {
        const health = await containerManager.getContainerHealth();
        const allRunning = await containerManager.areAllServicesRunning();
        const allHealthy = await containerManager.areAllServicesHealthy();
        
        res.json({
            success: true,
            containers: health,
            summary: {
                allRunning,
                allHealthy,
                readyForTesting: allHealthy
            }
        });
    } catch (error) {
        console.error('Failed to get container status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get container status',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/start
 * Start all required Docker containers
 */
router.post('/start', async (req, res) => {
    try {
        const { services } = req.body;
        
        // If specific services are requested, validate them
        const validServices = ['android', 'appium', 'app'];
        const servicesToStart = services ? 
            services.filter(s => validServices.includes(s)) : 
            null;
        
        await containerManager.startServices(servicesToStart);
        
        // Wait for services to be healthy
        await containerManager.waitForServicesHealthy();
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: 'Containers started successfully',
            containers: health
        });
    } catch (error) {
        console.error('Failed to start containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start containers',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/stop
 * Stop Docker containers
 */
router.post('/stop', async (req, res) => {
    try {
        const { services } = req.body;
        
        // If specific services are requested, validate them
        const validServices = ['android', 'appium', 'app'];
        const servicesToStop = services ? 
            services.filter(s => validServices.includes(s)) : 
            null;
        
        await containerManager.stopServices(servicesToStop);
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: 'Containers stopped successfully',
            containers: health
        });
    } catch (error) {
        console.error('Failed to stop containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop containers',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/restart
 * Restart Docker containers
 */
router.post('/restart', async (req, res) => {
    try {
        const { services } = req.body;
        
        // If specific services are requested, validate them
        const validServices = ['android', 'appium', 'app'];
        const servicesToRestart = services ? 
            services.filter(s => validServices.includes(s)) : 
            null;
        
        await containerManager.restartServices(servicesToRestart);
        
        // Wait for services to be healthy after restart
        await containerManager.waitForServicesHealthy();
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: 'Containers restarted successfully',
            containers: health
        });
    } catch (error) {
        console.error('Failed to restart containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart containers',
            message: error.message
        });
    }
});

/**
 * GET /api/containers/:service/logs
 * Get logs for a specific container service
 */
router.get('/:service/logs', async (req, res) => {
    try {
        const { service } = req.params;
        const { lines = 50 } = req.query;
        
        const validServices = ['android', 'appium', 'app'];
        if (!validServices.includes(service)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid service name',
                validServices
            });
        }
        
        const logs = await containerManager.getServiceLogs(service, parseInt(lines));
        
        res.json({
            success: true,
            service,
            logs
        });
    } catch (error) {
        console.error(`Failed to get logs for ${req.params.service}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get container logs',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/ensure-ready
 * Ensure all containers are running and healthy for testing
 */
router.post('/ensure-ready', async (req, res) => {
    try {
        await containerManager.ensureServicesRunning();
        
        const health = await containerManager.getContainerHealth();
        const allHealthy = await containerManager.areAllServicesHealthy();
        
        res.json({
            success: true,
            message: 'All containers are ready for testing',
            containers: health,
            readyForTesting: allHealthy
        });
    } catch (error) {
        console.error('Failed to ensure containers are ready:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to ensure containers are ready',
            message: error.message
        });
    }
});

/**
 * GET /api/containers/health
 * Quick health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const allHealthy = await containerManager.areAllServicesHealthy();
        const allRunning = await containerManager.areAllServicesRunning();
        
        res.json({
            success: true,
            healthy: allHealthy,
            running: allRunning,
            readyForTesting: allHealthy,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            healthy: false,
            running: false,
            readyForTesting: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/containers/emulator-health
 * Detailed emulator health check
 */
router.get('/emulator-health', async (req, res) => {
    try {
        const healthCheck = await containerManager.checkEmulatorHealth();
        
        res.json({
            success: true,
            ...healthCheck,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Emulator health check failed:', error);
        res.status(500).json({
            success: false,
            healthy: false,
            issue: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/containers/recover-emulator
 * Attempt to recover unhealthy emulator
 */
router.post('/recover-emulator', async (req, res) => {
    try {
        await containerManager.ensureEmulatorHealthyWithRetry();
        
        res.json({
            success: true,
            message: 'Emulator recovery completed successfully'
        });
    } catch (error) {
        console.error('Emulator recovery failed:', error);
        res.status(500).json({
            success: false,
            error: 'Emulator recovery failed',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/smart-start
 * Démarrage intelligent des conteneurs - évite les redémarrages inutiles
 */
router.post('/smart-start', async (req, res) => {
    try {
        const { services } = req.body;
        
        // Validation des services
        const validServices = ['android', 'appium', 'app'];
        const servicesToStart = services ? 
            services.filter(s => validServices.includes(s)) : 
            validServices;
        
        const result = await containerManager.smartStartServices(servicesToStart);
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: result.message,
            containers: health,
            optimizationStats: {
                servicesStarted: result.servicesStarted,
                servicesRestarted: result.servicesRestarted,
                totalTime: result.totalTime,
                timesSaved: result.servicesStarted.length === 0 && result.servicesRestarted.length === 0
            }
        });
    } catch (error) {
        console.error('Failed to smart-start containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to smart-start containers',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/start
 * Version améliorée du démarrage standard
 */
router.post('/start', async (req, res) => {
    try {
        const { services, force = false } = req.body;
        
        const validServices = ['android', 'appium', 'app'];
        const servicesToStart = services ? 
            services.filter(s => validServices.includes(s)) : 
            validServices;
        
        let result;
        if (force) {
            // Mode force : redémarrage complet
            await containerManager.stopServices(servicesToStart);
            await containerManager.startServices(servicesToStart);
            await containerManager.waitForServicesHealthy();
            result = { message: 'Containers force-started successfully' };
        } else {
            // Mode intelligent par défaut
            result = await containerManager.smartStartServices(servicesToStart);
        }
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: result.message || 'Containers started successfully',
            containers: health,
            mode: force ? 'force' : 'smart'
        });
    } catch (error) {
        console.error('Failed to start containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start containers',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/stop
 * Stop Docker containers
 */
router.post('/stop', async (req, res) => {
    try {
        const { services } = req.body;
        
        // If specific services are requested, validate them
        const validServices = ['android', 'appium', 'app'];
        const servicesToStop = services ? 
            services.filter(s => validServices.includes(s)) : 
            null;
        
        await containerManager.stopServices(servicesToStop);
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: 'Containers stopped successfully',
            containers: health
        });
    } catch (error) {
        console.error('Failed to stop containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop containers',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/restart
 * Restart Docker containers
 */
router.post('/restart', async (req, res) => {
    try {
        const { services } = req.body;
        
        // If specific services are requested, validate them
        const validServices = ['android', 'appium', 'app'];
        const servicesToRestart = services ? 
            services.filter(s => validServices.includes(s)) : 
            null;
        
        await containerManager.restartServices(servicesToRestart);
        
        // Wait for services to be healthy after restart
        await containerManager.waitForServicesHealthy();
        
        const health = await containerManager.getContainerHealth();
        
        res.json({
            success: true,
            message: 'Containers restarted successfully',
            containers: health
        });
    } catch (error) {
        console.error('Failed to restart containers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart containers',
            message: error.message
        });
    }
});

/**
 * GET /api/containers/:service/logs
 * Get logs for a specific container service
 */
router.get('/:service/logs', async (req, res) => {
    try {
        const { service } = req.params;
        const { lines = 50 } = req.query;
        
        const validServices = ['android', 'appium', 'app'];
        if (!validServices.includes(service)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid service name',
                validServices
            });
        }
        
        const logs = await containerManager.getServiceLogs(service, parseInt(lines));
        
        res.json({
            success: true,
            service,
            logs
        });
    } catch (error) {
        console.error(`Failed to get logs for ${req.params.service}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get container logs',
            message: error.message
        });
    }
});

/**
 * POST /api/containers/ensure-ready
 * Ensure all containers are running and healthy for testing
 */
router.post('/ensure-ready', async (req, res) => {
    try {
        await containerManager.ensureServicesRunning();
        
        const health = await containerManager.getContainerHealth();
        const allHealthy = await containerManager.areAllServicesHealthy();
        
        res.json({
            success: true,
            message: 'All containers are ready for testing',
            containers: health,
            readyForTesting: allHealthy
        });
    } catch (error) {
        console.error('Failed to ensure containers are ready:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to ensure containers are ready',
            message: error.message
        });
    }
});

/**
 * GET /api/containers/health
 * Quick health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const allHealthy = await containerManager.areAllServicesHealthy();
        const allRunning = await containerManager.areAllServicesRunning();
        
        res.json({
            success: true,
            healthy: allHealthy,
            running: allRunning,
            readyForTesting: allHealthy,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            healthy: false,
            running: false,
            readyForTesting: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/containers/emulator-health
 * Detailed emulator health check
 */
router.get('/emulator-health', async (req, res) => {
    try {
        const healthCheck = await containerManager.checkEmulatorHealth();
        
        res.json({
            success: true,
            ...healthCheck,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Emulator health check failed:', error);
        res.status(500).json({
            success: false,
            healthy: false,
            issue: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/containers/recover-emulator
 * Attempt to recover unhealthy emulator
 */
router.post('/recover-emulator', async (req, res) => {
    try {
        await containerManager.ensureEmulatorHealthyWithRetry();
        
        res.json({
            success: true,
            message: 'Emulator recovery completed successfully'
        });
    } catch (error) {
        console.error('Emulator recovery failed:', error);
        res.status(500).json({
            success: false,
            error: 'Emulator recovery failed',
            message: error.message
        });
    }
});

module.exports = router;