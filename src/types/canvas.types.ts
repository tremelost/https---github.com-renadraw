export interface SelectionRect {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ToolType =
  | 'select'
  | 'pencil'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'eraser';

export type ElementType =
  | 'pencil'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageData?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  roughness: number;
  seed: number;
  isSelected?: boolean;
  isEditing?: boolean;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  activeTool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  roughness: number;
  fontFamily: string;
  fontSize: number;
  zoom: number;
  panX: number;
  panY: number;
  isDarkMode: boolean;
  showGrid: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'  |       'e'
  | 'sw' | 's' | 'se';
