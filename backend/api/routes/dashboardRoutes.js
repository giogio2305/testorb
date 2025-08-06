const express = require('express');
const router = express.Router();
const Application = require('../../models/Application');
const TestResult = require('../../models/TestResult');
const mongoose = require('mongoose');

// GET /api/dashboard/stats - Statistiques globales du dashboard
router.get('/stats', async (req, res) => {
    try {
        // Compter les applications actives
        const totalApplications = await Application.countDocuments({ status: 'active' });
        
        // Statistiques des tests (derniers 30 jours)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const testStats = await TestResult.aggregate([
            { $match: { executedAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: null,
                    totalTests: { $sum: 1 },
                    passedTests: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
                    failedTests: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    avgDuration: { $avg: '$duration' }
                }
            }
        ]);
        
        // Tests récents (dernières 24h)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const recentTests = await TestResult.find({ 
            executedAt: { $gte: oneDayAgo } 
        })
        .sort({ executedAt: -1 })
        .limit(10)
        .populate('application', 'name packageName');
        
        const stats = testStats[0] || {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            avgDuration: 0
        };
        
        const successRate = stats.totalTests > 0 
            ? Math.round((stats.passedTests / stats.totalTests) * 100) 
            : 0;
        
        res.json({
            applications: totalApplications,
            tests: stats.totalTests,
            successRate,
            avgDuration: Math.round(stats.avgDuration || 0),
            recentTests: recentTests.map(test => ({
                id: test._id,
                testName: test.testName,
                status: test.status,
                duration: test.duration,
                executedAt: test.executedAt,
                application: test.application
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
});

// GET /api/dashboard/recent-activity - Activité récente
router.get('/recent-activity', async (req, res) => {
    try {
        const recentTests = await TestResult.find()
            .sort({ executedAt: -1 })
            .limit(20)
            .populate('application', 'name packageName platform');
            
        res.json(recentTests);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch recent activity', error: error.message });
    }
});

module.exports = router;