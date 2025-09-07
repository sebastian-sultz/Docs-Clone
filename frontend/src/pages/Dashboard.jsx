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
  const [filter, setFilter] = useState('all'); // 'all', 'owned', 'shared', 'public'
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

 const createDocument = async () => {
  try {
    const response = await axios.post('/api/documents', {
      title: newDocTitle,
      content: '',
      isPublic: false
    });
    setDocuments([...documents, response.data]);
    setShowModal(false);
    setNewDocTitle('');
    // Navigate to the new document
    navigate(`/document/${response.data._id}`);
  } catch (error) {
    console.error('Error creating document:', error);
    alert('You need editor or admin privileges to create documents');
  }
};

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const filterDocuments = () => {
    if (!currentUser) return documents;
    
    return documents.filter(doc => {
      const isOwner = doc.owner._id === currentUser.id;
      const isCollaborator = doc.collaborators.some(c => c.user._id === currentUser.id);
      
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Collaboration Tool</h1>
          <div className="flex items-center space-x-4">
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
        {showUserManagement && currentUser?.role === 'admin' && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user._id, e.target.value)}
                          className="border rounded-md p-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">My Documents</h2>
          <div className="flex space-x-2">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filterDocuments().map(doc => (
            <div key={doc._id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2">{doc.title}</h3>
              <p className="text-gray-600 mb-4">
                {doc.content.substring(0, 100)}...
              </p>
              <div className="flex justify-between items-center">
                <Link
                  to={`/document/${doc._id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Open Document
                </Link>
                {doc.owner._id === currentUser?.id && (
                  <Link
                    to={`/document/${doc._id}/settings`}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
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