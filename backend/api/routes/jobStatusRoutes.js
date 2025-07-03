const express = require('express');
const router = express.Router();
const { testQueue } = require('../../queue/queue');

// GET /api/jobs/:jobId/status - Get job status
router.get('/:jobId/status', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await testQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }

        const jobState = await job.getState();
        const progress = job.progress || 0;
        const logs = job.logs || [];
        
        res.json({
            success: true,
            data: {
                id: job.id,
                state: jobState,
                progress: progress,
                data: job.data,
                logs: logs,
                createdAt: new Date(job.timestamp),
                processedAt: job.processedOn ? new Date(job.processedOn) : null,
                finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
                failedReason: job.failedReason || null,
                returnValue: job.returnvalue || null
            }
        });
    } catch (error) {
        console.error('Error fetching job status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch job status', 
            error: error.message 
        });
    }
});

// GET /api/jobs/application/:applicationId - Get all jobs for an application
router.get('/application/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        
        // Get jobs from the queue
        const jobs = await testQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 
            parseInt(offset), 
            parseInt(offset) + parseInt(limit) - 1
        );
        
        // Filter jobs by applicationId
        const filteredJobs = jobs.filter(job => job.data.applicationId === applicationId);
        
        const jobsWithStatus = await Promise.all(
            filteredJobs.map(async (job) => {
                const state = await job.getState();
                return {
                    id: job.id,
                    state: state,
                    progress: job.progress || 0,
                    data: job.data,
                    createdAt: new Date(job.timestamp),
                    processedAt: job.processedOn ? new Date(job.processedOn) : null,
                    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
                    failedReason: job.failedReason || null
                };
            })
        );
        
        res.json({
            success: true,
            data: jobsWithStatus,
            total: filteredJobs.length
        });
    } catch (error) {
        console.error('Error fetching application jobs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch application jobs', 
            error: error.message 
        });
    }
});

// DELETE /api/jobs/:jobId - Cancel/remove a job
router.delete('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await testQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }

        const state = await job.getState();
        
        if (state === 'active') {
            // If job is currently running, we can't easily cancel it
            // but we can mark it for cancellation
            await job.discard();
        } else if (state === 'waiting' || state === 'delayed') {
            // Remove waiting jobs
            await job.remove();
        }
        
        res.json({
            success: true,
            message: `Job ${jobId} has been cancelled/removed`
        });
    } catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to cancel job', 
            error: error.message 
        });
    }
});

module.exports = router;