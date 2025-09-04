import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import TextEditor from '../components/TextEditor';
import Chat from '../components/Chat';
import axios from 'axios';

const Document = () => {
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const socket = useSocket();
  const saveTimeout = useRef(null);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (socket && document && currentUser) {
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
      
      return () => {
        socket.off('text-change');
        socket.off('users-update');
      };
    }
  }, [socket, document, currentUser]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocument(response.data);
      setContent(response.data.content);
      setTitle(response.data.title);
      setCanEdit(response.data.canEdit);
    } catch (error) {
      console.error('Error fetching document:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    if (socket && canEdit) {
      socket.emit('text-change', {
        documentId: id,
        content: newContent,
        userId: currentUser.id
      });
    }
    
    // Auto-save after 2 seconds of inactivity
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(saveDocument, 2000);
  };

  const saveDocument = async () => {
    try {
      setSaving(true);
      await axios.put(`/api/documents/${id}`, { content, title });
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

  const exportDocument = async (format) => {
    try {
      const response = await axios.get(`/api/documents/${id}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting document:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

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
            {activeUsers.map(user => (
              <div key={user.userId} className="flex items-center space-x-1">
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
              Chat
            </button>
            <div className="relative">
              <button className="bg-blue-600 text-white px-3 py-1 rounded-md">
                Export
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                <button
                  onClick={() => exportDocument('pdf')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  PDF
                </button>
                <button
                  onClick={() => exportDocument('word')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Word
                </button>
              </div>
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