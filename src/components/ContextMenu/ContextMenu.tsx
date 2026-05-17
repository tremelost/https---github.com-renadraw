import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  pasteAt?: { x: number; y: number };
}

export function ContextMenu({ x, y, onClose, pasteAt }: ContextMenuProps) {
  const { selectedElementIds, clipboard, selectAll, copySelected, paste, setActiveTool } = useCanvasStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedElementIds.length > 0;
  const hasClipboard = clipboard.length > 0;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const menuWidth = 200;
  const menuHeight = 130;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  const handleSelectAll = () => {
    setActiveTool('select');
    selectAll();
    onClose();
  };

  const handleCopy = () => {
    if (!hasSelection) return;
    copySelected();
    onClose();
  };

  const handlePaste = () => {
    if (!hasClipboard) return;
    // Paste at right-click position (in canvas coords)
    if (pasteAt) {
      paste(pasteAt.x, pasteAt.y);
    } else {
      paste();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="context-menu-item" onClick={handleSelectAll}>
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" />
          </svg>
        </span>
        Select All
        <kbd>Ctrl+A</kbd>
      </button>

      <div className="context-menu-divider" />

      <button
        className={`context-menu-item ${!hasSelection ? 'disabled' : ''}`}
        onClick={handleCopy}
        disabled={!hasSelection}
        title={!hasSelection ? 'Select an object first' : 'Copy selected'}
      >
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </span>
        Copy
        <kbd>Ctrl+C</kbd>
      </button>

      <button
        className={`context-menu-item ${!hasClipboard ? 'disabled' : ''}`}
        onClick={handlePaste}
        disabled={!hasClipboard}
        title={!hasClipboard ? 'Nothing to paste' : 'Paste'}
      >
        <span className="context-menu-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
          </svg>
        </span>
        Paste
        <kbd>Ctrl+V</kbd>
      </button>
    </div>
  );
}
