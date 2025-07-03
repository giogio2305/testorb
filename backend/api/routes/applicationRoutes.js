const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Application = require('../../models/Application');
const { extractPackageName } = require('../../utils/fileUtils');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.apk' && ext !== '.ipa') {
      return cb(new Error('Only .apk and .ipa files are allowed'));
    }
    cb(null, true);
  }
});

// Create new application
router.post('/create', upload.single('file'), async (req, res) => {
  try {
    const { name, description, platform } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Application file is required' });
    }
    // Extract package name from APK
    const packageName = await extractPackageName(req.file.path);
    const application = new Application({
      name,
      description,
      platform,
      filePath: req.file.path,
      packageName // Save to model
    });
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all applications
router.get('/list', async (req, res) => {
  try {
    const applications = await Application.find({ status: 'active' });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single application by ID
router.get('/list/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(application);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;