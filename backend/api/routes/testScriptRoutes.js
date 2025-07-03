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

module.exports = router;