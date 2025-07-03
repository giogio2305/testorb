
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const connectDB = require('../config/database');
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const emulatorRoutes = require('./routes/emulatorRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Add this line
const authMiddleware = require('./middleware/auth');
const testScriptRoutes = require('./routes/testScriptRoutes');
const jobStatusRoutes = require('./routes/jobStatusRoutes');
const containerRoutes = require('./routes/containerRoutes');

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Static file serving
app.use('/uploads', express.static('uploads'));

// Protected routes
app.use('/api/tests', authMiddleware, testRoutes);
app.use('/api/applications', authMiddleware, applicationRoutes);
app.use('/api/applications', authMiddleware, testScriptRoutes);
app.use('/api/emulator', authMiddleware, emulatorRoutes);
app.use('/api/ai', authMiddleware, aiRoutes); // Add this line
app.use('/api/jobs', authMiddleware, jobStatusRoutes);
app.use('/api/containers', authMiddleware, containerRoutes);

app.listen(3000, () => console.log('API listening on port 3000'));

// Auto-start the test worker alongside the API server
if (process.env.NODE_ENV !== 'worker-only') {
    // Start the test worker
    require('../worker/testWorker');
    console.log('Test worker started alongside API server');
}
