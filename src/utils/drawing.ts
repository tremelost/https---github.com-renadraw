import rough from 'roughjs';
import { CanvasElement, Point, SelectionRect } from '../types/canvas.types';

export function getRoughCanvas(canvas: HTMLCanvasElement) {
  return rough.canvas(canvas);
}

export function measureTextDimensions(text: string, fontSize: number) {
  const lines = text.split('\n');
  const width = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6;
  const height = lines.length * fontSize * 1.3;
  return { width, height };
}

export function getSmoothedPoints(points: Point[], strokeWidth = 2): Point[] {
  if (points.length <= 2) return points;

  const minDistance = Math.max(1.5, strokeWidth * 0.35);
  const filtered: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const current = points[i];
    const distance = Math.hypot(current.x - prev.x, current.y - prev.y);

    if (distance >= minDistance || i === points.length - 1) {
      filtered.push(current);
    }
  }

  if (filtered.length <= 2) return filtered;

  return filtered.map((point, index) => {
    if (index === 0 || index === filtered.length - 1) return point;

    const previous = filtered[index - 1];
    const next = filtered[index + 1];
    return {
      x: point.x * 0.5 + (previous.x + next.x) * 0.25,
      y: point.y * 0.5 + (previous.y + next.y) * 0.25,
    };
  });
}

export function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  strokeWidth: number
) {
  const smoothedPoints = getSmoothedPoints(points, strokeWidth);
  if (smoothedPoints.length === 0) return;

  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);

  if (smoothedPoints.length === 1) {
    ctx.lineTo(smoothedPoints[0].x + 0.01, smoothedPoints[0].y + 0.01);
    ctx.stroke();
    return;
  }

  if (smoothedPoints.length === 2) {
    ctx.lineTo(smoothedPoints[1].x, smoothedPoints[1].y);
    ctx.stroke();
    return;
  }

  for (let i = 1; i < smoothedPoints.length - 1; i++) {
    const current = smoothedPoints[i];
    const next = smoothedPoints[i + 1];
    const midpoint = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    };
    ctx.quadraticCurveTo(current.x, current.y, midpoint.x, midpoint.y);
  }

  const lastPoint = smoothedPoints[smoothedPoints.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
  ctx.stroke();
}

export function drawElement(
  rc: ReturnType<typeof rough.canvas>,
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
) {
  const { x, y, width, height, strokeColor, fillColor, strokeWidth, roughness, seed, opacity } = element;

  ctx.save();
  ctx.globalAlpha = opacity;

  const options = {
    stroke: strokeColor,
    fill: fillColor === 'transparent' ? undefined : fillColor,
    strokeWidth,
    roughness,
    seed,
    fillStyle: 'hachure' as const,
    hachureGap: 8,
  };

  switch (element.type) {
    case 'rectangle':
      rc.rectangle(x, y, width, height, options);
      break;

    case 'ellipse':
      rc.ellipse(x + width / 2, y + height / 2, Math.abs(width), Math.abs(height), options);
      break;

    case 'diamond': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      rc.polygon([[cx, y], [x + width, cy], [cx, y + height], [x, cy]], options);
      break;
    }

    case 'line':
      rc.line(x, y, x + width, y + height, options);
      break;

    case 'arrow': {
      rc.line(x, y, x + width, y + height, options);
      const angle = Math.atan2(height, width);
      const arrowLen = 16 + strokeWidth * 2;
      const arrowAngle = Math.PI / 6;
      const tip = { x: x + width, y: y + height };
      const left = { x: tip.x - arrowLen * Math.cos(angle - arrowAngle), y: tip.y - arrowLen * Math.sin(angle - arrowAngle) };
      const right = { x: tip.x - arrowLen * Math.cos(angle + arrowAngle), y: tip.y - arrowLen * Math.sin(angle + arrowAngle) };
      rc.polygon([[tip.x, tip.y], [left.x, left.y], [right.x, right.y]], { ...options, fill: strokeColor, fillStyle: 'solid' });
      break;
    }

    case 'pencil':
      if (element.points && element.points.length > 1) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        drawSmoothPath(ctx, element.points, strokeWidth);
      }
      break;

    case 'text':
      if (element.text) {
        const fontSize = element.fontSize || 20;
        const family = element.fontFamily || 'Caveat';
        const fallback = family === 'Inter' ? 'sans-serif' : 'cursive';
        ctx.font = `${fontSize}px "${family}", ${fallback}`;
        ctx.fillStyle = strokeColor;
        ctx.textBaseline = 'top';
        element.text.split('\n').forEach((line, i) => {
          ctx.fillText(line, x, y + i * (fontSize * 1.3));
        });
      }
      break;

    case 'image':
      // Images rendered via preloaded cache in useCanvas
      break;
  }

  ctx.restore();
}

