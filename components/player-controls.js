/**
 * PLAYER CONTROLS COMPONENT
 *
 * Manages play, pause, next, previous, loop, and shuffle buttons.
 * HTML is defined in index.html; this class enhances it with interactivity.
 *
 * Usage:
 *   const playerControls = new PlayerControls(document.querySelector('#playerControls'));
 *
 * Events emitted:
 *   - play-pause: {}
 *   - next-track: {}
 *   - previous-track: {}
 *   - toggle-loop: {}
 *   - toggle-shuffle: {}
 *
 * Methods:
 *   setPlayState(isPlaying) - Update button to show play or pause
 *   setLoopState(isLooping) - Update loop button highlight state
 *   setShuffleState(isShuffling) - Update shuffle button highlight state
 */

class PlayerControls {
  constructor(container) {
    this.container = container;
    this.isPlaying = false;
    this.isLooping = false;
    this.isShuffling = false;

    // Cache DOM elements
    this.playBtn = this.container.querySelector('.play-btn');
    this.nextBtn = this.container.querySelector('.next-btn');
    this.prevBtn = this.container.querySelector('.prev-btn');
    this.loopBtn = this.container.querySelector('.loop-btn');
    this.shuffleBtn = this.container.querySelector('.shuffle-btn');

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for button clicks
   */
  setupEventListeners() {
    this.playBtn.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('play-pause', {
        bubbles: true,
        composed: true,
      }));
    });

    this.nextBtn.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('next-track', {
        bubbles: true,
        composed: true,
      }));
    });

    this.prevBtn.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('previous-track', {
        bubbles: true,
        composed: true,
      }));
    });

    this.loopBtn.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('toggle-loop', {
        bubbles: true,
        composed: true,
      }));
    });

    this.shuffleBtn.addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('toggle-shuffle', {
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

    if (isPlaying) {
      this.playBtn.textContent = '⏸';
    } else {
      this.playBtn.textContent = '▶';
    }
  }

  /**
   * Update the loop button to show the correct state
   * @param {boolean} isLooping - Whether loop is enabled
   */
  setLoopState(isLooping) {
    this.isLooping = isLooping;

    if (isLooping) {
      this.loopBtn.classList.add('active');
    } else {
      this.loopBtn.classList.remove('active');
    }
  }

  /**
   * Update the shuffle button to show the correct state
   * @param {boolean} isShuffling - Whether shuffle is enabled
   */
  setShuffleState(isShuffling) {
    this.isShuffling = isShuffling;

    if (isShuffling) {
      this.shuffleBtn.classList.add('active');
    } else {
      this.shuffleBtn.classList.remove('active');
    }
  }
}
