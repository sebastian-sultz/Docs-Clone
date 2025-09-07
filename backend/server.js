const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
require('dotenv').config();

// Add at the top of server.js
const Document = require('./models/Document');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collab-tool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Store active users in each document
const activeDocuments = new Map();
const documentStates = new Map();

// Socket.io for real-time collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-document', async (data) => {
    const { documentId, userId, username } = data;
    socket.join(documentId);
    
    // Add user to active documents
    if (!activeDocuments.has(documentId)) {
      activeDocuments.set(documentId, new Map());
    }
    activeDocuments.get(documentId).set(socket.id, { userId, username });
    
    // Initialize document state if not exists
    if (!documentStates.has(documentId)) {
      // Try to get document from database
      try {
        const Document = require('./models/Document');
        const doc = await Document.findById(documentId);
        if (doc) {
          documentStates.set(documentId, {
            content: doc.content,
            version: 0,
            lastUpdated: Date.now()
          });
        } else {
          documentStates.set(documentId, {
            content: '',
            version: 0,
            lastUpdated: Date.now()
          });
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        documentStates.set(documentId, {
          content: '',
          version: 0,
          lastUpdated: Date.now()
        });
      }
    }
    
    // Send current document state to the new user
    const docState = documentStates.get(documentId);
    socket.emit('document-state', {
      content: docState.content,
      version: docState.version
    });
    
    // Send current active users to everyone in the document
    io.to(documentId).emit('users-update', Array.from(activeDocuments.get(documentId).values()));
    
    socket.to(documentId).emit('user-joined', { userId, username, socketId: socket.id });
  });
  
  socket.on('text-change', async (data) => {
    const { documentId, content, userId } = data;
    
    // Get current document state
    const docState = documentStates.get(documentId) || {
      content: '',
      version: 0,
      lastUpdated: Date.now()
    };
    
    // Update document state
    docState.content = content;
    docState.version += 1;
    docState.lastUpdated = Date.now();
    documentStates.set(documentId, docState);
    
    // Broadcast to other users in the same document
    socket.to(documentId).emit('text-change', {
      content,
      userId,
      version: docState.version
    });
    
    // Update database periodically (not on every change)
    if (Date.now() - docState.lastUpdated > 5000) { // Save every 5 seconds
      try {
        const Document = require('./models/Document');
        const document = await Document.findById(documentId);
        if (document) {
          document.content = content;
          document.versions.push({
            content: document.content,
            editedBy: userId,
            timestamp: new Date()
          });
          await document.save();
        }
      } catch (error) {
        console.error('Error saving document:', error);
      }
    }
  });
  
  socket.on('cursor-position', (data) => {
    socket.to(data.documentId).emit('cursor-position', data);
  });
  
  socket.on('chat-message', (data) => {
    io.to(data.documentId).emit('chat-message', data);
  });
  
  socket.on('disconnect', () => {
    // Remove user from active documents
    for (const [documentId, users] of activeDocuments.entries()) {
      if (users.has(socket.id)) {
        const userData = users.get(socket.id);
        users.delete(socket.id);
        
        // Notify others that this user left
        io.to(documentId).emit('user-left', userData);
        io.to(documentId).emit('users-update', Array.from(users.values()));
        
        // Clean up empty documents
        if (users.size === 0) {
          activeDocuments.delete(documentId);
          
          // Save final document state to database
          const docState = documentStates.get(documentId);
          if (docState) {
            const Document = require('./models/Document');
            Document.findByIdAndUpdate(documentId, {
              content: docState.content,
              $push: {
                versions: {
                  content: docState.content,
                  editedBy: userData.userId,
                  timestamp: new Date()
                }
              }
            }).catch(err => console.error('Error saving document on disconnect:', err));
            
            documentStates.delete(documentId);
          }
        }
        break;
      }
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));