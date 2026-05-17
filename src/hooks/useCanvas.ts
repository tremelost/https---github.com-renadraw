import { useEffect, useRef, useCallback } from 'react';
import rough from 'roughjs';
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from '../store/canvasStore';
import { CanvasElement, Point, SelectionRect } from '../types/canvas.types';
import {
  drawElement,
  drawSingleSelection,
  drawMultiSelection,
  drawSelectionRect,
  drawGrid,
  isPointInElement,
  getMultiBoundingBox,
  isElementInSelectionRect,
} from '../utils/drawing';
import { readImageFile } from '../utils/export';

export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement>, gridCanvasRef?: React.RefObject<HTMLCanvasElement>) {
  const store = useCanvasStore();
  const isDrawing = useRef(false);
  const isMoving = useRef(false);
  const isDragSelecting = useRef(false);
  const isPanning = useRef(false);
  const currentElementId = useRef<string | null>(null);
  const lastPoint = useRef<Point>({ x: 0, y: 0 });
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // For drag-select rubber band (in canvas coords)
  const selectionRect = useRef<SelectionRect | null>(null);

  // Preload images
  const preloadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    if (imageCache.current.has(src)) return Promise.resolve(imageCache.current.get(src)!);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { imageCache.current.set(src, img); resolve(img); };
      img.src = src;
    });
  }, []);

  // Convert screen coords → canvas coords
  const toCanvas = useCallback((screenX: number, screenY: number): Point => {
    const { zoom, panX, panY } = useCanvasStore.getState();
    return { x: (screenX - panX) / zoom, y: (screenY - panY) / zoom };
  }, []);

  const getScreenPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [canvasRef]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const sp = getScreenPoint(e);
    return toCanvas(sp.x, sp.y);
  }, [toCanvas, getScreenPoint]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { elements, selectedElementIds, zoom, panX, panY, isDarkMode, showGrid } = useCanvasStore.getState();

    // 1. Preload any images FIRST (asynchronous) to prevent overlapping renders
    const imagePromises: Promise<HTMLImageElement>[] = [];
    for (const el of elements) {
      if (el.type === 'image' && el.imageData) {
        imagePromises.push(preloadImage(el.imageData));
      }
    }
    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
    }

    // 2. Clear canvases and start synchronous drawing
    const ctx = canvas.getContext('2d')!;
    const rc = rough.canvas(canvas);

    // Render Background and Grid on gridCanvas (if provided)
    if (gridCanvasRef?.current) {
      const gridCanvas = gridCanvasRef.current;
      const gridCtx = gridCanvas.getContext('2d')!;
      gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      gridCtx.fillStyle = isDarkMode ? '#1A1B1E' : '#FAFAF8';
      gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
      if (showGrid) drawGrid(gridCtx, gridCanvas.width, gridCanvas.height, zoom, panX, panY, isDarkMode);
    }

    // Main canvas clears to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw elements
    for (const el of elements) {
      if (el.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(15, el.strokeWidth * 5);
        if (el.points && el.points.length > 0) {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      } else if (el.type === 'image' && el.imageData) {
        const img = imageCache.current.get(el.imageData);
        if (img) {
          ctx.save();
          ctx.globalAlpha = el.opacity;
          ctx.drawImage(img, el.x, el.y, el.width, el.height);
          ctx.restore();
        }
      } else {
        drawElement(rc, ctx, el);
      }
    }

    // Draw selection
    const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selectedElements.length === 1) {
      drawSingleSelection(ctx, selectedElements[0]);
    } else if (selectedElements.length > 1) {
      drawMultiSelection(ctx, selectedElements);
    }

    ctx.restore();

    // Draw drag-selection rect in screen space (no transform)
    if (selectionRect.current) {
      const sr = selectionRect.current;
      const { zoom: z, panX: px, panY: py } = useCanvasStore.getState();
      // Convert back to screen
      // sr.x/sr.y are already the min corner — width/height can be negative
      // ctx.fillRect with negative values draws in the WRONG direction, so normalize
      const screenRect = {
        x: sr.x * z + px,
        y: sr.y * z + py,
        width: Math.abs(sr.width) * z,
        height: Math.abs(sr.height) * z,
        startX: 0,
        startY: 0,
      };
      drawSelectionRect(ctx, screenRect);
    }
  }, [canvasRef, gridCanvasRef, preloadImage]);

  // ── Mouse Down ──────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { activeTool, strokeColor, fillColor, strokeWidth, opacity, roughness } = useCanvasStore.getState();
    const point = getCanvasPoint(e);
    const screen = getScreenPoint(e);

    // Middle click / Alt+drag → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    let currentTool = activeTool;

    // Ctrl+Click from ANY tool -> Try to select an object and switch to Select tool
    if ((e.ctrlKey || e.metaKey) && activeTool !== 'select') {
      const { selectedElementIds } = useCanvasStore.getState();
      const prevSelection = [...selectedElementIds];
      store.setActiveTool('select');
      store.selectElements(prevSelection);
      currentTool = 'select';
    }

    if (currentTool === 'select') {
      const { elements, selectedElementIds } = useCanvasStore.getState();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;

      // 1. If clicking on an ALREADY selected element precisely
      const hitSelected = [...elements].reverse().find((el) => selectedElementIds.includes(el.id) && isPointInElement(point, el));
      if (hitSelected) {
        if (isAdditive) {
          store.selectElement(hitSelected.id, true);
          return;
        }
        isMoving.current = true;
        lastPoint.current = point;
        return;
      }

      // 2. If clicking anywhere inside the unified bounding box of current selection
      if (!isAdditive) {
        const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
        if (selectedElements.length > 0) {
          const bb = getMultiBoundingBox(selectedElements);
          const isInsideSelectionBox =
            point.x >= bb.x - 4 &&
            point.x <= bb.x + bb.width + 4 &&
            point.y >= bb.y - 4 &&
            point.y <= bb.y + bb.height + 4;

          if (isInsideSelectionBox) {
            isMoving.current = true;
            lastPoint.current = point;
            return;
          }
        }
      }

      // 3. Otherwise, check if clicking a completely new element
      const hitNew = [...elements].reverse().find((el) => isPointInElement(point, el));
      if (hitNew) {
        store.selectElement(hitNew.id, isAdditive);
        isMoving.current = true;
        lastPoint.current = point;
      } else {
        // Drag-select on empty canvas (unless shift/ctrl/cmd — then keep existing selection)
        if (!isAdditive) store.clearSelection();
        isDragSelecting.current = true;
        selectionRect.current = { startX: point.x, startY: point.y, x: point.x, y: point.y, width: 0, height: 0 };
        lastPoint.current = screen;
      }
      return;
    }

    if (currentTool === 'text') { showTextInput(point); return; }
    if (currentTool === 'image') { triggerImageUpload(); return; }

    // Drawing tools (including eraser)
    isDrawing.current = true;
    store.clearSelection();
    const id = uuidv4();
    const seed = Math.floor(Math.random() * 10000);

    const newEl: CanvasElement = {
      id,
      type: activeTool as CanvasElement['type'],
      x: point.x, y: point.y, width: 0, height: 0,
      points: (activeTool === 'pencil' || activeTool === 'eraser') ? [point] : undefined,
      strokeColor, fillColor, strokeWidth, opacity, roughness, seed,
    };
    store.addElement(newEl);
    currentElementId.current = id;
    lastPoint.current = point;
  }, [getCanvasPoint, getScreenPoint, store]);

  // ── Mouse Move ──────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    if (isPanning.current) {
      const dx = e.clientX - lastPoint.current.x;
      const dy = e.clientY - lastPoint.current.y;
      const { panX, panY } = useCanvasStore.getState();
      store.setPan(panX + dx, panY + dy);
      lastPoint.current = { x: e.clientX, y: e.clientY };
      render();
      return;
    }

    // Drag-select rubber band
    if (isDragSelecting.current && selectionRect.current) {
      const sr = selectionRect.current;
      const newWidth = point.x - sr.startX;
      const newHeight = point.y - sr.startY;
      selectionRect.current = {
        startX: sr.startX,
        startY: sr.startY,
        x: newWidth >= 0 ? sr.startX : point.x,
        y: newHeight >= 0 ? sr.startY : point.y,
        width: newWidth,
        height: newHeight,
      };
      render();
      return;
    }

    // Move selected elements
    if (isMoving.current) {
      const { selectedElementIds, elements } = useCanvasStore.getState();
      if (selectedElementIds.length === 0) return;

      const dx = point.x - lastPoint.current.x;
      const dy = point.y - lastPoint.current.y;
      lastPoint.current = point;

      selectedElementIds.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (!el) return;
        if (el.type === 'pencil' && el.points) {
          store.updateElement(id, {
            x: el.x + dx,
            y: el.y + dy,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          });
        } else {
          store.updateElement(id, { x: el.x + dx, y: el.y + dy });
        }
      });
      render();
      return;
    }

    // Active drawing
    if (!isDrawing.current || !currentElementId.current) return;
    const id = currentElementId.current;
    const { elements } = useCanvasStore.getState();
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    if (el.type === 'pencil' || el.type === 'eraser') {
      store.updateElement(id, { points: [...(el.points || []), point] });
    } else {
      store.updateElement(id, { width: point.x - el.x, height: point.y - el.y });
    }
    render();
  }, [getCanvasPoint, store, render]);

  // ── Mouse Up ────────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (isDragSelecting.current && selectionRect.current) {
      const sr = selectionRect.current;
      const { elements } = useCanvasStore.getState();
      const normalizedRect = {
        x: Math.min(sr.startX, sr.startX + sr.width),
        y: Math.min(sr.startY, sr.startY + sr.height),
        width: Math.abs(sr.width),
        height: Math.abs(sr.height),
      };
      if (normalizedRect.width > 5 || normalizedRect.height > 5) {
        const hit = elements.filter((el) => isElementInSelectionRect(el, normalizedRect));

        // Additive check for MouseEvent
        let isAdditive = false;
        if ('shiftKey' in e) {
          isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
        }

        if (isAdditive) {
          // Additive
          const { selectedElementIds } = useCanvasStore.getState();
          const combined = [...new Set([...selectedElementIds, ...hit.map((el) => el.id)])];
          store.selectElements(combined);
        } else {
          store.selectElements(hit.map((el) => el.id));
        }
      }
      selectionRect.current = null;
    }

    if (isDrawing.current || isMoving.current) store.pushHistory();
    isDrawing.current = false;
    isMoving.current = false;
    isPanning.current = false;
    isDragSelecting.current = false;
    currentElementId.current = null;
    render();
  }, [store, render]);

  // ── Wheel (zoom) ────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { zoom, panX, panY } = useCanvasStore.getState();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
    const factor = newZoom / zoom;
    store.setZoom(newZoom);
    store.setPan(mouseX - factor * (mouseX - panX), mouseY - factor * (mouseY - panY));
    render();
  }, [canvasRef, store, render]);

  // ── Text Input ──────────────────────────────────────────────────────────────
  const showTextInput = useCallback((point: Point) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { zoom, panX, panY } = useCanvasStore.getState();
    const screenX = point.x * zoom + panX + rect.left;
    const screenY = point.y * zoom + panY + rect.top;

    if (textareaRef.current) textareaRef.current.remove();
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      position:fixed;left:${screenX}px;top:${screenY}px;
      font-size:${20 * zoom}px;font-family:'Caveat',cursive;
      background:transparent;border:2px dashed #7C3AED;border-radius:4px;
      outline:none;color:${useCanvasStore.getState().strokeColor};
      resize:none;min-width:120px;min-height:40px;padding:4px 8px;
      z-index:1000;line-height:1.3;overflow:hidden;
    `;
    textarea.placeholder = 'Type here...';
    document.body.appendChild(textarea);
    textarea.focus();
    textareaRef.current = textarea;

    const commit = () => {
      const text = textarea.value.trim();
      if (text) {
        const id = uuidv4();
        const { strokeColor, opacity } = useCanvasStore.getState();
        const fontSize = 20;
        const lines = text.split('\n');
        const w = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6;
        const h = lines.length * fontSize * 1.3;
        store.addElement({ id, type: 'text', x: point.x, y: point.y, width: w, height: h, text, fontSize, fontFamily: 'Caveat', strokeColor, fillColor: 'transparent', strokeWidth: 1, opacity, roughness: 0, seed: 0 });
        store.pushHistory();
        render();
      }
      textarea.remove();
      textareaRef.current = null;
    };
    textarea.addEventListener('blur', commit);
    textarea.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { textarea.remove(); textareaRef.current = null; } });
  }, [canvasRef, store, render]);

  // ── Image Upload ────────────────────────────────────────────────────────────
  const triggerImageUpload = useCallback(() => {
    store.setActiveTool('select');
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const imageData = await readImageFile(file);
      const img = new Image();
      img.onload = () => {
        const id = uuidv4();
        const maxW = 400;
        const ratio = Math.min(maxW / img.width, 300 / img.height);
        const { zoom, panX, panY } = useCanvasStore.getState();
        const canvas = canvasRef.current!;
        const x = (canvas.width / 2 - panX) / zoom - (img.width * ratio) / 2;
        const y = (canvas.height / 2 - panY) / zoom - (img.height * ratio) / 2;
        store.addElement({ id, type: 'image', x, y, width: img.width * ratio, height: img.height * ratio, imageData, strokeColor: 'transparent', fillColor: 'transparent', strokeWidth: 0, opacity: 1, roughness: 0, seed: 0 });
        store.pushHistory();
        render();
      };
      img.src = imageData;
    };
    input.click();
  }, [canvasRef, store, render]);

  // ── Canvas resize ───────────────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    if (gridCanvasRef?.current) {
      gridCanvasRef.current.width = gridCanvasRef.current.offsetWidth;
      gridCanvasRef.current.height = gridCanvasRef.current.offsetHeight;
    }

    render();
  }, [canvasRef, gridCanvasRef, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef, handleWheel, resizeCanvas]);

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(() => render());
    return unsubscribe;
  }, [render]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, render, triggerImageUpload };
}
