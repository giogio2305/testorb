const express = require('express');
const { generateTestWithAI } = require('../controllers/aiController.js');

const router = express.Router();

// POST /api/ai/generate-test
router.post('/generate-test', generateTestWithAI);

module.exports = router;