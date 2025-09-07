import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import TextEditor from '../components/TextEditor';
import Chat from '../components/Chat';
import axios from 'axios';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

const Document = () => {
  const [documentData, setDocumentData] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [error, setError] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const socket = useSocket();
  const saveTimeout = useRef(null);
  const exportMenuRef = useRef(null);

  // Handle click outside for export menu
  const handleClickOutside = useCallback((event) => {
    if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
      setShowExportMenu(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (socket && documentData && currentUser) {
      socket.emit('join-document', {
        documentId: id,
        userId: currentUser.id,
        username: currentUser.username
      });
      
      socket.on('text-change', (data) => {
        if (data.userId !== currentUser.id) {
          setContent(data.content);
        }
      });
      
      socket.on('users-update', (users) => {
        setActiveUsers(users);
      });
      
      socket.on('document-state', (data) => {
        setContent(data.content);
      });
      
      return () => {
        socket.off('text-change');
        socket.off('users-update');
        socket.off('document-state');
      };
    }
  }, [socket, documentData, currentUser, id]);

  // Setup click outside listener only after component is mounted
  useEffect(() => {
    // Add event listener only in browser environment
    if (typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [handleClickOutside]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocumentData(response.data);
      setContent(response.data.content);
      setTitle(response.data.title);
      setCanEdit(response.data.canEdit);
      setLastSavedContent(response.data.content);
      setError(null);
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to load document');
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    if (socket && canEdit && newContent !== content) {
      socket.emit('text-change', {
        documentId: id,
        content: newContent,
        userId: currentUser.id
      });
    }
    
    // Auto-save only if content has changed significantly
    if (newContent !== lastSavedContent && 
        (newContent.length < 50 || Math.abs(newContent.length - lastSavedContent.length) > 5)) {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveTimeout.current = setTimeout(() => {
        saveDocument();
        setLastSavedContent(newContent);
      }, 3000);
    }
  };

  const saveDocument = async () => {
    try {
      setSaving(true);
      await axios.put(`/api/documents/${id}`, { content, title });
      setLastSavedContent(content);
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(saveDocument, 2000);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 10, 10);
    
    doc.setFontSize(12);
    // Split content into lines
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 20);
    
    doc.save(`${title}.pdf`);
    setShowExportMenu(false);
  };

  const exportToWord = () => {
    // Create a simple HTML document for Word export
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body>
          <h1>${title}</h1>
          <div>${content}</div>
        </body>
      </html>
    `;
    
    // Create a Blob and download
    const blob = new Blob([html], { type: 'application/msword' });
    saveAs(blob, `${title}.doc`);
    setShowExportMenu(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen">{error}</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-xl font-semibold border-none focus:outline-none focus:ring-0"
            readOnly={!canEdit}
          />
        </div>
        <div className="flex items-center space-x-4">
          {saving && <span className="text-gray-500">Saving...</span>}
          <div className="flex items-center space-x-2">
            {activeUsers.map((user, index) => (
              <div key={`${user.userId}-${index}`} className="flex items-center space-x-1">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{user.username}</span>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-green-600 text-white px-3 py-1 rounded-md"
            >
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-blue-600 text-white px-3 py-1 rounded-md"
              >
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={exportToPDF}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    PDF
                  </button>
                  <button
                    onClick={exportToWord}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Word
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto p-4 ${showChat ? 'w-3/4' : 'w-full'}`}>
          <TextEditor
            value={content}
            onChange={handleContentChange}
            readOnly={!canEdit}
          />
        </div>
        {showChat && (
          <div className="w-1/4 border-l">
            <Chat documentId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Document;