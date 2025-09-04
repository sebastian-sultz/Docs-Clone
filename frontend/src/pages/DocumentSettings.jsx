import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DocumentSettings = () => {
  const [document, setDocument] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaborator, setNewCollaborator] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('viewer');
  const [users, setUsers] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocument();
    fetchUsers();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocument(response.data);
      setCollaborators(response.data.collaborators);
    } catch (error) {
      console.error('Error fetching document:', error);
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

  const addCollaborator = async () => {
    try {
      // Find user by username or email
      const user = users.find(u => 
        u.username === newCollaborator || u.email === newCollaborator
      );
      
      if (!user) {
        alert('User not found');
        return;
      }
      
      await axios.post(`/api/documents/${id}/collaborators`, {
        userId: user._id,
        role: newCollaboratorRole
      });
      
      setNewCollaborator('');
      fetchDocument(); // Refresh the document
    } catch (error) {
      console.error('Error adding collaborator:', error);
    }
  };

  const removeCollaborator = async (userId) => {
    try {
      await axios.delete(`/api/documents/${id}/collaborators/${userId}`);
      fetchDocument(); // Refresh the document
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const updateCollaboratorRole = async (userId, newRole) => {
    try {
      await axios.post(`/api/documents/${id}/collaborators`, {
        userId,
        role: newRole
      });
      fetchDocument(); // Refresh the document
    } catch (error) {
      console.error('Error updating collaborator role:', error);
    }
  };

  if (!document) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Document Settings: {document.title}</h1>
          <button
            onClick={() => navigate(`/document/${id}`)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            Back to Document
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Collaborators</h2>
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              placeholder="Username or email"
              value={newCollaborator}
              onChange={(e) => setNewCollaborator(e.target.value)}
              className="border rounded-md p-2 flex-1"
            />
            <select
              value={newCollaboratorRole}
              onChange={(e) => setNewCollaboratorRole(e.target.value)}
              className="border rounded-md p-2"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              onClick={addCollaborator}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {collaborators.map(collab => (
              <div key={collab.user._id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <span className="font-medium">{collab.user.username}</span>
                  <span className="text-gray-600 ml-2">({collab.user.email})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={collab.role}
                    onChange={(e) => updateCollaboratorRole(collab.user._id, e.target.value)}
                    className="border rounded-md p-1"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={() => removeCollaborator(collab.user._id)}
                    className="bg-red-600 text-white px-2 py-1 rounded-md text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Document Visibility</h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={document.isPublic}
                onChange={async (e) => {
                  try {
                    await axios.put(`/api/documents/${id}`, {
                      isPublic: e.target.checked
                    });
                    fetchDocument(); // Refresh the document
                  } catch (error) {
                    console.error('Error updating document visibility:', error);
                  }
                }}
                className="mr-2"
              />
              Make document public
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Public documents can be viewed by anyone with the link, even without an account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;