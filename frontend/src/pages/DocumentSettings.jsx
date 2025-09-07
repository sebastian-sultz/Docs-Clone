import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DocumentSettings = () => {
  const [document, setDocument] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaboratorId, setNewCollaboratorId] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('viewer');
  const [users, setUsers] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocument(response.data);
      setCollaborators(response.data.collaborators || []);

      if (response.data.canEdit) fetchUsersForDocument();
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  const fetchUsersForDocument = async () => {
    try {
      const response = await axios.get(`/api/users/for-document/${id}`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users for document:', error);
    }
  };

  const addCollaborator = async () => {
    if (!newCollaboratorId) return alert('Select a user');
    try {
      await axios.post(`/api/documents/${id}/collaborators`, {
        userId: newCollaboratorId,
        role: newCollaboratorRole
      });
      setNewCollaboratorId('');
      fetchDocument();
    } catch (error) {
      console.error('Error adding collaborator:', error);
    }
  };

  const removeCollaborator = async (userId) => {
    try {
      await axios.delete(`/api/documents/${id}/collaborators/${userId}`);
      fetchDocument();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const updateCollaboratorRole = async (userId, role) => {
    try {
      await axios.post(`/api/documents/${id}/collaborators`, { userId, role });
      fetchDocument();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (!document) return <div className="p-8 text-center text-gray-600">Loading document settings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{document.title} Settings</h1>
          <button
            onClick={() => navigate(`/document/${id}`)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
          >
            Back to Document
          </button>
        </div>

        {/* Collaborators Section */}
        {document.canEdit && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Collaborators</h2>

            {/* Add Collaborator */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select
                value={newCollaboratorId}
                onChange={(e) => setNewCollaboratorId(e.target.value)}
                className="border rounded-md p-2 flex-1"
              >
                <option value="">Select user</option>
                {users
                  .filter(u => !collaborators.some(c => c.user?._id === u._id)) // safe null check
                  .map(u => (
                    <option key={u._id} value={u._id}>{u.username}</option>
                  ))}
              </select>

              <select
                value={newCollaboratorRole}
                onChange={(e) => setNewCollaboratorRole(e.target.value)}
                className="border rounded-md p-2 w-full sm:w-32"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>

              <button
                onClick={addCollaborator}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition w-full sm:w-auto"
              >
                Add
              </button>
            </div>

            {/* Existing Collaborators */}
            <div className="space-y-2">
              {collaborators.map((c, index) => (
                <div
                  key={c.user?._id || index} // fallback key if user is null
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md gap-3"
                >
                  <div>
                    <span className="font-medium text-gray-800">{c.user?.username || 'Unknown User'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <select
                      value={c.role}
                      onChange={(e) => updateCollaboratorRole(c.user?._id, e.target.value)}
                      className="border rounded-md p-1"
                      disabled={!c.user?._id}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => c.user?._id && removeCollaborator(c.user._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition text-sm"
                      disabled={!c.user?._id}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visibility Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Document Visibility</h2>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={document.isPublic}
              onChange={async (e) => {
                try {
                  await axios.put(`/api/documents/${id}`, { isPublic: e.target.checked });
                  fetchDocument();
                } catch (error) {
                  console.error('Error updating visibility:', error);
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-gray-700">Make document public</span>
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Public documents can be viewed by anyone with the link.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;
