const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Test = require('../../models/Test');
const Application = require('../../models/Application');

// Storage for test scripts
const testScriptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { applicationId } = req.params;
    const dir = path.join(__dirname, '../../tests/specs', applicationId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: testScriptStorage });

// GET /api/applications/:applicationId/tests - List test scripts
router.get('/:applicationId/tests', async (req, res) => {
  try {
    const tests = await Test.find({ application: req.params.applicationId });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tests', error: error.message });
  }
});

// POST /api/applications/:applicationId/tests - Upload a test script
router.post('/:applicationId/tests', upload.single('testScript'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const test = new Test({
      application: req.params.applicationId,
      fileName: req.file.filename,
      filePath: req.file.path
    });
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload test', error: error.message });
  }
});

// DELETE /api/applications/:applicationId/tests/:testId - Delete a test script
router.delete('/:applicationId/tests/:testId', async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    fs.unlinkSync(test.filePath);
    await test.remove();
    res.json({ message: 'Test deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete test', error: error.message });
  }
});

// POST /api/applications/:applicationId/tests/text - Save a text-based test script
router.post('/:applicationId/tests/text', async (req, res) => {
  try {
    const { testName, scriptContent, type = 'text' } = req.body;
    
    if (!testName || !scriptContent) {
      return res.status(400).json({ message: 'Test name and script content are required' });
    }

    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Save script content to file system for execution
    const testDir = path.join(__dirname, '../../tests/specs', req.params.applicationId);
    fs.mkdirSync(testDir, { recursive: true });
    
    const fileName = `${Date.now()}-${testName.replace(/[^a-zA-Z0-9]/g, '_')}.js`;
    const filePath = path.join(testDir, fileName);
    
    fs.writeFileSync(filePath, scriptContent, 'utf8');

    const test = new Test({
      application: req.params.applicationId,
      name: testName,
      fileName: fileName,
      filePath: filePath,
      scriptContent: scriptContent,
      type: type
    });
    
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Failed to save test', error: error.message });
  }
});

// PUT /api/applications/:applicationId/tests/:testId - Update a test script
router.put('/:applicationId/tests/:testId', async (req, res) => {
  try {
    const { testName, scriptContent, type } = req.body;
    
    if (!testName || !scriptContent) {
      return res.status(400).json({ message: 'Test name and script content are required' });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Update the file content
    fs.writeFileSync(test.filePath, scriptContent, 'utf8');

    // Update the test in database
    test.name = testName;
    test.scriptContent = scriptContent;
    if (type) test.type = type;
    test.updatedAt = new Date();
    
    await test.save();
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update test', error: error.message });
  }
});

module.exports = router;