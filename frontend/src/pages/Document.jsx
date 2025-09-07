// src/pages/Document.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import TextEditor from '../components/TextEditor';
import Chat from '../components/Chat';
import axios from 'axios';
import { saveAs } from 'file-saver';

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const socket = useSocket();

  const [documentData, setDocumentData] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState(null);
  const exportMenuRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
      setShowExportMenu(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Socket presence updates
  useEffect(() => {
    if (!socket) return;

    const dedupeUsers = (users) => {
      const map = new Map();
      users.forEach(u => map.set(u.userId, u));
      return Array.from(map.values());
    };

    socket.on('users-update', (users) => setActiveUsers(dedupeUsers(users)));
    socket.on('user-joined', ({ userId, username }) => setActiveUsers(prev => dedupeUsers([...prev, { userId, username }])));
    socket.on('user-left', ({ userId }) => setActiveUsers(prev => prev.filter(u => u.userId !== userId)));

    return () => {
      socket.off('users-update');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket]);

  const fetchDocument = async () => {
    try {
      const res = await axios.get(`/api/documents/${id}`);
      setDocumentData(res.data);
      setTitle(res.data.title);
      setCanEdit(res.data.canEdit);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load document');
      if (err.response?.status === 404) setTimeout(() => navigate('/'), 2000);
    } finally { setLoading(false); }
  };

  const onSaveComplete = async (contentDelta) => {
    try {
      setSaving(true);
      await axios.put(`/api/documents/${id}`, { contentDelta, title });
      setSaving(false);
    } catch (err) { console.error(err); setSaving(false); }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (documentData) {
      if (documentData.saveTitleTimeout) clearTimeout(documentData.saveTitleTimeout);
      documentData.saveTitleTimeout = setTimeout(() => {
        axios.put(`/api/documents/${id}`, { title }).catch(console.error);
      }, 1200);
    }
  };

  const exportFile = async (format) => {
    try {
      const res = await axios.get(`/api/documents/${id}/export?format=${format}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const disposition = res.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `${title || 'document'}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      saveAs(new Blob([res.data], { type: res.headers['content-type'] }), filename);
    } catch (err) { console.error(err); } finally { setShowExportMenu(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen">{error}</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-800">← Back</button>
          <input type="text" value={title} onChange={handleTitleChange}
            className="text-xl font-semibold border-none focus:outline-none focus:ring-0"
            readOnly={!canEdit} />
        </div>

        <div className="flex items-center space-x-4">
          {saving && <span className="text-gray-500">Saving...</span>}
          <div className="flex items-center space-x-2">
            {activeUsers.map(u => (
              <div key={u.userId} className="flex items-center space-x-1">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {u.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm">{u.username}</span>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setShowChat(!showChat)} className="bg-green-600 text-white px-3 py-1 rounded-md">
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-blue-600 text-white px-3 py-1 rounded-md">
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg py-1 z-10">
                  <button onClick={() => exportFile('pdf')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Export PDF</button>
                  <button onClick={() => exportFile('word')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Export Word</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto p-4 ${showChat ? 'w-3/4' : 'w-full'}`}>
          <TextEditor
            docId={id}
            role={canEdit ? 'Editor' : 'Viewer'}
            initialDelta={documentData?.contentDelta || { ops: [] }}
            onSaveComplete={onSaveComplete}
          />
        </div>

        {showChat && <div className="w-1/4 border-l"><Chat documentId={id} /></div>}
      </div>
    </div>
  );
};

export default Document;
