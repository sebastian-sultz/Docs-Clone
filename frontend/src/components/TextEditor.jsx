import React, { useState, useEffect, useRef } from 'react';

const TextEditor = ({ value, onChange, readOnly = false }) => {
  const [content, setContent] = useState(value || '');
  const editorRef = useRef(null);

  useEffect(() => {
    setContent(value || '');
  }, [value]);

  const handleInput = (e) => {
    const newValue = e.target.innerHTML;
    setContent(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const applyFormat = (format) => {
    document.execCommand(format, false, null);
    editorRef.current.focus();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {!readOnly && (
        <div className="bg-gray-100 p-2 border-b">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('insertUnorderedList')}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            • List
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        className="p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  );
};

export default TextEditor;