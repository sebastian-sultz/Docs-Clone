import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const Chat = ({ documentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socket = useSocket();
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (socket) {
      socket.on('chat-message', (data) => {
        setMessages(prev => [...prev, data]);
      });
      
      return () => {
        socket.off('chat-message');
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      const messageData = {
        documentId,
        userId: currentUser.id,
        username: currentUser.username,
        message: newMessage,
        timestamp: new Date()
      };
      
      socket.emit('chat-message', messageData);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col border-l">
      <div className="bg-gray-100 p-3 border-b">
        <h3 className="font-semibold">Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, index) => (
          <div key={index} className="p-2 rounded-lg bg-gray-100">
            <div className="flex justify-between items-start">
              <span className="font-medium text-blue-600">{msg.username}</span>
              <span className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border rounded-md p-2"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;