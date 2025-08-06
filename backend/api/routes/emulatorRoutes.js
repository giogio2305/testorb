const express = require('express');
const { createOrchestrator, startEmulator } = require('../../orchestrator/orchestrator');
const router = express.Router();

router.post('/start/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const orchestrator = await createOrchestrator();
        const result = await orchestrator.startEmulator(applicationId);
        res.json({
            success: true,
            noVncUrl: result.vncUrl || result.noVncUrl || null,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.delete('/stop/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`Attempting to stop emulator for application: ${applicationId}`);
        
        const orchestrator = await createOrchestrator();
        const result = await orchestrator.stopEmulator(applicationId);
        
        console.log('Stop emulator result:', result);
        
        // Accepter success: false comme un résultat valide
        if (result.success !== undefined) {
            if (result.success) {
                res.json({ success: true, message: result.message });
            } else {
                // Retourner 200 même si le conteneur n'est pas trouvé
                res.json({ success: false, message: result.message, error: result.error });
            }
        } else {
            throw new Error('Invalid result from stopEmulator');
        }
    } catch (error) {
        console.error('Error in stop emulator route:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/install/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { package: packageName } = req.body;
        if (!packageName) {
            return res.status(400).json({ success: false, error: 'Missing package in request body.' });
        }
        const orchestrator = await createOrchestrator();
        const result = await orchestrator.installApp(applicationId, packageName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/status/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const orchestrator = await createOrchestrator();
        const status = await orchestrator.getEmulatorStatus(applicationId);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/is-installed/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const packageName = req.query.package;
        if (!packageName) {
            return res.status(400).json({ success: false, error: 'Missing package query parameter.' });
        }
        const orchestrator = await createOrchestrator();
        const installed = await orchestrator.isAppInstalled(applicationId, packageName);
        res.json({ success: true, installed });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;
