import { CanvasElement } from '../types/canvas.types';
import rough from 'roughjs';
import { drawElement, getMultiBoundingBox } from './drawing';

export async function exportCanvasToPNG(
  elements: CanvasElement[],
  isDark: boolean,
  filename = 'renadraw-export.png'
) {
  if (elements.length === 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1920;
    tempCanvas.height = 1080;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.fillStyle = isDark ? '#1A1B1E' : '#FAFAF8';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    const link = document.createElement('a');
    link.download = filename;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    return;
  }

  const padding = 40;
  const bb = getMultiBoundingBox(elements);
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.max(bb.width + padding * 2, 100);
  tempCanvas.height = Math.max(bb.height + padding * 2, 100);
  const ctx = tempCanvas.getContext('2d')!;
  const rc = rough.canvas(tempCanvas);

  ctx.fillStyle = isDark ? '#1A1B1E' : '#FAFAF8';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const imagePromises = elements
    .filter((el) => el.type === 'image' && el.imageData)
    .map((el) => {
      return new Promise<{ id: string; img: HTMLImageElement }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ id: el.id, img });
        img.src = el.imageData!;
      });
    });

  const loadedImages = await Promise.all(imagePromises);
  const imageMap = new Map(loadedImages.map((item) => [item.id, item.img]));

  ctx.save();
  ctx.translate(-bb.x + padding, -bb.y + padding);

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
      const img = imageMap.get(el.id);
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

  ctx.restore();

  const link = document.createElement('a');
  link.download = filename;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

export async function saveToRenadrawFile(elements: CanvasElement[], filename = 'scene.renadraw') {
  const data = JSON.stringify(elements, null, 2);
  const blob = new Blob([data], { type: 'application/json' });

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Renadraw File',
          accept: { 'application/json': ['.renadraw'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Failed to save file', err);
    }
    return;
  }

  // Fallback
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function loadFromRenadrawFile(): Promise<CanvasElement[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.renadraw';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const elements = JSON.parse(reader.result as string) as CanvasElement[];
          resolve(elements);
        } catch (error) {
          reject(new Error('Invalid .renadraw file format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
