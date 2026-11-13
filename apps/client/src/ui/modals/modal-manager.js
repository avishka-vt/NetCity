/**
 * NetCity v2.0 - Modal Manager
 * Single Responsibility: Controls modal overlay backdrop lifecycle:
 * mounting, displaying, hiding, and backdrop dismissal.
 */

export class ModalManager {
  constructor(modalEl, options = {}) {
    this.modalEl = modalEl;
    this.onOpen = options.onOpen || null;
    this.onClose = options.onClose || null;
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        // If clicking a dedicated close button or close icon
        if (e.target.closest('.nc-modal-close-icon, #nc-modal-x-close, #nc-modal-close, [data-modal-close]')) {
          this.close();
          return;
        }
        // If clicking the dark backdrop outside any card (and card is not non-dismissible)
        if (e.target === this.modalEl) {
          const isNonDismissible = this.modalEl.querySelector('.nc-level-complete-card, .nc-card-fail, .nc-briefing-card, #nc-briefing-phone');
          if (!isNonDismissible) {
            this.close();
          }
        }
      });
    }
  }

  show(htmlContent, onMount) {
    if (!this.modalEl) return;
    this.modalEl.style.display = 'flex';
    this.modalEl.innerHTML = htmlContent;
    if (typeof this.onOpen === 'function') {
      this.onOpen();
    }
    if (typeof onMount === 'function') {
      onMount(this.modalEl);
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.modalEl.innerHTML = '';
      if (typeof this.onClose === 'function') {
        this.onClose();
      }
    }
  }

  isOpen() {
    return Boolean(this.modalEl && this.modalEl.style.display !== 'none' && this.modalEl.style.display !== '');
  }
}
