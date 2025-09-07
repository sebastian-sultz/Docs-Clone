const express = require('express');
const Document = require('../models/Document');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Function to check document access
const checkDocumentAccess = async (documentId, userId) => {
  const document = await Document.findById(documentId)
    .populate('owner', 'id username')
    .populate('collaborators.user', 'id username');

  if (!document) return { hasAccess: false, canEdit: false };

  // Convert both IDs to string for proper comparison
  const isOwner = document.owner._id.toString() === userId.toString();
  const isEditor = document.collaborators.some(
    c => c.user._id.toString() === userId.toString() && c.role === 'editor'
  );
  const isPublic = document.isPublic;

  return {
    hasAccess: isOwner || isEditor || isPublic,
    canEdit: isOwner || isEditor,
    document
  };
};

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
    const { hasAccess, canEdit, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!hasAccess) return res.status(404).json({ message: 'Document not found' });

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
    // Populate the owner before sending response
    await document.populate('owner', 'username');
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
    const { hasAccess, canEdit, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!hasAccess || !canEdit) {
      return res.status(404).json({ message: 'Document not found or insufficient permissions' });
    }

    if (content && content !== document.content) {
      document.versions.push({
        content: document.content,
        editedBy: req.user._id,
        timestamp: new Date()
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
    const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });

    if (!document) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    const existingCollaborator = document.collaborators.find(c => c.user.toString() === userId);
    if (existingCollaborator) existingCollaborator.role = role;
    else document.collaborators.push({ user: userId, role });

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
    const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });
    if (!document) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    document.collaborators = document.collaborators.filter(c => c.user.toString() !== req.params.userId);
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
    const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });
    if (!document) return res.status(404).json({ message: 'Document not found or insufficient permissions' });

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export document as PDF or Word
// Fix the export route
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const { format } = req.query;
    const { hasAccess, document } = await checkDocumentAccess(req.params.id, req.user._id);

    if (!hasAccess) return res.status(404).json({ message: 'Document not found' });

    if (format === 'pdf') {
      // Implement proper PDF generation here
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${document.title}.pdf`);
      // You should use a proper PDF generation library here
      res.send(document.content);
    } else if (format === 'word') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${document.title}.docx`);
      // You should use a proper DOCX generation library here
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
