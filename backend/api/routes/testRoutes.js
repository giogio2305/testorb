
const express = require('express');
const router = express.Router();
const { testQueue } = require('../../queue/queue'); // Assuming your queue setup is here
const Application = require('../../models/Application');
const path = require('path');

// POST /api/applications/:applicationId/run-tests
router.post('/:applicationId/run-tests', async (req, res) => {
    const { applicationId } = req.params;

    try {
        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (!application.filePath) {
            return res.status(400).json({ message: 'Application has no APK file path configured.' });
        }

        const apkFileName = path.basename(application.filePath);
        const appPackageName = application.packageName; // Get package name from application model

        const job = await testQueue.add('run-test', {
            applicationId,
            apkFileName,
            appPackageName 
        });

        res.status(202).json({ message: 'Test run queued successfully.', apk: apkFileName, package: appPackageName, jobId: job.id });
    } catch (error) {
        console.error('Error queueing test run:', error);
        res.status(500).json({ message: 'Failed to queue test run', error: error.message });
    }
});

module.exports = router;
