import { useCanvasStore } from '../../store/canvasStore';
import { exportCanvasToPNG } from '../../utils/export';
import './TopBar.css';

export function TopBar() {
  const {
    undo, redo, history, historyIndex,
    zoom, setZoom, setPan,
    isDarkMode, toggleDarkMode,
    showGrid, toggleGrid,
    clearCanvas, elements,
  } = useCanvasStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = () => exportCanvasToPNG(elements, isDarkMode);
  const handleZoomReset = () => { setZoom(1); setPan(0, 0); };
  const handleZoomIn  = () => setZoom(zoom * 1.25);
  const handleZoomOut = () => setZoom(zoom / 1.25);

  return (
    <div className="topbar">

      {/* ── Row 1: Undo/Redo + Zoom ── */}
      <div className="topbar-row">
        <div className="topbar-group">
          <button id="btn-undo" className="topbar-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
          <button id="btn-redo" className="topbar-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>
            </svg>
          </button>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-group">
          <button id="btn-zoom-out" className="topbar-btn" onClick={handleZoomOut} title="Zoom Out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button id="btn-zoom-reset" className="topbar-zoom-badge" onClick={handleZoomReset} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button id="btn-zoom-in" className="topbar-btn" onClick={handleZoomIn} title="Zoom In">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="topbar-row-divider" />

      {/* ── Row 2: Utilities + Export ── */}
      <div className="topbar-row">
        <div className="topbar-group">
          <button id="btn-toggle-grid" className={`topbar-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid} title="Toggle grid">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button id="btn-toggle-dark" className="topbar-btn" onClick={toggleDarkMode} title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>
          <button id="btn-clear" className="topbar-btn topbar-btn-danger" onClick={() => { if (confirm('Clear canvas?')) clearCanvas(); }} title="Clear canvas">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>

        <div className="topbar-spacer" />

        <button id="btn-export" className="topbar-btn-export" onClick={handleExport} title="Export as PNG">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}
