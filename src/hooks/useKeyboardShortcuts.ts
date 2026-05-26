import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useCollabStore } from '../store/collabStore';

export function useKeyboardShortcuts() {
  const { undo, redo, deleteSelected, setActiveTool, clearCanvas, selectAll, copySelected, paste } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const { boardId, userRole } = useCollabStore.getState();
      const isReadOnly = Boolean(boardId && userRole === 'viewer');

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (isReadOnly) return;
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (isReadOnly) return;
        e.preventDefault(); redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setActiveTool('select');
        selectAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        if (isReadOnly) return;
        e.preventDefault(); deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault(); copySelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (isReadOnly) return;
        e.preventDefault(); paste();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isReadOnly) return;
        deleteSelected();
      }
      if (e.key === 'Escape') {
        setActiveTool('select');
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (isReadOnly) return;
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'p': setActiveTool('pencil'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'o': setActiveTool('ellipse'); break;
          case 'd': setActiveTool('diamond'); break;
          case 'l': setActiveTool('line'); break;
          case 'a': if (!e.ctrlKey) setActiveTool('arrow'); break;
          case 't': setActiveTool('text'); break;
          case 'i': setActiveTool('image'); break;
          case 'e': setActiveTool('eraser'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, setActiveTool, clearCanvas, selectAll, copySelected, paste]);
}