/** Draw individual selection handles for a single element */
export function drawSingleSelection(ctx: CanvasRenderingContext2D, element: CanvasElement) {
  const padding = 2;
  const bb = getBoundingBox(element);

  ctx.save();
  ctx.strokeStyle = '#7C3AED';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(bb.x - padding, bb.y - padding, bb.width + padding * 2, bb.height + padding * 2);
  ctx.setLineDash([]);

  const handleSize = 8;
  const hx = [bb.x - padding, bb.x - padding + (bb.width + padding * 2) / 2, bb.x - padding + (bb.width + padding * 2)];
  const hy = [bb.y - padding, bb.y - padding + (bb.height + padding * 2) / 2, bb.y - padding + (bb.height + padding * 2)];
  const positions = [
    [hx[0], hy[0]], [hx[1], hy[0]], [hx[2], hy[0]],
    [hx[0], hy[1]], [hx[2], hy[1]],
    [hx[0], hy[2]], [hx[1], hy[2]], [hx[2], hy[2]],
  ];
  positions.forEach(([px, py]) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 1.5;
    ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
  });
  ctx.restore();
}

/** Draw a unified bounding box around multiple selected elements */
export function drawMultiSelection(ctx: CanvasRenderingContext2D, elements: CanvasElement[]) {
  if (elements.length === 0) return;
  const padding = 4;

  // Individual dashed outlines (subtle)
  elements.forEach((el) => {
    const bb = getBoundingBox(el);
    ctx.save();
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(bb.x - 2, bb.y - 2, bb.width + 4, bb.height + 4);
    ctx.setLineDash([]);
    ctx.restore();
  });

  // Unified outer bounding box
  const allBBs = elements.map(getBoundingBox);
  const minX = Math.min(...allBBs.map((b) => b.x));
  const minY = Math.min(...allBBs.map((b) => b.y));
  const maxX = Math.max(...allBBs.map((b) => b.x + b.width));
  const maxY = Math.max(...allBBs.map((b) => b.y + b.height));

  ctx.save();
  ctx.strokeStyle = '#7C3AED';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2);
  ctx.setLineDash([]);

  // Count badge
  const label = `${elements.length} selected`;
  ctx.font = 'bold 11px Nunito, sans-serif';
  const tw = ctx.measureText(label).width;
  const bx = minX - padding;
  const by = minY - padding - 22;
  ctx.fillStyle = '#7C3AED';
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + 16, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 8, by + 10);
  ctx.restore();
}

/** Draw the drag-to-select rubber-band rectangle (in screen space, called outside transform) */
export function drawSelectionRect(ctx: CanvasRenderingContext2D, rect: SelectionRect) {
  const { x, y, width, height } = rect;
  ctx.save();
  ctx.fillStyle = 'rgba(124, 58, 237, 0.08)';
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
  ctx.restore();
}

export function getBoundingBox(element: CanvasElement) {
  if (element.type === 'pencil' && element.points && element.points.length > 0) {
    const xs = element.points.map((p) => p.x);
    const ys = element.points.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  return {
    x: Math.min(element.x, element.x + element.width),
    y: Math.min(element.y, element.y + element.height),
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

/** Get unified bounding box of multiple elements */
export function getMultiBoundingBox(elements: CanvasElement[]) {
  const bbs = elements.map(getBoundingBox);
  const minX = Math.min(...bbs.map((b) => b.x));
  const minY = Math.min(...bbs.map((b) => b.y));
  const maxX = Math.max(...bbs.map((b) => b.x + b.width));
  const maxY = Math.max(...bbs.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function isPointInElement(point: Point, element: CanvasElement, customTolerance?: number): boolean {
  const bb = getBoundingBox(element);
  // Increase base tolerance to 15 for easier selecting without hitting the exact line
  const tolerance = customTolerance !== undefined ? customTolerance : Math.max(55, element.strokeWidth * 3);

  if (element.type === 'pencil' && element.points) {
    return element.points.some((p, i) => {
      if (i === 0) return false;
      const prev = element.points![i - 1];
      return distToSegment(point, prev, p) < tolerance;
    });
  }
  if (element.type === 'line' || element.type === 'arrow') {
    const p1 = { x: element.x, y: element.y };
    const p2 = { x: element.x + element.width, y: element.y + element.height };
    return distToSegment(point, p1, p2) < tolerance;
  }
  return (
    point.x >= bb.x - tolerance &&
    point.x <= bb.x + bb.width + tolerance &&
    point.y >= bb.y - tolerance &&
    point.y <= bb.y + bb.height + tolerance
  );
}

/** Check if element's bounding box overlaps a selection rectangle */
export function isElementInSelectionRect(
  element: CanvasElement,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const bb = getBoundingBox(element);
  const rx = Math.min(rect.x, rect.x + rect.width);
  const ry = Math.min(rect.y, rect.y + rect.height);
  const rw = Math.abs(rect.width);
  const rh = Math.abs(rect.height);
  return !(bb.x > rx + rw || bb.x + bb.width < rx || bb.y > ry + rh || bb.y + bb.height < ry);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number,
  isDark: boolean
) {
  const gridSize = 24 * zoom;
  const color = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  ctx.save();
  ctx.fillStyle = color;
  const startX = (panX % gridSize) - gridSize;
  const startY = (panY % gridSize) - gridSize;
  for (let x = startX; x < width + gridSize; x += gridSize) {
    for (let y = startY; y < height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
