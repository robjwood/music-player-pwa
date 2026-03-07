/**
 * NOW PLAYING INFO COMPONENT
 *
 * Simple component that displays the currently playing track title and artist.
 * Buttons are in the HTML and enhanced with event listeners.
 *
 * Usage:
 *   <now-playing-info></now-playing-info>
 *
 * Methods:
 *   setTrack(file, track) - Update the displayed track
 *   clearTrack() - Clear the display
 */

class NowPlayingInfo extends HTMLElement {
  constructor() {
    super();
    this.currentTrack = null;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Render initial HTML
   */
  render() {
    this.innerHTML = `
      <div class="track-title" title="Click to scroll to track in playlist">No track selected</div>
      <div class="track-artist">Select a file to start</div>
    `;

    this.style.display = 'block';
    this.style.marginBottom = '1rem';
    this.style.cursor = 'pointer';

    // Add click handler to scroll to track
    this.addEventListener('click', () => {
      if (this.currentTrack) {
        this.dispatchEvent(new CustomEvent('scroll-to-track', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Update the display with a new track
   * @param {File} file - The audio file object
   * @param {Track|null} track - Optional track metadata
   */
  setTrack(file, track = null) {
    if (!file) {
      this.clearTrack();
      return;
    }

    this.currentTrack = track || {
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      track: '',
      year: '',
      duration: 0
    };

    const titleEl = this.querySelector('.track-title');
    const artistEl = this.querySelector('.track-artist');

    if (titleEl && artistEl) {
      const title = track?.title || file.name.replace(/\.[^/.]+$/, '');
      const artist = track?.artist || 'Unknown Artist';

      titleEl.textContent = title;
      artistEl.textContent = artist;
    }
  }

  /**
   * Clear the track display
   */
  clearTrack() {
    this.currentTrack = null;

    const titleEl = this.querySelector('.track-title');
    const artistEl = this.querySelector('.track-artist');

    if (titleEl && artistEl) {
      titleEl.textContent = 'No track selected';
      artistEl.textContent = 'Select a file to start';
    }
  }
}

// Register the custom element
customElements.define('now-playing-info', NowPlayingInfo);
