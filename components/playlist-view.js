/**
 * PLAYLIST VIEW COMPONENT
 *
 * Displays tracks grouped by album with CMUS-style formatting.
 * Each track shows title + track number, with album headers.
 *
 * Usage:
 *   <playlist-view></playlist-view>
 *
 * Events emitted:
 *   - track-selected: { detail: { index: number } }
 *
 * Methods:
 *   setTracks(tracks) - Set the Track[] to display (already sorted)
 *   setCurrentTrack(index) - Mark a track as currently playing
 */

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseTrackNumber(trackStr) {
  const n = parseInt((trackStr || '').split('/')[0], 10);
  return isNaN(n) ? 0 : n;
}

class PlaylistView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tracks = [];
    this.currentIndex = -1;
    this.searchQuery = '';
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
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }

                .search-bar {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border-bottom: 1px solid #2a2a2a;
                    position: sticky;
                    top: 0;
                    background: #1a1a1a;
                    z-index: 1;
                }

                .search-input {
                    flex: 1;
                    background: #252525;
                    border: 1px solid #333;
                    color: #e0e0e0;
                    font-family: inherit;
                    font-size: 0.9rem;
                    padding: 0.4rem 0.6rem;
                    outline: none;
                }

                .search-input:focus {
                    border-color: #4a9eff;
                }

                .search-clear {
                    background: transparent;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 0.2rem 0.4rem;
                    display: none;
                }

                .search-clear:hover {
                    color: #aaa;
                }

                .playlist {
                    display: flex;
                    flex-direction: column;
                    padding: 0.5rem;
                    position: relative;
                }

                .playlist-empty {
                    padding: 2rem 1rem;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }

                .album-header {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.6rem 1.4rem 0.2rem;
                    color: #888;
                    font-size: 0.78rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    border-top: 1px solid #2a2a2a;
                    margin-top: 0.5rem;
                }

                .album-header:first-child {
                    border-top: none;
                    margin-top: 0;
                }

                .album-header-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .album-header-duration {
                    color: #555;
                    font-size: 0.78rem;
                    margin-left: 1rem;
                    white-space: nowrap;
                }

                .playlist-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.4rem 1.4rem;
                    cursor: pointer;
                    transition: background 0.1s;
                    user-select: none;
                }

                .playlist-item:hover {
                    background-color: #2a2a2a;
                }

                .playlist-item.active {
                    background-color: #333;
                    font-weight: 600;
                }

                .playlist-item.active::before {
                  content: '▶ ';
                  color: #4a9eff;
                  font-size: 0.8rem;
                  position: absolute;
                  left: 16px;
                }

                .playlist-item.active .track-label {
                  color: #4a9eff;
                }

                .track-label {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: #e0e0e0;
                    font-size: 0.9rem;
                }

                .track-meta {
                    color: #666;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    margin-left: 1rem;
                }

                .add-playlist-btn {
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 0.25rem 0.5rem;
                    margin-left: 0.5rem;
                    transition: color 0.2s;
                    flex-shrink: 0;
                }

                .add-playlist-btn:hover {
                    color: #4a9eff;
                }

                .playlist-item.unavailable {
                    opacity: 0.5;
                    cursor: not-allowed;
                    color: #666;
                }

                .playlist-item.unavailable:hover {
                    background-color: transparent;
                }

                .playlist-item.unavailable .track-label {
                    color: #666;
                }

                .playlist-item.unavailable::after {
                    content: ' ⚠ not available';
                    color: #ff8888;
                    font-size: 0.75rem;
                    margin-left: 0.5rem;
                    white-space: nowrap;
                }
            </style>

            <div class="search-bar">
                <input
                    class="search-input"
                    type="text"
                    placeholder="Search tracks…"
                    aria-label="Search tracks"
                >
                <button class="search-clear" aria-label="Clear search">✕</button>
            </div>
            <div class="playlist"></div>
        `;
  }

  /**
   * Set up event listeners for search and clear button
   */
  setupEventListeners() {
    const searchInput = this.shadowRoot.querySelector('.search-input');
    const searchClear = this.shadowRoot.querySelector('.search-clear');

    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      searchClear.style.display = this.searchQuery ? 'block' : 'none';
      this.renderPlaylist();
    });

    searchClear.addEventListener('click', () => {
      this.searchQuery = '';
      searchInput.value = '';
      searchClear.style.display = 'none';
      this.renderPlaylist();
    });
  }

  /**
   * Set the tracks to display (Track[] with metadata)
   * @param {Track[]} tracks - Array of Track objects (already sorted)
   */
  setTracks(tracks) {
    this.tracks = tracks;
    this.searchQuery = '';
    const searchInput = this.shadowRoot.querySelector('.search-input');
    const searchClear = this.shadowRoot.querySelector('.search-clear');
    if (searchInput) {
      searchInput.value = '';
      searchClear.style.display = 'none';
    }
    this.renderPlaylist();
  }

  /**
   * Set the currently playing track
   * @param {number} index - Index of the current track
   */
  setCurrentTrack(index) {
    this.currentIndex = index;
    this.renderPlaylist();
    this.scrollCurrentTrackIntoView();
  }

  /**
   * Render the playlist items grouped by album
   */
  renderPlaylist() {
    const playlistEl = this.shadowRoot.querySelector('.playlist');
    playlistEl.innerHTML = '';

    // Show empty state if no tracks
    if (this.tracks.length === 0) {
      playlistEl.innerHTML = '<div class="playlist-empty">Select files to start playing</div>';
      return;
    }

    // Filter by search query
    const filtered = this.tracks.filter(t =>
      !this.searchQuery ||
      t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    // Show "no results" message if search yielded no matches
    if (filtered.length === 0 && this.searchQuery) {
      playlistEl.innerHTML = '<div class="playlist-empty">No tracks match your search</div>';
      return;
    }

    // Group by album (preserving order from input)
    const albums = [];
    const seenAlbums = new Set();

    filtered.forEach(track => {
      if (!seenAlbums.has(track.album)) {
        albums.push({
          name: track.album,
          tracks: filtered.filter(t => t.album === track.album),
        });
        seenAlbums.add(track.album);
      }
    });

    // Render each album with its tracks
    albums.forEach(album => {
      // Album header
      const totalDuration = album.tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
      const durationStr = formatDuration(totalDuration);

      const header = document.createElement('div');
      header.className = 'album-header';
      header.innerHTML = `
                <span class="album-header-name">${this.escapeHtml(album.name)}</span>
                <span class="album-header-duration">${durationStr}</span>
            `;
      playlistEl.appendChild(header);

      // Track rows
      album.tracks.forEach(track => {
        const originalIndex = this.tracks.indexOf(track);
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.setAttribute('data-index', originalIndex);

        // Mark currently playing track
        if (originalIndex === this.currentIndex) {
          item.classList.add('active');
        }

        // Mark unavailable tracks
        if (track.unavailable) {
          item.classList.add('unavailable');
        }

        // Format track label: "01. Track Title" or just "Track Title"
        const trackNum = parseTrackNumber(track.track);
        const trackLabel = trackNum > 0
          ? `${String(trackNum).padStart(2, '0')}. ${this.escapeHtml(track.title)}`
          : this.escapeHtml(track.title);

        // Format meta: "year  duration" or just "duration" if no year
        let trackMeta = formatDuration(track.duration);
        if (track.year) {
          trackMeta = `${track.year}  ${trackMeta}`;
        }

        item.innerHTML = `
                    <span class="track-label">${trackLabel}</span>
                    <span class="track-meta">${trackMeta}</span>
                    <button class="add-playlist-btn" title="Add to playlist">+</button>
                `;

        // Click handler for track selection
        item.addEventListener('click', (e) => {
          // Don't select if clicking the button
          if (e.target.classList.contains('add-playlist-btn')) {
            return;
          }
          // Don't select if track is unavailable
          if (track.unavailable) {
            alert('This track is not available. Please load the folder containing this file.');
            return;
          }
          this.dispatchEvent(new CustomEvent('track-selected', {
            detail: { index: originalIndex },
            bubbles: true,
            composed: true,
          }));
        });

        // Click handler for add-to-playlist button
        const addBtn = item.querySelector('.add-playlist-btn');
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent('add-track-to-playlist', {
            detail: { track, index: originalIndex },
            bubbles: true,
            composed: true,
          }));
        });

        playlistEl.appendChild(item);
      });
    });
  }

  /**
   * Scroll the currently playing track into view
   */
  scrollCurrentTrackIntoView() {
    const activeItem = this.shadowRoot.querySelector('.playlist-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Escape HTML special characters (XSS protection)
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('playlist-view', PlaylistView);
