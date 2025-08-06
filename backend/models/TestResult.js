const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  testFile: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['passed', 'failed', 'skipped'],
    required: true
  },
  duration: {
    type: Number, // in milliseconds
    required: true
  },
  error: {
    message: String,
    stack: String
  },
  retries: {
    type: Number,
    default: 0
  },
  executedAt: {
    type: Date,
    default: Date.now
  },
  jobId: {
    type: String,
    required: true
  },
  screenshots: [{
    path: String,
    timestamp: Date
  }]
});

module.exports = mongoose.model('TestResult', TestResultSchema);