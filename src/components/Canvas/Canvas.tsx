import { useRef, useState, useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasStore } from '../../store/canvasStore';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { SelectionToolbar } from '../SelectionToolbar/SelectionToolbar';
import './Canvas.css';

interface ContextMenuState {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null!);
  const { handlePointerDown, handlePointerMove, handlePointerUp, handleMouseLeave, handleDoubleClick } = useCanvas(canvasRef, gridCanvasRef);
  const { activeTool, zoom, panX, panY, strokeWidth } = useCanvasStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const getCursor = () => {
    switch (activeTool) {
      case 'select': return 'default';
      case 'eraser': {
        const radius = Math.max(15, strokeWidth * 5) * zoom;
        const diameter = radius * 2;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}"><circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="rgba(255, 50, 50, 0.2)" stroke="rgba(255, 50, 50, 0.8)" stroke-width="2"/></svg>`;
        const encoded = encodeURIComponent(svg);
        return `url("data:image/svg+xml;utf8,${encoded}") ${radius} ${radius}, cell`;
      }
      case 'text': return 'text';
      case 'image': return 'copy';
      case 'pencil': return 'crosshair';
      default: return 'crosshair';
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    // Convert screen → canvas coords for paste position
    const canvasX = (screenX - panX) / zoom;
    const canvasY = (screenY - panY) / zoom;
    setContextMenu({ screenX: e.clientX, screenY: e.clientY, canvasX, canvasY });
  }, [zoom, panX, panY]);

  return (
    <div className="canvas-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={gridCanvasRef}
        className="main-canvas"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      <canvas
        ref={canvasRef}
        id="main-canvas"
        className="main-canvas"
        style={{ cursor: getCursor(), position: 'absolute', top: 0, left: 0, zIndex: 1, background: 'transparent', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => {
          if (e.buttons === 0) {
            handlePointerUp(e);
          }
          handleMouseLeave();
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.screenX}
          y={contextMenu.screenY}
          pasteAt={{ x: contextMenu.canvasX, y: contextMenu.canvasY }}
          onClose={() => setContextMenu(null)}
        />
      )}
      <SelectionToolbar />
    </div>
  );
}
