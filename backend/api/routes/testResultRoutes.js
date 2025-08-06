const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestResult = require('../../models/TestResult');

// GET /api/applications/:applicationId/test-results
router.get('/:applicationId/test-results', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        
        const results = await TestResult.find({ application: applicationId })
            .sort({ executedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('application', 'name');
            
        const total = await TestResult.countDocuments({ application: applicationId });
        
        res.json({
            results,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch test results', error: error.message });
    }
});

// GET /api/applications/:applicationId/test-metrics
router.get('/:applicationId/test-metrics', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const metrics = await TestResult.aggregate([
            { $match: { application: new mongoose.Types.ObjectId(applicationId) } },
            {
                $group: {
                    _id: null,
                    totalTests: { $sum: 1 },
                    passedTests: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
                    failedTests: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    avgDuration: { $avg: '$duration' },
                    totalDuration: { $sum: '$duration' }
                }
            }
        ]);
        
        const result = metrics[0] || {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            avgDuration: 0,
            totalDuration: 0
        };
        
        result.successRate = result.totalTests > 0 ? (result.passedTests / result.totalTests * 100).toFixed(2) : 0;
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch test metrics', error: error.message });
    }
});

module.exports = router;