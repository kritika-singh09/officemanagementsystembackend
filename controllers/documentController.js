const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

exports.getDocumentsByUser = async (req, res) => {
  try {
    const documents = await Document.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { userId, name, type } = req.body;
    const fileUrl = req.file.location || `/uploads/documents/${req.file.filename}`;

    const newDoc = new Document({
      user: userId,
      name,
      type,
      fileUrl
    });

    const savedDoc = await newDoc.save();
    res.status(201).json(savedDoc);
  } catch (error) {
    res.status(400).json({ message: 'Error saving document', error: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Attempt to delete physical file
    if (document.fileUrl && !document.fileUrl.startsWith('http')) {
      const filePath = path.join(__dirname, '..', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};
