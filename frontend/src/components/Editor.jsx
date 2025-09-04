import { useEffect, useRef } from 'react';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import socket from '../services/socket'; // Socket client

Quill.register('modules/cursors', QuillCursors);

const Editor = ({ docId, role, content }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }]],
        cursors: true,
      },
      readOnly: role === 'Viewer',
    });

    quillRef.current.setContents(content);

    // Real-time deltas
    quillRef.current.on('text-change', (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('delta', { docId, delta });
    });

    socket.on('delta', (delta) => {
      quillRef.current.updateContents(delta, 'api'); // 'api' source prevents loop
    });

    // Presence indicators (cursors)
    const cursors = quillRef.current.getModule('cursors');
    socket.on('cursor', ({ userId, position }) => {
      cursors.createCursor(userId, `User ${userId}`, 'blue');
      cursors.moveCursor(userId, position);
    });

    quillRef.current.on('selection-change', (range, oldRange, source) => {
      if (source === 'user' && range) {
        socket.emit('cursor', { docId, position: range });
      }
    });

    // Basic auto-save to backend every 10s (for persistence)
    const interval = setInterval(() => {
      const content = quillRef.current.getContents();
      // axios.put(`/api/docs/${docId}`, { content }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
      // Uncomment the above; comment out if not needed for testing
    }, 10000);

    return () => {
      socket.off('delta');
      socket.off('cursor');
      clearInterval(interval);
    };
  }, [docId, role]);

  return <div ref={editorRef} className="h-96" />;
};

export default Editor;