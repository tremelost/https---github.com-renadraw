import { useCanvasStore } from '../../store/canvasStore';
import './PropertiesPanel.css';

const BASE_STROKE_COLORS = ['#1F2328', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#ffffff', '#6B7280'];

// Light mode: Tailwind 300-level — darker pastels, visible on white canvas
const FILL_COLORS_LIGHT = [
  'transparent',
  '#FCA5A5', // rose-300
  '#FDBA74', // orange-300
  '#FDE047', // yellow-300
  '#86EFAC', // green-300
  '#93C5FD', // blue-300
  '#C4B5FD', // purple-300
  '#F9A8D4', // pink-300
  '#D1D5DB', // gray-300
  '#1F2328', // black
];

// Dark mode: Tailwind 400–500 level — vivid, pops against dark canvas
const FILL_COLORS_DARK = [
  'transparent',
  '#F87171', // red-400
  '#FB923C', // orange-400
  '#FACC15', // yellow-400
  '#4ADE80', // green-400
  '#60A5FA', // blue-400
  '#A78BFA', // purple-400
  '#F472B6', // pink-400
  '#9CA3AF', // gray-400
  '#ffffff', // white
];

const STROKE_WIDTHS = [1, 2, 4, 6];
const ROUGHNESS_LEVELS = [
  { value: 0, label: 'Smooth' },
  { value: 0.8, label: 'Light' },
  { value: 1.8, label: 'Rough' },
  { value: 3, label: 'Wild' },
];

export function PropertiesPanel() {
  const {
    selectedElementIds, elements,
    strokeColor, fillColor, strokeWidth, opacity, roughness, fontFamily, fontSize,
    setStrokeColor, setFillColor, setStrokeWidth, setOpacity, setRoughness, setFontFamily, setFontSize,
    activeTool, isDarkMode,
  } = useCanvasStore();

  const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));
  const firstEl = selectedElements[0];

  // Dynamic color palette based on mode
  const strokeColors = Array.from(new Set(
    BASE_STROKE_COLORS
      .map((c) => (isDarkMode && c === '#1F2328') ? '#ffffff' : c)
      .filter((c) => !(!isDarkMode && c === '#ffffff'))
  ));

  // Fill colors: different palettes for each mode (no transformation needed)
  const fillColors = isDarkMode ? FILL_COLORS_DARK : FILL_COLORS_LIGHT;

  // Use first selected element's values, fall back to global defaults
  // In dark mode, if stroke is still the old black, auto-adjust display
  const rawStroke = firstEl?.strokeColor ?? strokeColor;
  const currentStroke = isDarkMode && rawStroke === '#1F2328' ? '#ffffff' : rawStroke;
  const currentFill = firstEl?.fillColor ?? fillColor;
  const currentStrokeWidth = firstEl?.strokeWidth ?? strokeWidth;
  const currentOpacity = firstEl?.opacity ?? opacity;
  const currentRoughness = firstEl?.roughness ?? roughness;
  const currentFontFamily = firstEl?.fontFamily ?? fontFamily;
  const currentFontSize = firstEl?.fontSize ?? fontSize;

  const isTextTool = activeTool === 'text' || firstEl?.type === 'text';
  const isImageEl = selectedElements.every((el) => el.type === 'image') && selectedElements.length > 0;
  const hasMultiple = selectedElementIds.length > 1;

  return (
    <div className="props-panel">
      {hasMultiple && (
        <div className="props-multi-badge">
          {selectedElementIds.length} elements selected
        </div>
      )}

      <div className="props-section">
        <p className="props-label">Stroke</p>
        <div className="color-grid">
          {strokeColors.map((c) => (
            <button
              key={c}
              id={`stroke-color-${c.replace('#', '')}`}
              className={`color-swatch ${currentStroke === c ? 'active' : ''}`}
              style={{
                background: c,
                border: c === '#ffffff' ? '1px solid var(--panel-border)' : 'none',
              }}
              onClick={() => setStrokeColor(c)}
              title={c}
            />
          ))}
        </div>
        <input type="color" className="color-custom-input" value={currentStroke === 'transparent' ? '#000000' : currentStroke} onChange={(e) => setStrokeColor(e.target.value)} title="Custom color" />
      </div>

      {!isTextTool && !isImageEl && (
        <div className="props-section">
          <p className="props-label">Fill</p>
          <div className="color-grid">
            {fillColors.map((c) => (
              <button
                key={c}
                id={`fill-color-${c.replace('#', '').replace('transparent', 'none')}`}
                className={`color-swatch ${currentFill === c ? 'active' : ''} ${c === 'transparent' ? 'transparent-swatch' : ''}`}
                style={{ background: c === 'transparent' ? undefined : c, border: c === '#ffffff' ? '1px solid var(--panel-border)' : 'none' }}
                onClick={() => setFillColor(c)}
                title={c === 'transparent' ? 'No fill' : c}
              />
            ))}
          </div>
          <input type="color" className="color-custom-input" value={currentFill === 'transparent' ? '#ffffff' : currentFill} onChange={(e) => setFillColor(e.target.value)} title="Custom fill" />
        </div>
      )}

      <div className="props-section">
        <p className="props-label">Stroke Width</p>
        <div className="stroke-widths">
          {STROKE_WIDTHS.map((w) => (
            <button key={w} id={`stroke-width-${w}`} className={`stroke-width-btn ${currentStrokeWidth === w ? 'active' : ''}`} onClick={() => setStrokeWidth(w)} title={`${w}px`}>
              <div className="stroke-preview" style={{ height: w + 1, maxHeight: 8 }} />
            </button>
          ))}
        </div>
      </div>

      {!isImageEl && (
        <div className="props-section">
          <p className="props-label">Style</p>
          <div className="roughness-grid">
            {ROUGHNESS_LEVELS.map((r) => (
              <button key={r.value} id={`roughness-${r.label.toLowerCase()}`} className={`roughness-btn ${currentRoughness === r.value ? 'active' : ''}`} onClick={() => setRoughness(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isTextTool && (
        <div className="props-section">
          <p className="props-label">Font</p>
          <div className="roughness-grid">
            <button
              className={`roughness-btn ${currentFontFamily === 'Caveat' ? 'active' : ''}`}
              style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
              onClick={() => setFontFamily('Caveat')}
            >
              Fun
            </button>
            <button
              className={`roughness-btn ${currentFontFamily === 'Inter' ? 'active' : ''}`}
              style={{ fontFamily: "'Inter', sans-serif" }}
              onClick={() => setFontFamily('Inter')}
            >
              Normal
            </button>
          </div>
        </div>
      )}

      {isTextTool && (
        <div className="props-section">
          <p className="props-label">Font Size — {currentFontSize}px</p>
          <input type="range" id="fontsize-slider" className="slider" min={8} max={72} step={1} value={currentFontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} />
        </div>
      )}

      <div className="props-section">
        <p className="props-label">Opacity — {Math.round(currentOpacity * 100)}%</p>
        <input type="range" id="opacity-slider" className="slider" min={0.1} max={1} step={0.05} value={currentOpacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
      </div>
    </div>
  );
}
