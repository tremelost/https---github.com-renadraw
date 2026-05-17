import { CanvasElement } from '../types/canvas.types';

export function exportCanvasToPNG(
  _elements: CanvasElement[],
  isDark: boolean,
  filename = 'renadraw-export.png'
) {
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
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
