import React, { useState, useEffect, useRef } from 'react';

const TextEditor = ({ value, onChange, readOnly = false }) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const editorRef = useRef(null);
  const lastCursorPos = useRef(0);

  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
      
      // Restore cursor position after update
      if (editorRef.current) {
        setTimeout(() => {
          const selection = window.getSelection();
          const range = document.createRange();
          
          // Try to restore cursor position
          const textNode = editorRef.current.childNodes[0] || editorRef.current;
          const maxPos = textNode.textContent ? textNode.textContent.length : 0;
          const pos = Math.min(lastCursorPos.current, maxPos);
          
          range.setStart(textNode, pos);
          range.setEnd(textNode, pos);
          selection.removeAllRanges();
          selection.addRange(range);
        }, 0);
      }
    }
  }, [value]);

  const handleInput = (e) => {
    const newValue = e.target.innerHTML;
    setInternalValue(newValue);
    
    // Save cursor position
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      lastCursorPos.current = preCaretRange.toString().length;
    }
    
    if (onChange) {
      onChange(newValue);
    }
  };

  const applyFormat = (format) => {
    // Save current selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      // Apply format to selected text
      document.execCommand(format, false, null);
    } else {
      // Apply format at cursor position
      document.execCommand(format, false, null);
    }
    
    // Restore focus
    editorRef.current.focus();
    
    // Trigger change event
    const newValue = editorRef.current.innerHTML;
    setInternalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position
    document.execCommand('insertText', false, text);
    
    // Trigger change event
    const newValue = editorRef.current.innerHTML;
    setInternalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {!readOnly && (
        <div className="bg-gray-100 p-2 border-b flex space-x-2">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="px-2 py-1 bg-white border rounded hover:bg-gray-200"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="px-2 py-1 bg-white border rounded hover:bg-gray-200"
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="px-2 py-1 bg-white border rounded hover:bg-gray-200"
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('insertUnorderedList')}
            className="px-2 py-1 bg-white border rounded hover:bg-gray-200"
            title="Bullet List"
          >
            • List
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: internalValue }}
        className="p-4 min-h-[300px] focus:outline-none focus:ring-1 focus:ring-blue-300"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
};

export default TextEditor;