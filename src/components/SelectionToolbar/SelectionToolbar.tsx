import { useCanvasStore } from '../../store/canvasStore';
import { getMultiBoundingBox } from '../../utils/drawing';
import './SelectionToolbar.css';

export function SelectionToolbar() {
  const { elements, selectedElementIds, copySelected, deleteSelected, zoom, panX, panY } = useCanvasStore();

  if (selectedElementIds.length === 0) return null;

  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
  if (selectedElements.length === 0) return null;

  const bb = getMultiBoundingBox(selectedElements);

  // Convert canvas coordinates to screen coordinates
  const screenX = bb.x * zoom + panX;
  const screenY = bb.y * zoom + panY;
  const screenWidth = bb.width * zoom;

  // Position it centered above the bounding box
  const top = screenY - 50; // 50px above the box
  const left = screenX + screenWidth / 2;

  return (
    <div
      className="selection-toolbar"
      style={{
        top: top < 10 ? 10 : top, // Keep it within screen bounds at the top
        left,
        transform: 'translateX(-50%)',
      }}
    >
      <button className="selection-btn" onClick={copySelected} title="Copy (Ctrl+C)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>
      <div className="selection-divider" />
      <button className="selection-btn text-red" onClick={deleteSelected} title="Delete (Del)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
