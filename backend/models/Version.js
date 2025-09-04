const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  content: { type: Object, required: true }, // Delta JSON
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Version', versionSchema);