const express = require('express');
const router = express.Router();
const { testQueue } = require('../../queue/queue');
const Application = require('../../models/Application');
const Test = require('../../models/Test');
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
            return res
                .status(400)
                .json({ message: 'Application has no APK file path configured.' });
        }

        const apkFileName = path.basename(application.filePath);
        const appPackageName = application.packageName;

        const job = await testQueue.add('run-test', {
            applicationId,
            apkFileName,
            appPackageName,
        });

        res.status(202).json({
            message: 'All tests queued successfully.',
            apk: apkFileName,
            package: appPackageName,
            jobId: job.id,
        });
    } catch (error) {
        console.error('Error queueing test run:', error);
        res.status(500).json({ message: 'Failed to queue test run', error: error.message });
    }
});

// POST /api/applications/:applicationId/run-single-test (nouvelle route pour un seul test)
router.post('/:applicationId/run-single-test', async (req, res) => {
    const { applicationId } = req.params;
    const { testId } = req.body;

    try {
        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (!application.filePath) {
            return res
                .status(400)
                .json({ message: 'Application has no APK file path configured.' });
        }

        // Récupérer les informations du test spécifique
        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const apkFileName = path.basename(application.filePath);
        const appPackageName = application.packageName;
        const testFile = test.fileName || `${testId}-${test.name.replace(/\s+/g, '_')}.js`;

        const job = await testQueue.add('run-single-test', {
            applicationId,
            apkFileName,
            appPackageName,
            testFile,
            testId,
            testName: test.name,
        });

        res.status(202).json({
            message: 'Single test queued successfully.',
            apk: apkFileName,
            package: appPackageName,
            testFile,
            jobId: job.id,
        });
    } catch (error) {
        console.error('Error queueing single test run:', error);
        res.status(500).json({ message: 'Failed to queue single test run', error: error.message });
    }
});

module.exports = router;
