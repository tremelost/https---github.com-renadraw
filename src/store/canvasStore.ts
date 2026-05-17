import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CanvasElement, CanvasState, ToolType } from '../types/canvas.types';

interface HistoryEntry {
  elements: CanvasElement[];
}

interface CanvasStore extends Omit<CanvasState, 'selectedElementId'> {
  // Multi-select
  selectedElementIds: string[];
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: CanvasElement[];

  // Actions
  setActiveTool: (tool: ToolType) => void;
  addElement: (element: CanvasElement) => void;
  setElements: (elements: CanvasElement[]) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelected: () => void;

  // Selection actions
  selectElement: (id: string | null, additive?: boolean) => void;
  selectElements: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Clipboard
  copySelected: () => void;
  paste: (offsetX?: number, offsetY?: number) => void;

  // Properties (apply to all selected)
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setRoughness: (roughness: number) => void;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleDarkMode: () => void;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  clearCanvas: () => void;
}

const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  elements: [],
  selectedElementIds: [],
  activeTool: 'pencil',
  strokeColor: '#1F2328',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  roughness: 1.2,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDarkMode: false,
  showGrid: true,
  history: [{ elements: [] }],
  historyIndex: 0,
  clipboard: [],

  setActiveTool: (tool) => set({ activeTool: tool, selectedElementIds: [] }),

  addElement: (element) => {
    const { elements } = get();
    set({ elements: [...elements, element] });
  },

  setElements: (elements) => {
    set({ elements, selectedElementIds: [] });
    get().pushHistory();
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementIds: state.selectedElementIds.filter((sid) => sid !== id),
    }));
    get().pushHistory();
  },

  deleteSelected: () => {
    const { selectedElementIds } = get();
    if (selectedElementIds.length === 0) return;
    set((state) => ({
      elements: state.elements.filter((el) => !selectedElementIds.includes(el.id)),
      selectedElementIds: [],
    }));
    get().pushHistory();
  },

  selectElement: (id, additive = false) => {
    if (id === null) {
      set({ selectedElementIds: [] });
      return;
    }
    if (additive) {
      set((state) => {
        const already = state.selectedElementIds.includes(id);
        return {
          selectedElementIds: already
            ? state.selectedElementIds.filter((sid) => sid !== id)
            : [...state.selectedElementIds, id],
        };
      });
    } else {
      set({ selectedElementIds: [id] });
    }
  },

  selectElements: (ids) => set({ selectedElementIds: ids }),

  selectAll: () => {
    const { elements } = get();
    set({ selectedElementIds: elements.map((el) => el.id) });
  },

  clearSelection: () => set({ selectedElementIds: [] }),

  copySelected: () => {
    const { selectedElementIds, elements } = get();
    const copied = elements.filter((el) => selectedElementIds.includes(el.id));
    if (copied.length === 0) return;
    set({ clipboard: copied });
  },

  paste: (offsetX = 24, offsetY = 24) => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    const newElements = clipboard.map((el) => ({
      ...el,
      id: uuidv4(),
      x: el.x + offsetX,
      y: el.y + offsetY,
      points: el.points?.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })),
    }));
    const { elements } = get();
    set({
      elements: [...elements, ...newElements],
      selectedElementIds: newElements.map((el) => el.id),
    });
    get().pushHistory();
  },

  setStrokeColor: (color) => {
    set({ strokeColor: color });
    const { selectedElementIds } = get();
    selectedElementIds.forEach((id) => get().updateElement(id, { strokeColor: color }));
  },

  setFillColor: (color) => {
    set({ fillColor: color });
    const { selectedElementIds } = get();
    selectedElementIds.forEach((id) => get().updateElement(id, { fillColor: color }));
  },

  setStrokeWidth: (width) => {
    set({ strokeWidth: width });
    const { selectedElementIds } = get();
    selectedElementIds.forEach((id) => get().updateElement(id, { strokeWidth: width }));
  },

  setOpacity: (opacity) => {
    set({ opacity });
    const { selectedElementIds } = get();
    selectedElementIds.forEach((id) => get().updateElement(id, { opacity }));
  },

  setRoughness: (roughness) => {
    set({ roughness });
    const { selectedElementIds } = get();
    selectedElementIds.forEach((id) => get().updateElement(id, { roughness }));
  },

  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 5) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  toggleDarkMode: () => {
    const { isDarkMode, elements, strokeColor } = get();
    const goingDark = !isDarkMode;

    // Convert black ↔ white on all existing elements
    const convertedElements = elements.map((el) => ({
      ...el,
      strokeColor:
        goingDark && el.strokeColor === '#1F2328' ? '#ffffff' :
        !goingDark && el.strokeColor === '#ffffff' ? '#1F2328' :
        el.strokeColor,
    }));

    // Also update the global default strokeColor
    const newStrokeColor =
      goingDark && strokeColor === '#1F2328' ? '#ffffff' :
      !goingDark && strokeColor === '#ffffff' ? '#1F2328' :
      strokeColor;

    set({ isDarkMode: goingDark, elements: convertedElements, strokeColor: newStrokeColor });
  },
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ historyIndex: newIndex, elements: [...history[newIndex].elements], selectedElementIds: [] });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ historyIndex: newIndex, elements: [...history[newIndex].elements], selectedElementIds: [] });
    }
  },

  pushHistory: () => {
    const { elements, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: [...elements] });
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  clearCanvas: () => {
    set({ elements: [], selectedElementIds: [] });
    get().pushHistory();
  },
}));
