const express = require('express');
const Document = require('../models/Document');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all documents for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
        { isPublic: true }
      ]
    }).populate('owner', 'username').populate('collaborators.user', 'username');
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single document
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
        { isPublic: true }
      ]
    }).populate('owner', 'username').populate('collaborators.user', 'username');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check if user has edit permissions
    const canEdit = document.owner._id.toString() === req.user._id.toString() || 
                   document.collaborators.some(c => 
                     c.user._id.toString() === req.user._id.toString() && c.role === 'editor'
                   );
    
    res.json({ ...document.toObject(), canEdit });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new document
router.post('/', authenticateToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { title, content, isPublic } = req.body;
    
    const document = new Document({
      title,
      content,
      owner: req.user._id,
      isPublic
    });
    
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content, title } = req.body;
    
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id, 'collaborators.role': 'editor' }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or insufficient permissions' });
    }
    
    // Save current version before updating if content changed
    if (content && content !== document.content) {
      document.versions.push({
        content: document.content,
        editedBy: req.user._id
      });
    }
    
    if (title) document.title = title;
    if (content) document.content = content;
    
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add collaborator
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or insufficient permissions' });
    }
    
    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(c => c.user.toString() === userId);
    if (existingCollaborator) {
      existingCollaborator.role = role;
    } else {
      document.collaborators.push({ user: userId, role });
    }
    
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or insufficient permissions' });
    }
    
    document.collaborators = document.collaborators.filter(
      c => c.user.toString() !== req.params.userId
    );
    
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or insufficient permissions' });
    }
    
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export document as PDF or Word
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const { format } = req.query;
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
        { isPublic: true }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (format === 'pdf') {
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${document.title}.pdf`);
      
      // In a real implementation, you would use a library like pdfkit or html-pdf
      // to convert the document content to PDF format
      // For now, we'll just send the text content
      res.send(document.content);
    } else if (format === 'word') {
      // Set headers for Word download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${document.title}.docx`);
      
      // In a real implementation, you would use a library to convert to Word format
      res.send(document.content);
    } else {
      res.status(400).json({ message: 'Unsupported format' });
    }
  } catch (error) {
    console.error('Error exporting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;