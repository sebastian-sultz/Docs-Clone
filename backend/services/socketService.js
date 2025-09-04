// backend/services/socketService.js
const socketIO = require('socket.io');
const OperationalTransform = require('../utils/operationalTransform');
const Document = require('../models/Document');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-document', async (documentId, userId) => {
      socket.join(documentId);
      
      // Notify others that this user joined
      socket.to(documentId).emit('user-joined', {
        userId,
        socketId: socket.id
      });
      
      // Update user's cursor position in database
      try {
        await Document.findByIdAndUpdate(documentId, {
          $push: {
            collaborators: {
              user: userId,
              lastSeen: new Date()
            }
          }
        });
      } catch (error) {
        console.error('Error updating collaborators:', error);
      }
    });
    
    socket.on('text-operation', async (data) => {
      const { documentId, operation, version, userId } = data;
      
      try {
        const document = await Document.findById(documentId);
        
        // If the operation is based on an older version, transform it
        if (version < document.currentVersion) {
          const recentOperations = document.operations.filter(
            op => op.version > version
          );
          
          // Apply operational transform
          operation = OperationalTransform.transform(operation, recentOperations);
        }
        
        // Apply operation to document content
        // This would be implemented based on your specific operation format
        
        // Save the operation
        document.operations.push({
          ...operation,
          version: document.currentVersion + 1,
          author: userId
        });
        
        document.currentVersion += 1;
        await document.save();
        
        // Broadcast the transformed operation to other clients
        socket.to(documentId).emit('text-operation', {
          operation,
          version: document.currentVersion,
          userId
        });
      } catch (error) {
        console.error('Error processing operation:', error);
        socket.emit('operation-error', { message: 'Failed to process operation' });
      }
    });
    
    socket.on('cursor-position', (data) => {
      const { documentId, position, userId } = data;
      socket.to(documentId).emit('cursor-position', { userId, position });
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };