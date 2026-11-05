/**
 * NetCity v2.0 - Drawing Utilities
 * Single Responsibility: Canvas path geometry, round-rect polyfills,
 * cable ribbon rendering, and packet interpolation along paths.
 */

/**
 * Draw a rounded rectangle on a canvas context (handles polyfill if ctx.roundRect is missing)
 */
export function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

/**
 * Draw a styled cable ribbon along a sequence of grid squares with soft drop shadow.
 */
export function drawWirePath(ctx, path, color, sz, isFaded = false, gridW = 24) {
  if (!path || path.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Soft Drop Shadow (Mini Motorways depth)
  if (!isFaded) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = Math.max(5, sz * 0.24);
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const sq = path[i];
      const cx = (sq % gridW) * sz + sz / 2;
      const cy = Math.floor(sq / gridW) * sz + sz / 2 + 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // 2. Main Cable Ribbon Body
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, sz * 0.18);
  if (isFaded) {
    ctx.setLineDash([sz * 0.2, sz * 0.15]); // Red dashed beyond limit
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const sq = path[i];
    const cx = (sq % gridW) * sz + sz / 2;
    const cy = Math.floor(sq / gridW) * sz + sz / 2;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Calculate the interpolated 2D point along a discrete multi-square path for a packet progress in [0, 1].
 */
export function getPathPoint(path, progress, sz, gridW = 24) {
  if (!path || path.length < 2) {
    const sq = (path && path[0]) || 0;
    return {
      x: (sq % gridW) * sz + sz / 2,
      y: Math.floor(sq / gridW) * sz + sz / 2
    };
  }
  const totalSegs = path.length - 1;
  const idx = Math.min(Math.floor(progress * totalSegs), totalSegs - 1);
  const t = (progress * totalSegs) - idx;

  const a = path[idx];
  const b = path[idx + 1];

  const ax = (a % gridW) * sz + sz / 2;
  const ay = Math.floor(a / gridW) * sz + sz / 2;
  const bx = (b % gridW) * sz + sz / 2;
  const by = Math.floor(b / gridW) * sz + sz / 2;

  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}
