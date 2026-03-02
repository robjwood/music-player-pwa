/**
 * PLAYER CONTROLS COMPONENT
 *
 * Play, Pause, Next, and Previous buttons
 *
 * Usage:
 *   <player-controls></player-controls>
 *
 * Events emitted:
 *   - play-pause: {}
 *   - next-track: {}
 *   - previous-track: {}
 *
 * Methods:
 *   setPlayState(isPlaying) - Update button to show play or pause
 */

class PlayerControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isPlaying = false;
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
          }

          .controls {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
          }

          .control-btn {
            background-color: #2a2a2a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 0.4rem 1.2rem;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.2s;
            flex: 1;
            max-width: 52px;
          }

          .control-btn:hover {
            background-color: #333;
            border-color: #555;
          }

          .control-btn:active {
            background-color: #252525;
          }

          .control-btn--primary {
            background-color: #4a9eff;
            border-color: #4a9eff;
            color: #000;
            font-weight: 600;
          }

          .control-btn--primary:hover {
            background-color: #5aafff;
            border-color: #5aafff;
          }

          .control-btn--primary:active {
            background-color: #3a8eef;
            border-color: #3a8eef;
          }
      </style>

      <div class="controls">
          <button class="control-btn prev-btn" aria-label="Previous track (Left Arrow)">
              ⏮
          </button>
          <button class="control-btn control-btn--primary play-btn" aria-label="Play/Pause (Space)">
              ►
          </button>
          <button class="control-btn next-btn" aria-label="Next track (Right Arrow)">
              ⏭
          </button>
      </div>
    `;
  }

  /**
   * Set up event listeners for button clicks
   */
  setupEventListeners() {
    const playBtn = this.shadowRoot.querySelector('.play-btn');
    const nextBtn = this.shadowRoot.querySelector('.next-btn');
    const prevBtn = this.shadowRoot.querySelector('.prev-btn');

    playBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('play-pause', {
        bubbles: true,
        composed: true,
      }));
    });

    nextBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('next-track', {
        bubbles: true,
        composed: true,
      }));
    });

    prevBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('previous-track', {
        bubbles: true,
        composed: true,
      }));
    });
  }

  /**
   * Update the play button to show the correct state
   * @param {boolean} isPlaying - Whether audio is currently playing
   */
  setPlayState(isPlaying) {
    this.isPlaying = isPlaying;
    const playBtn = this.shadowRoot.querySelector('.play-btn');

    if (isPlaying) {
      playBtn.textContent = '⏸';
    } else {
      playBtn.textContent = '▶';
    }
  }
}

// Register the custom element
customElements.define('player-controls', PlayerControls);
