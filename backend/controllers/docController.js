const Document = require('../models/Document');
const Version = require('../models/Version');

exports.createDoc = async (req, res) => {
  const { title } = req.body;
  try {
    const doc = new Document({ title, owner: req.user.id, content: { ops: [] } });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};

exports.getDocs = async (req, res) => {
  try {
    const docs = await Document.find({ $or: [{ owner: req.user.id }, { 'collaborators.user': req.user.id }] });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};

exports.updateDoc = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    // Check role: Viewer can't update
    if (req.user.role === 'Viewer') return res.status(403).json({ msg: 'Access denied' });
    doc.content = content;
    await doc.save();
    // Auto-version
    const version = new Version({ document: id, content });
    await version.save();
    doc.versions.push(version._id);
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};

exports.deleteDoc = async (req, res) => {
  const { id } = req.params;
  try {
    await Document.findByIdAndDelete(id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};

exports.restoreVersion = async (req, res) => {
  const { docId, versionId } = req.params;
  try {
    const version = await Version.findById(versionId);
    if (!version) return res.status(404).json({ msg: 'Version not found' });
    const doc = await Document.findById(docId);
    doc.content = version.content;
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};

// Add collaborator (Admin only)
exports.addCollaborator = async (req, res) => {
  const { docId } = req.params;
  const { userId, role } = req.body;
  try {
    const doc = await Document.findById(docId);
    doc.collaborators.push({ user: userId, role });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
};