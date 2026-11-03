/**
 * Pathfinding with No-Crossing Wire Enforcement (Section 4.1 & 9.4a)
 */

export function bfsPath(startSquare, targetSquare, blockedSquares, width, height) {
  if (startSquare === targetSquare) return [startSquare];

  const total = width * height;
  const queue = [startSquare];
  const visited = new Uint8Array(total);
  const parent = new Int32Array(total).fill(-1);

  visited[startSquare] = 1;
  let head = 0;
  let found = false;

  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cy > 0 ? curr - width : -1,          // up
      cx < width - 1 ? curr + 1 : -1,      // right
      cy < height - 1 ? curr + width : -1, // down
      cx > 0 ? curr - 1 : -1               // left
    ];

    for (const next of neighbors) {
      if (next === -1) continue;
      if (visited[next]) continue;
      if (blockedSquares.has(next) && next !== targetSquare) continue;

      visited[next] = 1;
      parent[next] = curr;
      if (next === targetSquare) {
        found = true;
        break;
      }
      queue.push(next);
    }
    if (found) break;
  }

  if (!found) return null;

  const path = [];
  let curr = targetSquare;
  while (curr !== -1) {
    path.push(curr);
    curr = parent[curr];
  }
  path.reverse();
  return path;
}

export function bfsDistance(startSquare, targetSquare, blockedSquares, width, height) {
  const p = bfsPath(startSquare, targetSquare, blockedSquares, width, height);
  return p ? p.length - 1 : Infinity;
}
