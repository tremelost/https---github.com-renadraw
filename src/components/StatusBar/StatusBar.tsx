import { useCanvasStore } from '../../store/canvasStore';
import './StatusBar.css';

const TOOL_HINTS: Record<string, string> = {
  select: 'Click to select • Shift+click to multi-select • Drag empty space to box-select',
  pencil: 'Click and drag to draw freehand',
  rectangle: 'Click and drag to draw rectangle',
  ellipse: 'Click and drag to draw ellipse',
  diamond: 'Click and drag to draw diamond',
  line: 'Click and drag to draw a line',
  arrow: 'Click and drag to draw an arrow',
  text: 'Click anywhere to add text • Esc to cancel',
  image: 'Click to upload an image (PNG, JPG, etc)',
  eraser: 'Click on any element to erase it',
};

export function StatusBar() {
  const { activeTool, zoom, elements, selectedElementIds } = useCanvasStore();
  const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));

  return (
    <div className="status-bar">
      <span className="status-hint">{TOOL_HINTS[activeTool]}</span>
      <div className="status-right">
        {selectedElements.length > 0 && (
          <span className="status-badge status-badge-selected">
            {selectedElements.length === 1
              ? selectedElements[0].type
              : `${selectedElements.length} selected`}
          </span>
        )}
        <span className="status-badge">{elements.length} element{elements.length !== 1 ? 's' : ''}</span>
        <span className="status-badge">Zoom {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
