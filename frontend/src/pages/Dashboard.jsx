import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) fetchDocuments();
    if (currentUser?.role === 'admin') fetchUsers();
  }, [currentUser]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents');
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const createDocument = async () => {
    if (!newDocTitle.trim()) return alert('Document title cannot be empty');
    try {
      const res = await axios.post('/api/documents', {
        title: newDocTitle.trim(),
        content: '',
        isPublic: false,
      });
      setDocuments(prev => [...prev, res.data]);
      setShowModal(false);
      setNewDocTitle('');
      navigate(`/document/${res.data._id}`);
    } catch (err) {
      console.error(err);
      alert('You need editor or admin privileges to create documents');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/users/${userId}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user. Make sure the user exists.');
    }
  };

  const filterDocuments = () => {
    if (!currentUser) return [];
    return documents.filter(doc => {
      const ownerId = doc.owner?._id?.toString() || doc.owner?.id?.toString();
      const isOwner = ownerId === currentUser.id?.toString();
      const collab = doc.collaborators?.find(c => c.user?._id?.toString() === currentUser.id?.toString());
      const isCollaborator = !!collab;

      switch (filter) {
        case 'owned':
          return isOwner;
        case 'shared':
          return isCollaborator && !isOwner;
        case 'public':
          return doc.isPublic && !isOwner && !isCollaborator;
        default:
          return isOwner || isCollaborator || doc.isPublic;
      }
    });
  };

  const getUserRoleForDoc = (doc) => {
    const ownerId = doc.owner?._id?.toString() || doc.owner?.id?.toString();
    const currentUserId = currentUser?.id?.toString();
    if (ownerId === currentUserId) return 'Owner';
    const collab = doc.collaborators?.find(c => c.user?._id?.toString() === currentUserId);
    if (collab) return collab.role.charAt(0).toUpperCase() + collab.role.slice(1);
    return doc.isPublic ? 'Viewer' : '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <h1 className="text-2xl font-bold text-gray-900">Collaboration Tool</h1>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span>Welcome, {currentUser?.username}</span>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowUserManagement(!showUserManagement)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Manage Users
              </button>
            )}
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Management */}
        {showUserManagement && currentUser?.role === 'admin' && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md overflow-x-auto">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap flex flex-wrap items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user._id, e.target.value)}
                        className="border rounded-md p-1"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user._id !== currentUser.id && (
                        <button
                          onClick={() => deleteUser(user._id)}
                          className="bg-red-600 text-white px-2 py-1 rounded-md text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Document Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2 sm:gap-0">
          <h2 className="text-xl font-semibold">My Documents</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-md p-2"
            >
              <option value="all">All Documents</option>
              <option value="owned">My Documents</option>
              <option value="shared">Shared With Me</option>
              <option value="public">Public Documents</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md"
            >
              New Document
            </button>
          </div>
        </div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filterDocuments().map(doc => {
            const ownerId = doc.owner?._id?.toString() || doc.owner?.id?.toString();
            const currentUserId = currentUser?.id?.toString();
            const isOwner = ownerId === currentUserId;
            const collab = doc.collaborators?.find(c => c.user?._id?.toString() === currentUserId);
            const docRole = isOwner
              ? 'Owner'
              : collab?.role
                ? collab.role.charAt(0).toUpperCase() + collab.role.slice(1)
                : doc.isPublic
                  ? 'Viewer'
                  : '';

            return (
              <div key={doc._id} className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{doc.title}</h3>
                  {docRole && (
                    <p className="text-gray-500 text-sm mb-2">
                      Your Role: <span className="font-medium">{docRole}</span>
                    </p>
                  )}
                  <p className="text-gray-600 mb-4">{doc.content?.substring(0, 100) || 'No content yet'}...</p>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <Link
                    to={`/document/${doc._id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Open Document
                  </Link>
                  {isOwner && (
                    <Link
                      to={`/document/${doc._id}/settings`}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Settings
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Create Document Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Document</h3>
            <input
              type="text"
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createDocument}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
