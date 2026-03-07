/**
 * PLAYER CONTROLS COMPONENT
 *
 * Web Component that enhances HTML buttons with interactivity.
 * HTML structure (buttons) is defined in index.html.
 * This component wraps that HTML and adds event handling and state management.
 *
 * Usage in HTML:
 *   <player-controls>
 *     <div class="controls">
 *       <button class="control-btn shuffle-btn">🔀</button>
 *       <button class="control-btn prev-btn">⏮</button>
 *       <button class="control-btn control-btn--primary play-btn">▶</button>
 *       <button class="control-btn next-btn">⏭</button>
 *       <button class="control-btn loop-btn">🔁</button>
 *     </div>
 *   </player-controls>
 *
 * Events emitted:
 *   - play-pause: {} - When clicking play/pause
 *   - next-track: {} - When clicking next
 *   - previous-track: {} - When clicking previous
 *   - toggle-loop: {} - When clicking loop
 *   - toggle-shuffle: {} - When clicking shuffle
 *
 * Methods:
 *   setPlayState(isPlaying) - Update button to show play or pause
 *   setLoopState(isLooping) - Update loop button highlight state
 *   setShuffleState(isShuffling) - Update shuffle button highlight state
 */

class PlayerControls extends HTMLElement {
  constructor() {
    super();
    this.isPlaying = false;
    this.isLooping = false;
    this.isShuffling = false;
  }

  connectedCallback() {
    // Cache DOM elements
    this.playBtn = this.querySelector('.play-btn');
    this.nextBtn = this.querySelector('.next-btn');
    this.prevBtn = this.querySelector('.prev-btn');
    this.loopBtn = this.querySelector('.loop-btn');
    this.shuffleBtn = this.querySelector('.shuffle-btn');

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for button clicks
   */
  setupEventListeners() {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('play-pause', {
          bubbles: true,
          composed: true,
        }));
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('next-track', {
          bubbles: true,
          composed: true,
        }));
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('previous-track', {
          bubbles: true,
          composed: true,
        }));
      });
    }

    if (this.loopBtn) {
      this.loopBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('toggle-loop', {
          bubbles: true,
          composed: true,
        }));
      });
    }

    if (this.shuffleBtn) {
      this.shuffleBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('toggle-shuffle', {
          bubbles: true,
          composed: true,
        }));
      });
    }
  }

  /**
   * Update the play button to show the correct state
   * @param {boolean} isPlaying - Whether audio is currently playing
   */
  setPlayState(isPlaying) {
    this.isPlaying = isPlaying;

    if (this.playBtn) {
      this.playBtn.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  /**
   * Update the loop button to show the correct state
   * @param {boolean} isLooping - Whether loop is enabled
   */
  setLoopState(isLooping) {
    this.isLooping = isLooping;

    if (this.loopBtn) {
      this.loopBtn.classList.toggle('active', isLooping);
    }
  }

  /**
   * Update the shuffle button to show the correct state
   * @param {boolean} isShuffling - Whether shuffle is enabled
   */
  setShuffleState(isShuffling) {
    this.isShuffling = isShuffling;

    if (this.shuffleBtn) {
      this.shuffleBtn.classList.toggle('active', isShuffling);
    }
  }
}

customElements.define('player-controls', PlayerControls);
