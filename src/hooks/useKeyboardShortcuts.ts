import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function useKeyboardShortcuts() {
  const { undo, redo, deleteSelected, setActiveTool, clearCanvas, selectAll, copySelected, paste } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setActiveTool('select');
        selectAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault(); deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault(); copySelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault(); paste();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
      if (e.key === 'Escape') {
        setActiveTool('select');
      }
      if (!e.ctrlKey && !e.metaKey) {
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
