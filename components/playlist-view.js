/**
 * PLAYLIST VIEW COMPONENT
 *
 * Displays tracks grouped by album with CMUS-style formatting.
 * Each track shows title + track number, with album headers.
 * HTML is defined in index.html; this class enhances it with interactivity.
 *
 * Usage:
 *   const playlistView = new PlaylistView(document.querySelector('#playlistView'));
 *
 * Events emitted:
 *   - track-selected: { detail: { index: number } }
 *   - add-all-to-playlist: { detail: { tracks: Track[] } }
 *
 * Methods:
 *   setTracks(tracks, playlistId, clearSearch, fullLibrary) - Set the Track[] to display (already sorted)
 *   setCurrentTrack(index) - Mark a track as currently playing
 *   scrollCurrentTrackIntoView() - Scroll to the currently playing track
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

class PlaylistView {
  constructor(container) {
    this.container = container;
    this.tracks = [];
    this.fullLibrary = [];  // Full library for global search (all tracks, not filtered)
    this.currentIndex = -1;
    this.searchQuery = '';
    this.playlistId = null;  // ID of current playlist (null if not viewing a playlist)
    this.renderBatchId = null;  // Track pending render batches
    this.searchSelectedArtist = null;  // Artist selected from search results
    this.searchSelectedAlbum = null;  // Album selected from search results

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for search and clear button
   */
  setupEventListeners() {
    const searchInput = this.container.querySelector('.search-input');
    const searchClear = this.container.querySelector('.search-clear');
    const addAllBtn = this.container.querySelector('.add-all-btn');

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
        this.container.dispatchEvent(new CustomEvent('add-all-to-playlist', {
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
    const addAllBtn = this.container.querySelector('.add-all-btn');
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
      const searchInput = this.container.querySelector('.search-input');
      const searchClear = this.container.querySelector('.search-clear');
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
  renderPlaylist() {
    const playlistEl = this.container.querySelector('.playlist');
    if (!playlistEl) return;

    if (this.searchQuery) {
      this.renderSearchResults();
      return;
    }

    const tracks = this.tracks;

    if (tracks.length === 0) {
      playlistEl.innerHTML = '<div class="playlist-empty">No tracks loaded</div>';
      return;
    }

    let html = '';
    let currentAlbum = null;
    let albumDuration = 0;
    let trackIndex = 0;

    // Group tracks by album
    const tracksByAlbum = {};
    tracks.forEach((track, idx) => {
      const album = track.album || 'Unknown Album';
      if (!tracksByAlbum[album]) {
        tracksByAlbum[album] = [];
      }
      tracksByAlbum[album].push({ track, idx, displayIdx: trackIndex });
      trackIndex++;
    });

    // Render albums in order
    Object.keys(tracksByAlbum).forEach(album => {
      const albumTracks = tracksByAlbum[album];
      let albumDur = 0;
      albumTracks.forEach(({ track }) => {
        albumDur += track.duration || 0;
      });

      html += `<div class="album-header">
        <div class="album-header-name">${this.escapeHtml(album)}</div>
        <div class="album-header-duration">${formatDuration(albumDur)}</div>
      </div>`;

      albumTracks.forEach(({ track, idx }) => {
        const isActive = this.currentIndex === idx ? ' active' : '';
        const isUnavailable = track.unavailable ? ' unavailable' : '';
        const trackNum = parseTrackNumber(track.track);
        const trackNumStr = trackNum ? String(trackNum).padStart(2, '0') : '--';
        const trackTitle = track.title || track.file.name.replace(/\.[^/.]+$/, '');

        html += `<div class="playlist-item${isActive}${isUnavailable}" data-index="${idx}">
          <span class="track-label">${trackNumStr}. ${this.escapeHtml(trackTitle)}</span>
          <span class="track-meta">${track.year || ''} ${formatDuration(track.duration)}</span>
          <button class="add-playlist-btn" title="Add to playlist" style="display: none;">+</button>
          <button class="delete-track-btn" title="Delete from playlist" style="display: none;">✕</button>
        </div>`;
      });
    });

    playlistEl.innerHTML = html;
    this.setupPlaylistItemListeners();
  }

  /**
   * Render search results with grouped sections (Artists, Albums, Tracks)
   */
  renderSearchResults() {
    const playlistEl = this.container.querySelector('.playlist');
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

      // Group tracks by album for display
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
          if (!albumTracks[album]) {
            albumTracks[album] = [];
          }
        }
        if (!albumTracks[album]) {
          albumTracks[album] = [];
        }
        albumTracks[album].push(track);
      });

      Object.keys(albumTracks).forEach(album => {
        albumTracks[album].forEach(track => {
          const idx = trackIndex.get(track);
          const isActive = this.currentIndex === idx ? ' active' : '';
          const trackNum = parseTrackNumber(track.track);
          const trackNumStr = trackNum ? String(trackNum).padStart(2, '0') : '--';
          const trackTitle = track.title || track.file.name.replace(/\.[^/.]+$/, '');

          html += `<div class="search-result-item track-result${isActive}" data-index="${idx}">
            <span class="search-result-main">
              <span class="search-result-title">${trackNumStr}. ${this.escapeHtml(trackTitle)}</span>
              <span class="search-result-subtitle">${this.escapeHtml(track.artist)} • ${this.escapeHtml(track.album)}</span>
            </span>
          </div>`;
        });
      });
    }

    html += '</div>';
    playlistEl.innerHTML = html;
    this.setupPlaylistItemListeners();
  }

  /**
   * Set up event listeners for playlist items (click to select track)
   */
  setupPlaylistItemListeners() {
    const playlistEl = this.container.querySelector('.playlist');
    if (!playlistEl) return;

    // Track selection listeners
    const items = playlistEl.querySelectorAll('[data-index]');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger on button clicks
        if (e.target.classList.contains('add-playlist-btn') || e.target.classList.contains('delete-track-btn')) {
          return;
        }

        const index = parseInt(item.dataset.index, 10);
        this.container.dispatchEvent(new CustomEvent('track-selected', {
          detail: { index },
          bubbles: true,
          composed: true
        }));
      });
    });

    // Search result listeners (artist/album selection)
    const artistResults = playlistEl.querySelectorAll('[data-artist]');
    artistResults.forEach(result => {
      result.addEventListener('click', () => {
        const artist = result.dataset.artist;
        this.searchSelectedArtist = this.searchSelectedArtist === artist ? null : artist;
        this.renderPlaylist();
      });
    });

    const albumResults = playlistEl.querySelectorAll('[data-album]');
    albumResults.forEach(result => {
      result.addEventListener('click', () => {
        const album = result.dataset.album;
        this.searchSelectedAlbum = this.searchSelectedAlbum === album ? null : album;
        this.renderPlaylist();
      });
    });

    // Add-to-playlist button listeners
    const addBtns = playlistEl.querySelectorAll('.add-playlist-btn');
    addBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the track index from the parent item's data-index attribute
        const item = btn.closest('[data-index]');
        if (item) {
          const index = parseInt(item.dataset.index, 10);
          const track = this.tracks[index];
          if (track) {
            this.container.dispatchEvent(new CustomEvent('add-track-to-playlist', {
              detail: { track },
              bubbles: true,
              composed: true
            }));
          }
        }
      });
    });

    // Delete button listeners
    const deleteBtns = playlistEl.querySelectorAll('.delete-track-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the track index from the parent item's data-index attribute
        const item = btn.closest('[data-index]');
        if (item) {
          const index = parseInt(item.dataset.index, 10);
          this.container.dispatchEvent(new CustomEvent('delete-track', {
            detail: { index },
            bubbles: true,
            composed: true
          }));
        }
      });
    });
  }

  /**
   * Scroll the currently playing track into view
   */
  scrollCurrentTrackIntoView() {
    const playlistEl = this.container.querySelector('.playlist');
    if (!playlistEl) return;

    const activeItem = playlistEl.querySelector('.playlist-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
