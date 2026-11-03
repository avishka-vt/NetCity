export function createMockDOM() {
  const windowListeners = new Map();
  const documentListeners = new Map();

  let nextRafId = 1;
  const activeRafs = new Set();

  class ClassList {
    constructor(el) {
      this.el = el;
      this.classes = new Set();
      if (el.className) {
        el.className.split(/\s+/).filter(Boolean).forEach(c => this.classes.add(c));
      }
    }
    add(...names) {
      names.forEach(n => this.classes.add(n));
      this.el.className = [...this.classes].join(' ');
    }
    remove(...names) {
      names.forEach(n => this.classes.delete(n));
      this.el.className = [...this.classes].join(' ');
    }
    toggle(name, force) {
      if (force === true) {
        this.classes.add(name);
      } else if (force === false) {
        this.classes.delete(name);
      } else if (this.classes.has(name)) {
        this.classes.delete(name);
      } else {
        this.classes.add(name);
      }
      this.el.className = [...this.classes].join(' ');
      return this.classes.has(name);
    }
    contains(name) {
      const current = this.el.className ? this.el.className.split(/\s+/).filter(Boolean) : [];
      return current.includes(name);
    }
  }

  class MockElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.className = '';
      this.id = '';
      this.style = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this._innerHTML = '';
      this.width = 800;
      this.height = 600;
      this.clientWidth = 800;
      this.clientHeight = 600;
      this.textContent = '';
      this.disabled = false;
      this.classList = new ClassList(this);
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(html) {
      this._innerHTML = html;
      this._parseElementsFromHtml(html);
    }

    _parseElementsFromHtml(html) {
      this.children = [];
      const tagMatches = [...html.matchAll(/<([a-zA-Z0-9]+)([^>]*)>/g)];

      for (const m of tagMatches) {
        const tag = m[1];
        const attrs = m[2];
        const el = new MockElement(tag);

        const idMatch = attrs.match(/id="([^"]+)"/);
        if (idMatch) el.id = idMatch[1];

        const classMatch = attrs.match(/class="([^"]+)"/);
        if (classMatch) {
          el.className = classMatch[1];
          el.classList = new ClassList(el);
        }

        const dataMatches = [...attrs.matchAll(/data-([a-zA-Z0-9_-]+)="([^"]*)"/g)];
        el.dataset = {};
        el._attributes = {};
        for (const dm of dataMatches) {
          const camelKey = dm[1].replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          el.dataset[camelKey] = dm[2];
          el._attributes[`data-${dm[1]}`] = dm[2];
        }

        el.getAttribute = (attr) => {
          if (attr === 'id') return el.id;
          if (attr === 'class') return el.className;
          if (el._attributes && el._attributes[attr] !== undefined) return el._attributes[attr];
          return null;
        };

        el.closest = (sel) => {
          if (sel.startsWith('.')) {
            const cls = sel.slice(1);
            if (el.classList.contains(cls)) return el;
          }
          return el;
        };

        el.parentNode = this;
        this.children.push(el);
      }
    }

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }

    remove() {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    }

    querySelector(selector) {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return this._findById(id);
      }
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        for (const child of this.children) {
          if (child.classList && child.classList.contains(cls)) {
            return child;
          }
        }
      }
      return new MockElement('div');
    }

    querySelectorAll(selector) {
      const results = [];
      const parts = selector.split(',').map(s => s.trim());
      for (const part of parts) {
        if (part.startsWith('.')) {
          const cls = part.slice(1);
          for (const child of this.children) {
            if (child.classList && child.classList.contains(cls)) {
              if (!results.includes(child)) results.push(child);
            }
          }
        }
      }
      return results;
    }

    _findById(id, createIfMissing = true) {
      if (this.id === id) return this;
      for (const child of this.children) {
        if (child.id === id) return child;
        if (child._findById) {
          const found = child._findById(id, false);
          if (found) return found;
        }
      }
      if (createIfMissing) {
        const el = new MockElement('div');
        el.id = id;
        el.parentNode = this;
        this.children.push(el);
        return el;
      }
      return null;
    }

    addEventListener(type, fn, opts) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      this.listeners.get(type).add(fn);
    }

    removeEventListener(type, fn, opts) {
      if (this.listeners.has(type)) {
        this.listeners.get(type).delete(fn);
        if (this.listeners.get(type).size === 0) {
          this.listeners.delete(type);
        }
      }
    }

    dispatchEvent(evt) {
      const handler = this[`on${evt.type}`];
      if (typeof handler === 'function') {
        handler(evt);
      }
      if (this.listeners.has(evt.type)) {
        for (const fn of this.listeners.get(evt.type)) {
          fn(evt);
        }
      }
      return true;
    }

    click() {
      this.dispatchEvent({ type: 'click' });
    }

    getContext(type) {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
        lineJoin: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        shadowColor: '',
        shadowBlur: 0,
        fillRect() {},
        strokeRect() {},
        clearRect() {},
        roundRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        arc() {},
        fill() {},
        fillText() {},
        setLineDash() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        rotate() {}
      };
    }

    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600
      };
    }
  }

  const documentBody = new MockElement('body');

  const mockDocument = {
    body: documentBody,
    createElement: (tag) => new MockElement(tag),
    addEventListener: (type, fn) => {
      if (!documentListeners.has(type)) documentListeners.set(type, new Set());
      documentListeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      if (documentListeners.has(type)) {
        documentListeners.get(type).delete(fn);
        if (documentListeners.get(type).size === 0) documentListeners.delete(type);
      }
    }
  };

  const mockWindow = {
    addEventListener: (type, fn) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      if (windowListeners.has(type)) {
        windowListeners.get(type).delete(fn);
        if (windowListeners.get(type).size === 0) windowListeners.delete(type);
      }
    },
    dispatchEvent: (evt) => {
      if (windowListeners.has(evt.type)) {
        for (const fn of windowListeners.get(evt.type)) {
          fn(evt);
        }
      }
      return true;
    },
    requestAnimationFrame: (cb) => {
      const id = nextRafId++;
      activeRafs.add(id);
      return id;
    },
    cancelAnimationFrame: (id) => {
      activeRafs.delete(id);
    }
  };

  return {
    window: mockWindow,
    document: mockDocument,
    windowListeners,
    documentListeners,
    activeRafs
  };
}
