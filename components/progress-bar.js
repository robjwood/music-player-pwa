/**
 * PROGRESS BAR COMPONENT
 *
 * Web Component that enhances HTML seek bar with interactivity.
 * HTML structure (progress bar, time display) is defined in index.html.
 * This component wraps that HTML and adds event handling and state management.
 *
 * Usage in HTML:
 *   <progress-bar class="progress-bar-container">
 *     <div class="progress-bar">
 *       <div class="progress-fill"></div>
 *       <input type="range" class="seek-bar" min="0" max="100" value="0">
 *     </div>
 *     <div class="time-display">
 *       <span class="current-time">0:00</span>
 *       <span class="duration">0:00</span>
 *     </div>
 *   </progress-bar>
 *
 * Events emitted:
 *   - seek: { detail: { time: seconds } } - When user seeks
 *
 * Methods:
 *   updateProgress(currentTime, duration) - Update the progress display
 */

class ProgressBar extends HTMLElement {
  constructor() {
    super();
    this.isDragging = false;
  }

  connectedCallback() {
    // Cache DOM elements
    this.progressFill = this.querySelector('.progress-fill');
    this.seekBar = this.querySelector('.seek-bar');
    this.currentTimeEl = this.querySelector('.current-time');
    this.durationEl = this.querySelector('.duration');

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for user interaction
   */
  setupEventListeners() {
    if (!this.seekBar) return;

    this.seekBar.addEventListener('mousedown', () => {
      this.isDragging = true;
    });

    this.seekBar.addEventListener('touchstart', () => {
      this.isDragging = true;
    });

    this.seekBar.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.handleSeek();
    });

    this.seekBar.addEventListener('touchend', () => {
      this.isDragging = false;
      this.handleSeek();
    });

    this.seekBar.addEventListener('input', () => {
      if (this.isDragging) {
        this.handleSeek();
      }
    });
  }

  /**
   * Handle when the user seeks
   */
  handleSeek() {
    if (!this.seekBar) return;
    const newTime = parseFloat(this.seekBar.value);

    // Emit custom event so the app can seek the audio
    this.dispatchEvent(new CustomEvent('seek', {
      detail: { time: newTime },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Update the progress display
   * @param {number} currentTime - Current playback time in seconds
   * @param {number} duration - Total duration in seconds
   */
  updateProgress(currentTime, duration) {
    // Calculate progress as a percentage
    const progressPercent = (currentTime / duration) * 100;

    // Update visual progress
    if (this.progressFill) {
      this.progressFill.style.width = `${progressPercent}%`;
    }

    // Update time display
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = this.formatTime(currentTime);
    }
    if (this.durationEl) {
      this.durationEl.textContent = this.formatTime(duration);
    }

    // Update seek bar (but not while dragging)
    if (!this.isDragging && this.seekBar) {
      this.seekBar.max = duration || 100;
      this.seekBar.value = currentTime || 0;
    }
  }

  /**
   * Format seconds into a readable time string (e.g., "3:24")
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

customElements.define('progress-bar', ProgressBar);
