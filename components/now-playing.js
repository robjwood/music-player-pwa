/**
 * NOW PLAYING COMPONENT
 *
 * Displays the currently playing track title and artist from metadata or filename
 * Includes buttons to add track to playlists
 *
 * Usage:
 *   <now-playing-info></now-playing-info>
 *
 * Events emitted:
 *   - add-to-liked: { detail: { track } }
 *   - add-to-playlist: { detail: { track } }
 *
 * Methods:
 *   setTrack(file, track) - Update the displayed track (track metadata optional)
 *   clearTrack() - Clear the display
 */

class NowPlayingInfo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentFile = null;
    this.currentTrack = null;
  }

  connectedCallback() {
    console.log('🎵 NowPlayingInfo connectedCallback - rendering');
    this.render();
    this.attachButtonListeners();
    console.log('🎵 NowPlayingInfo rendered with buttons:', this.shadowRoot.querySelectorAll('button').length);
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

        .container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .track-info {
          flex: 1;
          min-width: 0;
        }

        .track-title {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #e0e0e0;
        }

        .track-artist {
          font-size: 0.9rem;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .buttons {
          display: flex;
          gap: 0.4rem;
          flex-shrink: 0;
        }

        button {
          background: #2a2a2a;
          border: 1px solid #444;
          color: #888;
          padding: 0.4rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          min-width: 36px;
        }

        button:hover {
          background: #333;
          border-color: #666;
        }

        .like-btn:hover {
          color: #e74c3c;
        }

        .add-btn:hover {
          color: #4a9eff;
        }

        button:active {
          background: #1a1a1a;
          border-color: #4a9eff;
        }
      </style>

      <div class="container">
        <div class="track-info" style="cursor: pointer; flex: 1;">
          <div class="track-title" title="Click to scroll to track in playlist">No track selected</div>
          <div class="track-artist">Select a file to start</div>
        </div>
        <div class="buttons">
          <button class="like-btn" title="Add to Liked playlist">★</button>
          <button class="add-btn" title="Add to playlist">+</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach click listeners to buttons and track info
   */
  attachButtonListeners() {
    // Click on track info to scroll to it in the playlist
    const trackInfo = this.shadowRoot.querySelector('.track-info');
    if (trackInfo) {
      trackInfo.addEventListener('click', () => {
        if (this.currentTrack) {
          this.dispatchEvent(new CustomEvent('scroll-to-track', {
            bubbles: true,
            composed: true
          }));
        }
      });
    }

    const likeBtn = this.shadowRoot.querySelector('.like-btn');
    const addBtn = this.shadowRoot.querySelector('.add-btn');

    if (likeBtn) {
      likeBtn.addEventListener('click', () => {
        if (this.currentTrack) {
          this.dispatchEvent(new CustomEvent('add-to-liked', {
            detail: { track: this.currentTrack },
            bubbles: true,
            composed: true
          }));
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.currentTrack) {
          this.dispatchEvent(new CustomEvent('add-to-playlist', {
            detail: { track: this.currentTrack },
            bubbles: true,
            composed: true
          }));
        }
      });
    }
  }

  /**
   * Update the display with a new track
   * @param {File} file - The audio file object
   * @param {Track|null} track - Optional track metadata
   */
  setTrack(file, track = null) {
    console.log('🎵 setTrack called with file:', file?.name, 'buttons before:', this.shadowRoot?.querySelectorAll('button').length);

    if (!file) {
      this.clearTrack();
      return;
    }

    // Ensure shadow DOM is initialized
    if (!this.shadowRoot || this.shadowRoot.innerHTML === '') {
      console.log('🎵 Shadow DOM missing, re-rendering');
      this.render();
      this.attachButtonListeners();
    }

    this.currentFile = file;
    this.currentTrack = track || {
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      track: '',
      year: '',
      duration: 0
    };

    const titleEl = this.shadowRoot.querySelector('.track-title');
    const artistEl = this.shadowRoot.querySelector('.track-artist');

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
    console.log('🎵 clearTrack called, buttons before:', this.shadowRoot?.querySelectorAll('button').length);

    this.currentFile = null;
    this.currentTrack = null;

    // Ensure shadow DOM is initialized
    if (!this.shadowRoot || this.shadowRoot.innerHTML === '') {
      console.log('🎵 Shadow DOM missing in clearTrack, re-rendering');
      this.render();
      this.attachButtonListeners();
    }

    const titleEl = this.shadowRoot.querySelector('.track-title');
    const artistEl = this.shadowRoot.querySelector('.track-artist');

    if (titleEl && artistEl) {
      titleEl.textContent = 'No track selected';
      artistEl.textContent = 'Select a file to start';
    }
  }
}

// Register the custom element
customElements.define('now-playing-info', NowPlayingInfo);
