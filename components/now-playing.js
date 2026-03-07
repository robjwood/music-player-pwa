/**
 * NOW PLAYING INFO COMPONENT
 *
 * Displays the currently playing track title and artist.
 * HTML is defined in index.html; this class enhances it with interactivity.
 *
 * Usage:
 *   const nowPlayingInfo = new NowPlayingInfo(document.querySelector('#nowPlayingInfo'));
 *
 * Events emitted:
 *   - scroll-to-track: {} - Emitted when user clicks on track info
 *
 * Methods:
 *   setTrack(file, track) - Update the displayed track
 *   clearTrack() - Clear the display
 */

class NowPlayingInfo {
  constructor(container) {
    this.container = container;
    this.currentTrack = null;

    // Cache DOM elements
    this.titleEl = this.container.querySelector('.track-title');
    this.artistEl = this.container.querySelector('.track-artist');

    // Add click handler to scroll to track
    this.container.addEventListener('click', () => {
      if (this.currentTrack) {
        this.container.dispatchEvent(new CustomEvent('scroll-to-track', {
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

    const title = track?.title || file.name.replace(/\.[^/.]+$/, '');
    const artist = track?.artist || 'Unknown Artist';

    this.titleEl.textContent = title;
    this.artistEl.textContent = artist;
  }

  /**
   * Clear the track display
   */
  clearTrack() {
    this.currentTrack = null;

    this.titleEl.textContent = 'No track selected';
    this.artistEl.textContent = 'Select a file to start';
  }
}
