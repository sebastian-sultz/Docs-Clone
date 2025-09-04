// frontend/src/components/Editor/QuillEditor.jsx
import React, { useCallback, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useDocument } from '../../hooks/useDocument';
import { useSocket } from '../../context/SocketContext';

const QuillEditor = ({ documentId }) => {
  const quillRef = useRef();
  const { content, sendOperation, collaborators } = useDocument(documentId);
  const socket = useSocket();

  const handleTextChange = useCallback((content, delta, source, editor) => {
    if (source === 'user' && socket) {
      // Convert delta to our operation format
      const operation = convertDeltaToOperation(delta);
      sendOperation(operation);
    }
  }, [sendOperation, socket]);

  // Handle cursor movements
  const handleSelectionChange = useCallback((range, source, editor) => {
    if (source === 'user' && socket && range) {
      socket.emit('cursor-position', {
        documentId,
        position: range.index,
        userId: localStorage.getItem('userId')
      });
    }
  }, [socket, documentId]);

  // Listen for other users' cursor positions
  useEffect(() => {
    if (!socket) return;

    const handleCursorPosition = (data) => {
      const { userId, position } = data;
      // Update UI to show other user's cursor
      updateCursorIndicator(userId, position);
    };

    socket.on('cursor-position', handleCursorPosition);
    
    return () => {
      socket.off('cursor-position', handleCursorPosition);
    };
  }, [socket]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ReactQuill
        ref={quillRef}
        value={content}
        onChange={handleTextChange}
        onChangeSelection={handleSelectionChange}
        modules={modules}
        theme="snow"
        preserveWhitespace
        className="flex-1"
      />
      
      {/* Collaborator cursors */}
      <div className="collaborator-cursors">
        {collaborators.map(collab => (
          <div 
            key={collab.userId} 
            className="collaborator-cursor"
            style={{ left: `${collab.position}ch` }}
          >
            <div className="cursor-tooltip">{collab.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuillEditor;