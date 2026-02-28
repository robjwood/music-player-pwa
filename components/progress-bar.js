/**
 * PROGRESS BAR COMPONENT
 *
 * Shows playback progress and allows seeking
 *
 * Usage:
 *   <progress-bar></progress-bar>
 *
 * Events emitted:
 *   - seek: { detail: { time: seconds } }
 *
 * Methods:
 *   updateProgress(currentTime, duration) - Update the progress display
 */

class ProgressBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isDragging = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * Render the component's HTML and styles
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 1rem;
                }

                .progress-container {
                    margin-bottom: 1rem;
                }

                .progress-bar {
                    position: relative;
                    height: 24px;
                    background-color: #1a1a1a;
                    border-radius: 4px;
                    margin-bottom: 0.5rem;
                    cursor: pointer;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background-color: #4a9eff;
                    width: 0%;
                    border-radius: 4px;
                    transition: width 0.1s;
                    pointer-events: none;
                }

                .seek-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 10;
                }

                .time-display {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                    color: #888;
                }
            </style>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                    <input
                        type="range"
                        class="seek-bar"
                        min="0"
                        max="100"
                        value="0"
                        aria-label="Seek bar"
                    >
                </div>
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="duration">0:00</span>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners for user interaction
     */
    setupEventListeners() {
        const seekBar = this.shadowRoot.querySelector('.seek-bar');

        seekBar.addEventListener('mousedown', () => {
            this.isDragging = true;
        });

        seekBar.addEventListener('touchstart', () => {
            this.isDragging = true;
        });

        seekBar.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.handleSeek();
        });

        seekBar.addEventListener('touchend', () => {
            this.isDragging = false;
            this.handleSeek();
        });

        seekBar.addEventListener('input', () => {
            if (this.isDragging) {
                this.handleSeek();
            }
        });
    }

    /**
     * Handle when the user seeks
     */
    handleSeek() {
        const seekBar = this.shadowRoot.querySelector('.seek-bar');
        const newTime = parseFloat(seekBar.value);

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
        const progressFill = this.shadowRoot.querySelector('.progress-fill');
        const seekBar = this.shadowRoot.querySelector('.seek-bar');
        const currentTimeEl = this.shadowRoot.querySelector('.current-time');
        const durationEl = this.shadowRoot.querySelector('.duration');

        // Calculate progress as a percentage
        const progressPercent = (currentTime / duration) * 100;

        // Update visual progress
        progressFill.style.width = `${progressPercent}%`;

        // Update time display
        currentTimeEl.textContent = this.formatTime(currentTime);
        durationEl.textContent = this.formatTime(duration);

        // Update seek bar (but not while dragging)
        if (!this.isDragging) {
            seekBar.max = duration || 100;
            seekBar.value = currentTime || 0;
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

// Register the custom element
customElements.define('progress-bar', ProgressBar);
