import { useCanvasStore } from '../../store/canvasStore';
import { useCollabStore } from '../../store/collabStore';
import { ToolType } from '../../types/canvas.types';
import './Toolbar.css';

interface Tool {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const IconSelect = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3l14 9-7 1-3 7z"/>
  </svg>
);
const IconPencil = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);
const IconRect = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
);
const IconEllipse = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="10"/>
  </svg>
);
const IconDiamond = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L22 12 12 22 2 12z"/>
  </svg>
);
const IconLine = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="20" x2="20" y2="4"/>
  </svg>
);
const IconArrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="19" x2="19" y2="5"/>
    <polyline points="9 5 19 5 19 15"/>
  </svg>
);
const IconText = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
);
const IconImage = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);
const IconEraser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/>
    <path d="M6 17l-3-3"/>
  </svg>
);

const TOOLS: Tool[] = [
  { id: 'select',    label: 'Select',    shortcut: 'V', icon: <IconSelect /> },
  { id: 'pencil',    label: 'Pencil',    shortcut: 'P', icon: <IconPencil /> },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: <IconRect /> },
  { id: 'ellipse',   label: 'Circle',    shortcut: 'O', icon: <IconEllipse /> },
  { id: 'diamond',   label: 'Diamond',   shortcut: 'D', icon: <IconDiamond /> },
  { id: 'line',      label: 'Line',      shortcut: 'L', icon: <IconLine /> },
  { id: 'arrow',     label: 'Arrow',     shortcut: 'A', icon: <IconArrow /> },
  { id: 'text',      label: 'Text',      shortcut: 'T', icon: <IconText /> },
  { id: 'image',     label: 'Image',     shortcut: 'I', icon: <IconImage /> },
  { id: 'eraser',    label: 'Eraser',    shortcut: 'E', icon: <IconEraser /> },
];

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();
  const { boardId, userRole } = useCollabStore();

  const isViewer = boardId && userRole === 'viewer';

  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      <div className="toolbar-logo">
        <span className="toolbar-logo-text">rena</span>
        <span className="toolbar-logo-accent">draw</span>
      </div>

      {!isViewer && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-tools">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                id={`tool-${tool.id}`}
                className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => setActiveTool(tool.id)}
                title={`${tool.label} (${tool.shortcut})`}
                aria-pressed={activeTool === tool.id}
              >
                <span className="tool-icon">{tool.icon}</span>
                <span className="tool-tooltip">
                  {tool.label}
                  <kbd>{tool.shortcut}</kbd>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
