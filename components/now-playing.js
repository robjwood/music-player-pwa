/**
 * NOW PLAYING INFO COMPONENT
 *
 * Web Component that enhances HTML buttons with interactivity.
 * HTML structure (buttons, text) is defined in index.html.
 * This component wraps that HTML and adds event handling and state management.
 *
 * Usage in HTML:
 *   <now-playing-info>
 *     <div class="track-title">No track selected</div>
 *     <div class="track-artist">Select a file to start</div>
 *     <button id="likeTrackBtn" class="now-playing-btn">★</button>
 *     <button id="addTrackBtn" class="now-playing-btn">+</button>
 *   </now-playing-info>
 *
 * Events emitted:
 *   - scroll-to-track: {} - When clicking track info
 *   - add-to-liked: {detail: {track}} - When clicking like button
 *   - add-to-playlist: {detail: {track}} - When clicking add button
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
    // Cache DOM elements
    this.titleEl = this.querySelector('.track-title');
    this.artistEl = this.querySelector('.track-artist');
    this.likeBtn = this.querySelector('#likeTrackBtn');
    this.addBtn = this.querySelector('#addTrackBtn');

    console.log('[NowPlayingInfo] Connected. Buttons found:', {
      like: !!this.likeBtn,
      add: !!this.addBtn
    });

    // Add click handler to info area to scroll to track
    this.addEventListener('click', (e) => {
      // Only trigger on info area, not button clicks
      if (!e.target.classList.contains('now-playing-btn') && this.currentTrack) {
        this.dispatchEvent(new CustomEvent('scroll-to-track', {
          bubbles: true,
          composed: true
        }));
      }
    });

    // Add like button handler
    if (this.likeBtn) {
      this.likeBtn.addEventListener('click', (e) => {
        console.log('[NowPlayingInfo] Like button clicked');
        e.stopPropagation();
        if (this.currentTrack) {
          console.log('[NowPlayingInfo] Dispatching add-to-liked event', this.currentTrack);
          this.dispatchEvent(new CustomEvent('add-to-liked', {
            detail: { track: this.currentTrack },
            bubbles: true,
            composed: true
          }));
        } else {
          console.log('[NowPlayingInfo] No current track to add to liked');
        }
      });
    } else {
      console.log('[NowPlayingInfo] Like button not found!');
    }

    // Add to playlist button handler
    if (this.addBtn) {
      this.addBtn.addEventListener('click', (e) => {
        console.log('[NowPlayingInfo] Add button clicked');
        e.stopPropagation();
        if (this.currentTrack) {
          console.log('[NowPlayingInfo] Dispatching add-to-playlist event', this.currentTrack);
          this.dispatchEvent(new CustomEvent('add-to-playlist', {
            detail: { track: this.currentTrack },
            bubbles: true,
            composed: true
          }));
        } else {
          console.log('[NowPlayingInfo] No current track to add to playlist');
        }
      });
    } else {
      console.log('[NowPlayingInfo] Add button not found!');
    }
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

    if (this.titleEl) this.titleEl.textContent = title;
    if (this.artistEl) this.artistEl.textContent = artist;
  }

  /**
   * Clear the track display
   */
  clearTrack() {
    this.currentTrack = null;

    if (this.titleEl) this.titleEl.textContent = 'No track selected';
    if (this.artistEl) this.artistEl.textContent = 'Select a file to start';
  }
}

customElements.define('now-playing-info', NowPlayingInfo);
