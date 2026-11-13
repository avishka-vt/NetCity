/**
 * Chief Juno Mentor UI Component
 * Renders Chief Juno's portrait and dialogue lines cleanly inside modals or as a
 * non-blocking bottom-left field-radio card during gameplay.
 */

export const CHIEF_JUNO_PORTRAIT = './assets/images/ui/chief_juno.png';

export function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render an inline Chief Juno mentor card suitable for embedding inside briefings,
 * level win/over modals, or chapter overviews.
 */
export function renderJunoInlineCard(lines, opts = {}) {
  const lineList = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  if (lineList.length === 0) return '';

  const {
    badge = 'CHIEF JUNO · MENTOR',
    variant = 'default',
    compact = false,
    footerHtml = ''
  } = opts;

  return `
    <div class="nc-juno-card nc-juno-inline nc-juno-${escapeHtml(variant)}${compact ? ' nc-juno-compact' : ''}">
      <div class="nc-juno-avatar-wrap">
        <img src="${CHIEF_JUNO_PORTRAIT}" alt="Chief Juno" class="nc-juno-avatar" />
      </div>
      <div class="nc-juno-body">
        <div class="nc-juno-speaker">${escapeHtml(badge)}</div>
        <div class="nc-juno-lines">
          ${lineList.map(line => `<p class="nc-juno-line">${escapeHtml(line)}</p>`).join('')}
        </div>
        ${footerHtml ? `<div class="nc-juno-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Floating non-blocking field-comms overlay for live events, special moments,
 * and interactive tutorial prompts (docked bottom-left so Bit remains bottom-right).
 */
export class JunoCommsOverlay {
  constructor(parentEl) {
    this.parentEl = parentEl;
    this.rootEl = null;
    this._hideTimer = null;
  }

  _ensureEl() {
    if (this.rootEl || !this.parentEl) return this.rootEl;
    const doc = this.parentEl.ownerDocument || document;
    const el = doc.createElement('div');
    el.id = 'nc-juno-comms';
    el.className = 'nc-juno-comms';
    el.style.display = 'none';
    this.parentEl.appendChild(el);
    this.rootEl = el;
    return el;
  }

  /**
   * Show one or more lines from Chief Juno in the bottom-left comms card.
   * @param {string|string[]} lines
   * @param {object} opts
   */
  show(lines, opts = {}) {
    const lineList = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
    if (lineList.length === 0) return;

    const el = this._ensureEl();
    if (!el) return;

    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }

    const {
      badge = 'CHIEF JUNO',
      variant = 'info',
      durationMs = 6500,
      dismissible = true,
      controlsHtml = ''
    } = opts;

    el.innerHTML = `
      <div class="nc-juno-card nc-juno-floating nc-juno-${escapeHtml(variant)}">
        <div class="nc-juno-avatar-wrap">
          <img src="${CHIEF_JUNO_PORTRAIT}" alt="Chief Juno" class="nc-juno-avatar" />
        </div>
        <div class="nc-juno-body">
          <div class="nc-juno-header-row">
            <span class="nc-juno-speaker">${escapeHtml(badge)}</span>
            ${dismissible ? '<button type="button" class="nc-juno-close" aria-label="Dismiss Chief Juno message">&times;</button>' : ''}
          </div>
          <div class="nc-juno-lines">
            ${lineList.map(line => `<p class="nc-juno-line">${escapeHtml(line)}</p>`).join('')}
          </div>
          ${controlsHtml ? `<div class="nc-juno-controls">${controlsHtml}</div>` : ''}
        </div>
      </div>
    `;
    el.style.display = 'block';

    const closeBtn = el.querySelector('.nc-juno-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        this.hide();
      });
    }

    if (durationMs > 0) {
      this._hideTimer = setTimeout(() => {
        this.hide();
      }, durationMs);
    }
  }

  hide() {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (this.rootEl) {
      this.rootEl.style.display = 'none';
      this.rootEl.innerHTML = '';
    }
  }

  destroy() {
    this.hide();
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    this.rootEl = null;
  }
}
