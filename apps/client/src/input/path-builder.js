/**
 * NetCity v2.0 - Path Builder
 * Single Responsibility: Manages dynamic cable path construction during drag-and-drop,
 * supporting cardinal step validation, smooth backtracking, and live simulation validity queries.
 */

export class PathBuilder {
  constructor(simProvider) {
    this.simProvider = simProvider;
    this.isDragging = false;
    this.dragBuildingId = null;
    this.dragSourceId = null;
    this.dragSourceType = 'building'; // 'building' | 'device'
    this.dragPath = [];
    this.dragValidity = { valid: true, message: '' };
  }

  /**
   * Start constructing a new cable drag path
   */
  start(startSquare, sourceId, sourceType = 'building', getActiveWireTypeFn) {
    this.isDragging = true;
    this.dragSourceType = sourceType;
    this.dragSourceId = sourceId;
    if (sourceType === 'building') {
      this.dragBuildingId = sourceId;
    } else {
      this.dragBuildingId = null;
    }
    this.dragPath = [startSquare];
    this.checkValidity(getActiveWireTypeFn);
  }

  /**
   * Process a pointer movement to a candidate grid square
   * @param {number} square - target square index
   * @param {number} gridW - grid width
   * @param {number} gridH - grid height
   * @param {Function} getActiveWireTypeFn
   */
  addStep(square, gridW, gridH, getActiveWireTypeFn) {
    if (!this.isDragging || this.dragPath.length === 0) return;

    const path = this.dragPath;
    const lastSq = path[path.length - 1];
    if (square === lastSq) return;

    // Backtracking: dragging back to the penultimate square pops the step
    if (path.length > 1 && square === path[path.length - 2]) {
      path.pop();
      this.checkValidity(getActiveWireTypeFn);
      return;
    }

    // Cardinal adjacency check
    const lx = lastSq % gridW;
    const ly = Math.floor(lastSq / gridW);
    const x = square % gridW;
    const y = Math.floor(square / gridW);

    if (Math.abs(x - lx) + Math.abs(y - ly) === 1) {
      if (!path.includes(square)) {
        path.push(square);
        this.checkValidity(getActiveWireTypeFn);
      }
    }
  }

  /**
   * Query the simulation to evaluate the validity of the current candidate path
   */
  checkValidity(getActiveWireTypeFn) {
    const sim = this.simProvider();
    if (!sim || this.dragPath.length < 1) return;

    const sourceId = this.dragSourceType === 'device' ? this.dragSourceId : this.dragBuildingId;
    const wireType = typeof getActiveWireTypeFn === 'function' ? getActiveWireTypeFn() : 'twisted_pair';
    const res = sim.validateWire(sourceId, this.dragPath, wireType, this.dragSourceType || 'building');
    this.dragValidity = res;
    return res;
  }

  /**
   * Reset the builder state
   */
  reset() {
    this.isDragging = false;
    this.dragPath = [];
    this.dragBuildingId = null;
    this.dragSourceId = null;
    this.dragSourceType = 'building';
    this.dragValidity = { valid: true, message: '' };
  }
}
