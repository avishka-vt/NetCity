/**
 * NetCity v2.0 - Camera & Viewport Coordinate System
 * Single Responsibility: Translates between screen coordinates and grid coordinates,
 * manages pan offsets, zoom factors, and adaptive canvas viewport framing.
 */

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
    this.baseSquareSize = 40;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
  }

  /**
   * Fit camera viewport to canvas dimensions and grid size with comfortable margins
   * @param {number} availW
   * @param {number} availH
   * @param {number} gridW
   * @param {number} gridH
   * @param {number|Object} padding
   * @param {number} minSquareSize
   */
  fit(availW, availH, gridW, gridH, padding = 16, minSquareSize = 12) {
    if (!gridW || !gridH || !availW || !availH) return;
    let padTop = 16;
    let padBottom = 16;
    let padLeft = 16;
    let padRight = 16;

    if (typeof padding === 'object' && padding !== null) {
      padTop = padding.top ?? 16;
      padBottom = padding.bottom ?? 16;
      padLeft = padding.left ?? 16;
      padRight = padding.right ?? 16;
    } else {
      const p = Math.min(padding, Math.floor(Math.min(availW, availH) * 0.05));
      padTop = padBottom = padLeft = padRight = p;
    }

    const effW = Math.max(100, availW - padLeft - padRight);
    const effH = Math.max(100, availH - padTop - padBottom);
    const sz = Math.floor(Math.min(effW / gridW, effH / gridH));
    this.baseSquareSize = Math.max(minSquareSize, sz);
    this.zoom = 1.0;

    const totalW = gridW * this.baseSquareSize;
    const totalH = gridH * this.baseSquareSize;
    this.x = padLeft + Math.floor((effW - totalW) / 2);
    this.y = padTop + Math.floor((effH - totalH) / 2);
  }

  /**
   * Convert client viewport screen coordinates to grid coordinates
   * @param {number} clientX
   * @param {number} clientY
   * @param {DOMRect} canvasRect
   * @param {number} gridW
   * @param {number} gridH
   * @returns {{ x: number, y: number, square: number }}
   */
  screenToGrid(clientX, clientY, canvasRect, gridW, gridH) {
    const sz = this.baseSquareSize * this.zoom;
    const x = Math.floor((clientX - canvasRect.left - this.x) / sz);
    const y = Math.floor((clientY - canvasRect.top - this.y) / sz);
    return {
      x,
      y,
      square: y * gridW + x
    };
  }

  /**
   * Get center coordinate of a grid square in local world units (unzoomed or zoomed)
   */
  getSquareCenter(square, gridW, sz) {
    const effectiveSz = sz || (this.baseSquareSize * this.zoom);
    const x = (square % gridW) * effectiveSz + effectiveSz / 2;
    const y = Math.floor(square / gridW) * effectiveSz + effectiveSz / 2;
    return { x, y };
  }

  /**
   * Adjust zoom factor
   * @param {number} factor (> 1 for zoom in, < 1 for zoom out)
   */
  adjustZoom(factor) {
    this.zoom = Math.max(0.5, Math.min(2.5, this.zoom * factor));
  }

  startPan(clientX, clientY) {
    this.isPanning = true;
    this.panStart = { x: clientX - this.x, y: clientY - this.y };
  }

  updatePan(clientX, clientY) {
    if (!this.isPanning) return;
    this.x = clientX - this.panStart.x;
    this.y = clientY - this.panStart.y;
  }

  endPan() {
    this.isPanning = false;
  }
}
