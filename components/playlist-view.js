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
    this.fullLibrary = [];  // Full library for global search (all tracks, not filtered)
    this.currentIndex = -1;
    this.searchQuery = '';
    this.playlistId = null;  // ID of current playlist (null if not viewing a playlist)
    this.renderBatchId = null;  // Track pending render batches
    this.searchSelectedArtist = null;  // Artist selected from search results
    this.searchSelectedAlbum = null;  // Album selected from search results
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

                .add-all-btn {
                    background: #4a9eff;
                    border: 1px solid #4a9eff;
                    color: #000;
                    padding: 0.4rem 0.8rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    white-space: nowrap;
                    transition: all 0.2s;
                }

                .add-all-btn:hover {
                    background: #5aafff;
                    border-color: #5aafff;
                }

                .add-all-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
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

                .delete-track-btn {
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 0.25rem 0.5rem;
                    margin-left: 0.25rem;
                    transition: color 0.2s;
                    flex-shrink: 0;
                }

                .delete-track-btn:hover {
                    color: #ff6666;
                }

                .search-sections {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .search-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }

                .search-section-header {
                    padding: 0.6rem 1.4rem 0.3rem;
                    color: #4a9eff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .search-result-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 1.4rem;
                    cursor: pointer;
                    transition: background 0.1s;
                    user-select: none;
                    font-size: 0.95rem;
                }

                .search-result-item:hover {
                    background-color: #2a2a2a;
                }

                .search-result-item.artist-result {
                    color: #7dd3fc;
                }

                .search-result-item.album-result {
                    color: #a78bfa;
                }

                .search-result-item.track-result {
                    color: #e0e0e0;
                }

                .search-result-icon {
                    margin-right: 0.6rem;
                    font-size: 1rem;
                }

                .search-result-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.1rem;
                }

                .search-result-title {
                    font-weight: 500;
                }

                .search-result-subtitle {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
            </style>

            <div class="search-bar">
                <input
                    class="search-input"
                    type="text"
                    placeholder="Search tracks…"
                    aria-label="Search tracks"
                >
                <button class="add-all-btn" style="display: none;" title="Add all filtered tracks to playlist">Add All</button>
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
    const addAllBtn = this.shadowRoot.querySelector('.add-all-btn');

    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      searchClear.style.display = this.searchQuery ? 'block' : 'none';
      this.renderPlaylist();
      this.updateAddAllButtonVisibility();
    });

    searchClear.addEventListener('click', () => {
      this.searchQuery = '';
      this.searchSelectedArtist = null;
      this.searchSelectedAlbum = null;
      searchInput.value = '';
      searchClear.style.display = 'none';
      this.renderPlaylist();
      this.updateAddAllButtonVisibility();
    });

    // Add All to Playlist button
    addAllBtn.addEventListener('click', () => {
      const filteredTracks = this.getFilteredTracks();
      if (filteredTracks.length > 0) {
        this.dispatchEvent(new CustomEvent('add-all-to-playlist', {
          detail: { tracks: filteredTracks },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Get the currently filtered/searched tracks
   * When searching: searches through ALL tracks (global search)
   * When not searching: respects library browser filters
   * @returns {Track[]} Array of tracks matching the current search
   */
  getFilteredTracks() {
    // If searching, search through the full library (global search)
    if (this.searchQuery) {
      let filtered = this.fullLibrary.filter(t =>
        t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.album.toLowerCase().includes(this.searchQuery.toLowerCase())
      );

      // Apply search artist filter if selected (within search results)
      if (this.searchSelectedArtist) {
        filtered = filtered.filter(t => t.artist === this.searchSelectedArtist);
      }

      // Apply search album filter if selected (within search results)
      if (this.searchSelectedAlbum) {
        filtered = filtered.filter(t => t.album === this.searchSelectedAlbum);
      }

      return filtered;
    }

    // If not searching, use the current filtered tracks (from library browser)
    return this.tracks;
  }

  /**
   * Get unique artists from filtered tracks
   * @returns {string[]} Array of unique artist names
   */
  getUniqueArtists() {
    const filtered = this.tracks.filter(t =>
      !this.searchQuery ||
      t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    const artists = new Set();
    filtered.forEach(t => {
      if (t.artist) artists.add(t.artist);
    });
    return Array.from(artists).sort();
  }

  /**
   * Get unique albums from filtered tracks
   * @returns {Array} Array of {name, artist} objects for unique albums
   */
  getUniqueAlbums() {
    const filtered = this.tracks.filter(t =>
      !this.searchQuery ||
      t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    const albums = new Map(); // key: album name, value: artist
    filtered.forEach(t => {
      if (t.album && !albums.has(t.album)) {
        albums.set(t.album, t.artist);
      }
    });

    return Array.from(albums.entries())
      .map(([name, artist]) => ({ name, artist }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update visibility of the "Add All" button based on search state and context
   */
  updateAddAllButtonVisibility() {
    const addAllBtn = this.shadowRoot.querySelector('.add-all-btn');
    if (!addAllBtn) return;

    // Show "Add All" button only if:
    // 1. Currently viewing the library (not a specific playlist)
    // 2. There are search results
    const hasSearchResults = this.searchQuery && this.getFilteredTracks().length > 0;
    addAllBtn.style.display = hasSearchResults && !this.playlistId ? 'block' : 'none';
  }

  /**
   * Set the tracks to display (Track[] with metadata)
   * @param {Track[]} tracks - Array of Track objects (already sorted, may be filtered by library browser)
   * @param {string} playlistId - Optional playlist ID if viewing a playlist
   * @param {boolean} clearSearch - Whether to clear the search (default: true for new filters, false for just updating current track)
   * @param {Track[]} fullLibrary - Optional full library for global search (if not provided, uses tracks)
   */
  setTracks(tracks, playlistId = null, clearSearch = true, fullLibrary = null) {
    this.tracks = tracks;
    this.fullLibrary = fullLibrary || tracks;  // Use provided full library, or fall back to current tracks
    this.playlistId = playlistId;

    if (clearSearch) {
      this.searchQuery = '';
      this.searchSelectedArtist = null;
      this.searchSelectedAlbum = null;
      const searchInput = this.shadowRoot.querySelector('.search-input');
      const searchClear = this.shadowRoot.querySelector('.search-clear');
      if (searchInput) {
        searchInput.value = '';
        searchClear.style.display = 'none';
      }
    }

    this.renderPlaylist();
    this.updateAddAllButtonVisibility();
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
  /**
   * Render search results with grouped sections (Artists, Albums, Tracks)
   */
  renderSearchResults() {
    const playlistEl = this.shadowRoot.querySelector('.playlist');
    const artists = this.getUniqueArtists();
    const albums = this.getUniqueAlbums();
    const filteredTracks = this.getFilteredTracks();

    if (filteredTracks.length === 0) {
      playlistEl.innerHTML = '<div class="playlist-empty">No results match your search</div>';
      return;
    }

    let html = '<div class="search-sections">';

    // Artists section
    if (artists.length > 0) {
      html += `<div class="search-section">
        <div class="search-section-header">🎤 Artists (${artists.length})</div>`;
      artists.forEach(artist => {
        const isSelected = this.searchSelectedArtist === artist;
        const className = `search-result-item artist-result${isSelected ? ' active' : ''}`;
        html += `<div class="${className}" data-artist="${this.escapeHtml(artist)}">
          <span class="search-result-main">
            <span class="search-result-title">${this.escapeHtml(artist)}</span>
          </span>
        </div>`;
      });
      html += '</div>';
    }

    // Albums section
    if (albums.length > 0) {
      html += `<div class="search-section">
        <div class="search-section-header">💿 Albums (${albums.length})</div>`;
      albums.forEach(album => {
        const isSelected = this.searchSelectedAlbum === album.name;
        const className = `search-result-item album-result${isSelected ? ' active' : ''}`;
        html += `<div class="${className}" data-album="${this.escapeHtml(album.name)}">
          <span class="search-result-main">
            <span class="search-result-title">${this.escapeHtml(album.name)}</span>
            <span class="search-result-subtitle">${this.escapeHtml(album.artist)}</span>
          </span>
        </div>`;
      });
      html += '</div>';
    }

    // Tracks section
    if (filteredTracks.length > 0) {
      html += `<div class="search-section">
        <div class="search-section-header">🎵 Tracks (${filteredTracks.length})</div>`;

      // Group tracks by album
      const trackIndex = new Map();
      this.tracks.forEach((track, idx) => {
        trackIndex.set(track, idx);
      });

      const albumTracks = {};
      const seenAlbums = new Set();
      filteredTracks.forEach(track => {
        const album = track.album;
        if (!seenAlbums.has(album)) {
          seenAlbums.add(album);
          albumTracks[album] = [];
        }
        albumTracks[album].push(track);
      });

      // Render album headers and tracks
      Object.entries(albumTracks).forEach(([albumName, tracks]) => {
        html += `<div style="color: #666; font-size: 0.8rem; padding: 0.4rem 1.4rem 0.2rem; margin-top: 0.3rem;">${this.escapeHtml(albumName)}</div>`;
        tracks.forEach(track => {
          const originalIndex = trackIndex.get(track);
          const trackNum = parseTrackNumber(track.track);
          const trackLabel = trackNum > 0
            ? `${String(trackNum).padStart(2, '0')}. ${this.escapeHtml(track.title)}`
            : this.escapeHtml(track.title);
          const isActive = originalIndex === this.currentIndex ? ' active' : '';
          const unavailableClass = track.unavailable ? ' unavailable' : '';
          html += `<div class="playlist-item track-result${isActive}${unavailableClass}" data-index="${originalIndex}">
            <span class="track-label">${trackLabel}</span>
            <span>${formatDuration(track.duration)}</span>
          </div>`;
        });
      });

      html += '</div>';
    }

    html += '</div>';
    playlistEl.innerHTML = html;
    this.attachSearchResultListeners();
  }

  /**
   * Attach event listeners to search result items (artists, albums, tracks)
   */
  attachSearchResultListeners() {
    const playlistEl = this.shadowRoot.querySelector('.playlist');

    // Artist clicks
    playlistEl.querySelectorAll('[data-artist]').forEach(el => {
      el.addEventListener('click', (e) => {
        const artist = el.getAttribute('data-artist');
        this.searchSelectedArtist = this.searchSelectedArtist === artist ? null : artist;
        this.searchSelectedAlbum = null;
        this.renderPlaylist();
      });
    });

    // Album clicks
    playlistEl.querySelectorAll('[data-album]').forEach(el => {
      el.addEventListener('click', (e) => {
        const album = el.getAttribute('data-album');
        this.searchSelectedAlbum = this.searchSelectedAlbum === album ? null : album;
        this.renderPlaylist();
      });
    });

    // Track clicks
    playlistEl.querySelectorAll('.playlist-item[data-index]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (el.classList.contains('unavailable')) return;
        const index = parseInt(el.getAttribute('data-index'), 10);
        this.dispatchEvent(new CustomEvent('track-selected', {
          detail: { index },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  renderPlaylist() {
    console.time('renderPlaylist-total');
    const playlistEl = this.shadowRoot.querySelector('.playlist');

    // Cancel any pending batch renders
    if (this.renderBatchId) {
      cancelAnimationFrame(this.renderBatchId);
      this.renderBatchId = null;
    }

    // Show empty state if no tracks
    if (this.tracks.length === 0) {
      playlistEl.innerHTML = '<div class="playlist-empty">Select files to start playing</div>';
      console.timeEnd('renderPlaylist-total');
      return;
    }

    // If searching, use grouped search results layout
    if (this.searchQuery) {
      this.renderSearchResults();
      console.timeEnd('renderPlaylist-total');
      return;
    }

    console.time('renderPlaylist-prep');
    // Build index map for O(1) lookups
    const trackIndex = new Map();
    this.tracks.forEach((track, idx) => {
      trackIndex.set(track, idx);
    });

    // Filter by search query (none in this path, but keep for clarity)
    const filtered = this.getFilteredTracks();

    // Show "no results" message if search yielded no matches
    if (filtered.length === 0) {
      playlistEl.innerHTML = '<div class="playlist-empty">No tracks match your filter</div>';
      console.timeEnd('renderPlaylist-total');
      return;
    }

    // Group by album in a single pass
    const albums = [];
    const seenAlbums = new Set();
    const albumTracks = {};

    filtered.forEach(track => {
      const album = track.album;
      if (!seenAlbums.has(album)) {
        seenAlbums.add(album);
        albumTracks[album] = [];
        albums.push({ name: album });
      }
      albumTracks[album].push(track);
    });
    console.timeEnd('renderPlaylist-prep');

    // Build complete render data once (this is fast)
    const renderData = [];
    const trackMap = {};
    albums.forEach(album => {
      const tracks = albumTracks[album.name];
      const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
      const durationStr = formatDuration(totalDuration);

      renderData.push({
        type: 'header',
        html: `<div class="album-header">
          <span class="album-header-name">${this.escapeHtml(album.name)}</span>
          <span class="album-header-duration">${durationStr}</span>
        </div>`
      });

      tracks.forEach(track => {
        const originalIndex = trackIndex.get(track);
        const trackNum = parseTrackNumber(track.track);
        const trackLabel = trackNum > 0
          ? `${String(trackNum).padStart(2, '0')}. ${this.escapeHtml(track.title)}`
          : this.escapeHtml(track.title);

        let trackMeta = formatDuration(track.duration);
        if (track.year) {
          trackMeta = `${track.year}  ${trackMeta}`;
        }

        const buttonHTML = this.playlistId
          ? `<button class="delete-track-btn" title="Delete from playlist">✕</button>`
          : `<button class="add-playlist-btn" title="Add to playlist">+</button>`;

        const activeClass = originalIndex === this.currentIndex ? 'active' : '';
        const unavailableClass = track.unavailable ? 'unavailable' : '';

        renderData.push({
          type: 'item',
          html: `<div class="playlist-item ${activeClass} ${unavailableClass}" data-index="${originalIndex}">
            <span class="track-label">${trackLabel}</span>
            <span class="track-meta">${trackMeta}</span>
            ${buttonHTML}
          </div>`,
          track,
          originalIndex
        });

        trackMap[originalIndex] = track;
      });
    });

    // Batch render in chunks to keep UI responsive
    console.time('renderPlaylist-batchRender');
    let batchIndex = 0;
    const batchSize = 500;  // Render 500 items per frame (fast now with event delegation)

    const renderBatch = () => {
      const endIndex = Math.min(batchIndex + batchSize, renderData.length);
      let html = '';

      for (let i = batchIndex; i < endIndex; i++) {
        html += renderData[i].html;
      }

      if (batchIndex === 0) {
        // First batch: replace all content
        playlistEl.innerHTML = html;
      } else {
        // Subsequent batches: append
        const temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) {
          playlistEl.appendChild(temp.firstChild);
        }
      }

      batchIndex = endIndex;

      if (batchIndex < renderData.length) {
        // Schedule next batch
        this.renderBatchId = requestAnimationFrame(renderBatch);
      } else {
        // All batches done, add event listeners
        console.timeEnd('renderPlaylist-batchRender');
        console.time('renderPlaylist-listeners');
        this.attachEventListeners(playlistEl, trackMap);
        console.timeEnd('renderPlaylist-listeners');
        console.timeEnd('renderPlaylist-total');
      }
    };

    renderBatch();
  }

  /**
   * Attach event listeners using event delegation (much faster than individual listeners)
   */
  attachEventListeners(playlistEl, trackMap) {
    // Remove any existing listener (in case re-rendering)
    if (this.playlistClickHandler) {
      playlistEl.removeEventListener('click', this.playlistClickHandler);
    }

    // Single delegated click listener for all items
    this.playlistClickHandler = (e) => {
      const button = e.target.closest('button');
      const item = e.target.closest('.playlist-item');

      if (!item) return;

      const originalIndex = parseInt(item.getAttribute('data-index'), 10);
      const track = trackMap[originalIndex];

      if (button && button.classList.contains('add-playlist-btn')) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('add-track-to-playlist', {
          detail: { track, index: originalIndex },
          bubbles: true,
          composed: true,
        }));
      } else if (button && button.classList.contains('delete-track-btn')) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('delete-track-from-playlist', {
          detail: { track, index: originalIndex },
          bubbles: true,
          composed: true,
        }));
      } else if (!button) {
        // Regular track selection (not on a button)
        if (track.unavailable) {
          alert('This track is not available. Please load the folder containing this file.');
          return;
        }
        this.dispatchEvent(new CustomEvent('track-selected', {
          detail: { index: originalIndex },
          bubbles: true,
          composed: true,
        }));
      }
    };

    playlistEl.addEventListener('click', this.playlistClickHandler);
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
