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
 *   - add-to-liked: {} - Add current track to "Liked" playlist
 *   - add-to-playlist: { detail: { track } } - Add current track to any playlist
 *
 * Methods:
 *   setTrack(file, track) - Update the displayed track (track metadata optional)
 *   clearTrack() - Clear the display
 */

class NowPlayingInfo extends HTMLElement {
  constructor() {
    super();
    console.log('NowPlayingInfo constructor() called');
    this.attachShadow({ mode: 'open' });
    this.currentFile = null;
    this.currentTrack = null;
  }

  connectedCallback() {
    console.log('NowPlayingInfo connectedCallback() called');
    console.log('shadowRoot exists:', !!this.shadowRoot);
    this.render();
    console.log('After render - shadowRoot innerHTML length:', this.shadowRoot.innerHTML.length);
    console.log('shadowRoot innerHTML:', this.shadowRoot.innerHTML);
    this.setupEventListeners();
    const buttons = this.shadowRoot.querySelectorAll('button');
    console.log('Shadow DOM buttons found:', buttons.length);
    buttons.forEach((btn, idx) => console.log(`  Button ${idx}:`, btn.textContent, btn.className));
  }

  setupEventListeners() {
    const likeBtn = this.shadowRoot.querySelector('.like-btn');
    const addBtn = this.shadowRoot.querySelector('.add-btn');

    if (likeBtn) {
      likeBtn.addEventListener('click', () => {
        if (this.currentFile && this.currentTrack) {
          this.dispatchEvent(new CustomEvent('add-to-liked', {
            detail: { track: this.currentTrack },
            bubbles: true,
            composed: true
          }));
          // Visual feedback: briefly change star color
          likeBtn.style.color = '#4a9eff';
          setTimeout(() => {
            likeBtn.style.color = '';
          }, 300);
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.currentFile && this.currentTrack) {
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
   * Render the component's HTML and styles
   */
  render() {
    console.log('NowPlayingInfo render() called');
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 1rem;
                }

                .track-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .track-text {
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

                .track-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-shrink: 0;
                    align-items: center;
                    margin-left: 0.5rem;
                }

                .like-btn, .add-btn {
                    background: #2a2a2a;
                    border: 1px solid #444;
                    color: #888;
                    font-size: 1rem;
                    cursor: pointer;
                    padding: 0.4rem 0.6rem;
                    border-radius: 4px;
                    transition: all 0.2s;
                    min-width: 36px;
                    text-align: center;
                }

                .like-btn:hover {
                    background: #333;
                    border-color: #666;
                    color: #e74c3c;
                }

                .add-btn:hover {
                    background: #333;
                    border-color: #666;
                    color: #4a9eff;
                }

                .like-btn:active, .add-btn:active {
                    background: #1a1a1a;
                    border-color: #4a9eff;
                }
            </style>

            <div class="track-info">
                <div class="track-text">
                    <div class="track-title">No track selected</div>
                    <div class="track-artist">Select a file to start</div>
                </div>
                <div class="track-buttons">
                    <button class="like-btn" title="Add to Liked playlist (★)">★</button>
                    <button class="add-btn" title="Add to playlist (+)">+</button>
                </div>
            </div>
        `;
  }

  /**
   * Update the display with a new track
   * @param {File} file - The audio file object
   * @param {Track|null} track - Optional track metadata with { title, artist, album, track }
   */
  setTrack(file, track = null) {
    if (!file) {
      this.clearTrack();
      return;
    }

    // Store current track for button actions
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

    // Use metadata if available, otherwise fall back to filename
    const title = track?.title || file.name.replace(/\.[^/.]+$/, '');
    const artist = track?.artist || 'Unknown Artist';

    titleEl.textContent = title;
    artistEl.textContent = artist;
  }

  /**
   * Clear the track display
   */
  clearTrack() {
    this.currentFile = null;
    this.currentTrack = null;

    const titleEl = this.shadowRoot.querySelector('.track-title');
    const artistEl = this.shadowRoot.querySelector('.track-artist');

    titleEl.textContent = 'No track selected';
    artistEl.textContent = 'Select a file to start';
  }
}

// Register the custom element
customElements.define('now-playing-info', NowPlayingInfo);
