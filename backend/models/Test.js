const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: function() { return this.type === 'file'; }
  },
  filePath: {
    type: String,
    required: function() { return this.type === 'file'; }
  },
  scriptContent: {
    type: String,
    required: function() { return this.type === 'text'; }
  },
  type: {
    type: String,
    enum: ['file', 'text', 'ai-generated'],
    required: true,
    default: 'file'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Test', TestSchema);