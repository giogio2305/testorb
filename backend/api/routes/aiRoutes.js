const express = require('express');
const { generateTestWithAI, modifyTestWithAI } = require('../controllers/aiController.js');

const router = express.Router();

// POST /api/ai/generate-test
router.post('/generate-test', generateTestWithAI);

// POST /api/ai/modify-text
router.post('/modify-test', modifyTestWithAI);

module.exports = router;
