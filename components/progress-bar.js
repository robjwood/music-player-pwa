/**
 * PROGRESS BAR COMPONENT
 *
 * Manages playback progress display and seeking.
 * HTML is defined in index.html; this class enhances it with interactivity.
 *
 * Usage:
 *   const progressBar = new ProgressBar(document.querySelector('#progressBar'));
 *
 * Events emitted:
 *   - seek: { detail: { time: seconds } }
 *
 * Methods:
 *   updateProgress(currentTime, duration) - Update the progress display
 */

class ProgressBar {
  constructor(container) {
    this.container = container;
    this.isDragging = false;

    // Cache DOM elements
    this.progressFill = this.container.querySelector('.progress-fill');
    this.seekBar = this.container.querySelector('.seek-bar');
    this.currentTimeEl = this.container.querySelector('.current-time');
    this.durationEl = this.container.querySelector('.duration');

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for user interaction
   */
  setupEventListeners() {
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
    const newTime = parseFloat(this.seekBar.value);

    // Emit custom event so the app can seek the audio
    this.container.dispatchEvent(new CustomEvent('seek', {
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
    this.progressFill.style.width = `${progressPercent}%`;

    // Update time display
    this.currentTimeEl.textContent = this.formatTime(currentTime);
    this.durationEl.textContent = this.formatTime(duration);

    // Update seek bar (but not while dragging)
    if (!this.isDragging) {
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
