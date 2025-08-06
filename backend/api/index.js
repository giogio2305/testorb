
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
const testResultRoutes = require('./routes/testResultRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Static file serving
app.use('/uploads', express.static('uploads'));

// Protected routes
// app.use('/api/tests', authMiddleware, testRoutes); // ❌ ANCIEN
app.use('/api/applications', authMiddleware, testRoutes); // ✅ NOUVEAU
app.use('/api/applications', authMiddleware, applicationRoutes);
app.use('/api/applications', authMiddleware, testScriptRoutes);
app.use('/api/emulator', authMiddleware, emulatorRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/jobs', authMiddleware, jobStatusRoutes);
app.use('/api/containers', authMiddleware, containerRoutes);
app.use('/api/applications', authMiddleware, testResultRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

app.listen(3000, () => console.log('API listening on port 3000'));

// Auto-start the test worker alongside the API server
if (process.env.NODE_ENV !== 'worker-only') {
    // Start the test worker
    require('../worker/enhancedTestWorker');
    console.log('Enhanced test worker started alongside API server');
}
