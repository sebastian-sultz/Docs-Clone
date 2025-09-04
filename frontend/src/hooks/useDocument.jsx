// frontend/src/hooks/useDocument.js
import { useState, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export const useDocument = (documentId) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const socket = useSocket();
  const pendingOperations = useRef([]);

  const applyOperation = useCallback((operation) => {
    // Apply the operation to the local content
    // This would be implemented based on your operation format
    setContent(prevContent => {
      // Apply the operation to prevContent
      return transformedContent;
    });
  }, []);

  const sendOperation = useCallback((operation) => {
    if (!socket) return;
    
    // Add to pending operations while waiting for server acknowledgement
    pendingOperations.current.push(operation);
    
    socket.emit('text-operation', {
      documentId,
      operation,
      version,
      userId: localStorage.getItem('userId')
    });
  }, [socket, documentId, version]);

  // Handle incoming operations from server
  useEffect(() => {
    if (!socket) return;

    const handleIncomingOperation = (data) => {
      const { operation, version: newVersion, userId } = data;
      
      // If this is our own operation, remove it from pending
      if (userId === localStorage.getItem('userId')) {
        pendingOperations.current = pendingOperations.current.filter(
          op => !isEqual(op, operation)
        );
      } else {
        // Apply the transformed operation
        applyOperation(operation);
      }
      
      setVersion(newVersion);
    };

    socket.on('text-operation', handleIncomingOperation);
    
    return () => {
      socket.off('text-operation', handleIncomingOperation);
    };
  }, [socket, applyOperation]);

  return {
    content,
    title,
    collaborators,
    isLoading,
    sendOperation,
    setTitle
  };
};