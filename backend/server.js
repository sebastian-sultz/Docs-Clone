const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
require('dotenv').config();

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
    
    // Send current active users to everyone in the document
    io.to(documentId).emit('users-update', Array.from(activeDocuments.get(documentId).values()));
    
    socket.to(documentId).emit('user-joined', { userId, username });
  });
  
// Modify the text-change event handler
socket.on('text-change', (data) => {
  // Store the operation with timestamp for conflict resolution
  const operation = {
    ...data,
    timestamp: Date.now(),
    socketId: socket.id
  };
  
  // Broadcast to other users in the same document
  socket.to(data.documentId).emit('text-change', operation);
  
  // Basic conflict resolution - store the latest change
  if (activeDocuments.has(data.documentId)) {
    const docData = activeDocuments.get(data.documentId);
    docData.lastOperation = operation;
    activeDocuments.set(data.documentId, docData);
  }
});
  
  socket.on('chat-message', (data) => {
    io.to(data.documentId).emit('chat-message', data);
  });
  
  socket.on('cursor-position', (data) => {
    socket.to(data.documentId).emit('cursor-position', data);
  });
  
  socket.on('disconnect', () => {
    // Remove user from active documents
    for (const [documentId, users] of activeDocuments.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(documentId).emit('users-update', Array.from(users.values()));
        
        // Clean up empty documents
        if (users.size === 0) {
          activeDocuments.delete(documentId);
        }
        break;
      }
    }
    
    console.log('User disconnected:', socket.id);
  });
});









const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));