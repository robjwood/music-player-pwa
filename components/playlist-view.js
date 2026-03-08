/**
 * PLAYLIST VIEW COMPONENT
 *
 * Web Component that displays tracks grouped by album with CMUS-style formatting.
 * HTML structure (search bar, playlist container) is defined in index.html.
 * This component wraps that HTML and adds rendering, search, and interactivity.
 *
 * Usage in HTML:
 *   <playlist-view>
 *     <div class="search-bar">
 *       <input class="search-input" type="text" placeholder="Search tracks…">
 *       <button class="add-all-btn" style="display: none;">Add All</button>
 *       <button class="search-clear">✕</button>
 *     </div>
 *     <div class="playlist"></div>
 *   </playlist-view>
 *
 * Events emitted:
 *   - track-selected: { detail: { index: number } } - When clicking a track
 *   - add-track-to-playlist: { detail: { track } } - When clicking + on a track
 *   - add-all-to-playlist: { detail: { tracks: Track[] } } - When clicking Add All
 *   - delete-track: { detail: { index } } - When clicking delete button
 *
 * Methods:
 *   setTracks(tracks, playlistId, clearSearch, fullLibrary) - Set the Track[] to display
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

class PlaylistView extends HTMLElement {
  constructor() {
    super();
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
    this.setupEventListeners();
    this.setupPlaylistDelegation();
  }

  /**
   * Set up delegated event listener for playlist items
   * Handles track selection, add-to-playlist, delete, and search result clicks
   */
  setupPlaylistDelegation() {
    const playlistEl = this.querySelector('.playlist');
    if (!playlistEl) return;

    playlistEl.addEventListener('click', (e) => {
      // Add-to-playlist button
      if (e.target.classList.contains('add-playlist-btn')) {
        e.stopPropagation();
        const item = e.target.closest('[data-index]');
        if (item) {
          const index = parseInt(item.dataset.index, 10);
          const track = this.tracks[index];
          if (track) {
            this.dispatchEvent(new CustomEvent('add-track-to-playlist', {
              detail: { track },
              bubbles: true,
              composed: true
            }));
          }
        }
        return;
      }

      // Delete button
      if (e.target.classList.contains('delete-track-btn')) {
        e.stopPropagation();
        const item = e.target.closest('[data-index]');
        if (item) {
          const index = parseInt(item.dataset.index, 10);
          this.dispatchEvent(new CustomEvent('delete-track', {
            detail: { index },
            bubbles: true,
            composed: true
          }));
        }
        return;
      }

      // Search result artist filter
      if (e.target.closest('[data-artist]')) {
        const artistEl = e.target.closest('[data-artist]');
        const artist = artistEl.dataset.artist;
        this.searchSelectedArtist = this.searchSelectedArtist === artist ? null : artist;
        this.renderPlaylist();
        return;
      }

      // Search result album filter
      if (e.target.closest('[data-album]')) {
        const albumEl = e.target.closest('[data-album]');
        const album = albumEl.dataset.album;
        this.searchSelectedAlbum = this.searchSelectedAlbum === album ? null : album;
        this.renderPlaylist();
        return;
      }

      // Track selection (anywhere except buttons)
      const item = e.target.closest('[data-index]');
      if (item && !e.target.closest('button')) {
        const index = parseInt(item.dataset.index, 10);
        this.dispatchEvent(new CustomEvent('track-selected', {
          detail: { index },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Set up event listeners for search and clear button
   */
  setupEventListeners() {
    const searchInput = this.querySelector('.search-input');
    const searchClear = this.querySelector('.search-clear');
    const addAllBtn = this.querySelector('.add-all-btn');

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
    const addAllBtn = this.querySelector('.add-all-btn');
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
      const searchInput = this.querySelector('.search-input');
      const searchClear = this.querySelector('.search-clear');
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
    const playlistEl = this.querySelector('.playlist');
    if (!playlistEl) return;

    if (this.searchQuery) {
      this.renderSearchResults();
      return;
    }

    const tracks = this.tracks;

    if (tracks.length === 0) {
      playlistEl.replaceChildren();
      const emptyEl = document.createElement('div');
      emptyEl.className = 'playlist-empty';
      emptyEl.textContent = 'No tracks loaded';
      playlistEl.appendChild(emptyEl);
      return;
    }

    // Clear playlist
    playlistEl.replaceChildren();

    // Get template
    const albumTemplate = document.getElementById('album-header-template');
    const itemTemplate = document.getElementById('playlist-item-template');

    // Group tracks by album
    const tracksByAlbum = {};
    tracks.forEach((track, idx) => {
      const album = track.album || 'Unknown Album';
      if (!tracksByAlbum[album]) {
        tracksByAlbum[album] = [];
      }
      tracksByAlbum[album].push({ track, idx });
    });

    // Render albums in order
    Object.keys(tracksByAlbum).forEach(album => {
      const albumTracks = tracksByAlbum[album];
      let albumDur = 0;
      albumTracks.forEach(({ track }) => {
        albumDur += track.duration || 0;
      });

      // Clone and populate album header template
      const headerEl = albumTemplate.content.cloneNode(true);
      headerEl.querySelector('.album-header-name').textContent = album;
      headerEl.querySelector('.album-header-duration').textContent = formatDuration(albumDur);
      playlistEl.appendChild(headerEl);

      // Render tracks for this album
      albumTracks.forEach(({ track, idx }) => {
        const trackNum = parseTrackNumber(track.track);
        const trackNumStr = trackNum ? String(trackNum).padStart(2, '0') : '--';
        const trackTitle = track.title || track.file.name.replace(/\.[^/.]+$/, '');

        // Clone and populate track item template
        const itemEl = itemTemplate.content.cloneNode(true);
        const itemDiv = itemEl.querySelector('.playlist-item');
        itemDiv.dataset.index = idx;
        if (this.currentIndex === idx) {
          itemDiv.classList.add('active');
        }
        if (track.unavailable) {
          itemDiv.classList.add('unavailable');
        }

        itemEl.querySelector('.track-label').textContent = `${trackNumStr}. ${trackTitle}`;
        itemEl.querySelector('.track-meta').textContent = `${track.year || ''} ${formatDuration(track.duration)}`;

        playlistEl.appendChild(itemEl);
      });
    });
  }

  /**
   * Render search results with grouped sections (Artists, Albums, Tracks)
   */
  renderSearchResults() {
    const playlistEl = this.querySelector('.playlist');
    const artists = this.getUniqueArtists();
    const albums = this.getUniqueAlbums();
    const filteredTracks = this.getFilteredTracks();

    if (filteredTracks.length === 0) {
      playlistEl.replaceChildren();
      const emptyEl = document.createElement('div');
      emptyEl.className = 'playlist-empty';
      emptyEl.textContent = 'No results match your search';
      playlistEl.appendChild(emptyEl);
      return;
    }

    // Clear playlist
    playlistEl.replaceChildren();

    // Get template
    const resultTemplate = document.getElementById('search-result-item-template');

    // Create sections container
    const sectionsEl = document.createElement('div');
    sectionsEl.className = 'search-sections';

    // Artists section
    if (artists.length > 0) {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'search-section';

      const headerEl = document.createElement('div');
      headerEl.className = 'search-section-header';
      headerEl.textContent = `🎤 Artists (${artists.length})`;
      sectionEl.appendChild(headerEl);

      artists.forEach(artist => {
        const itemEl = resultTemplate.content.cloneNode(true);
        const resultDiv = itemEl.querySelector('.search-result-item');
        resultDiv.className = 'search-result-item artist-result';
        resultDiv.dataset.artist = artist;
        if (this.searchSelectedArtist === artist) {
          resultDiv.classList.add('active');
        }
        itemEl.querySelector('.search-result-title').textContent = artist;
        itemEl.querySelector('.search-result-subtitle').style.display = 'none';
        sectionEl.appendChild(itemEl);
      });

      sectionsEl.appendChild(sectionEl);
    }

    // Albums section
    if (albums.length > 0) {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'search-section';

      const headerEl = document.createElement('div');
      headerEl.className = 'search-section-header';
      headerEl.textContent = `💿 Albums (${albums.length})`;
      sectionEl.appendChild(headerEl);

      albums.forEach(album => {
        const itemEl = resultTemplate.content.cloneNode(true);
        const resultDiv = itemEl.querySelector('.search-result-item');
        resultDiv.className = 'search-result-item album-result';
        resultDiv.dataset.album = album.name;
        if (this.searchSelectedAlbum === album.name) {
          resultDiv.classList.add('active');
        }
        itemEl.querySelector('.search-result-title').textContent = album.name;
        itemEl.querySelector('.search-result-subtitle').textContent = album.artist;
        sectionEl.appendChild(itemEl);
      });

      sectionsEl.appendChild(sectionEl);
    }

    // Tracks section
    if (filteredTracks.length > 0) {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'search-section';

      const headerEl = document.createElement('div');
      headerEl.className = 'search-section-header';
      headerEl.textContent = `🎵 Tracks (${filteredTracks.length})`;
      sectionEl.appendChild(headerEl);

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
          const trackNum = parseTrackNumber(track.track);
          const trackNumStr = trackNum ? String(trackNum).padStart(2, '0') : '--';
          const trackTitle = track.title || track.file.name.replace(/\.[^/.]+$/, '');

          const itemEl = resultTemplate.content.cloneNode(true);
          const resultDiv = itemEl.querySelector('.search-result-item');
          resultDiv.className = 'search-result-item track-result';
          resultDiv.dataset.index = idx;
          if (this.currentIndex === idx) {
            resultDiv.classList.add('active');
          }
          itemEl.querySelector('.search-result-title').textContent = `${trackNumStr}. ${trackTitle}`;
          itemEl.querySelector('.search-result-subtitle').textContent = `${track.artist} • ${track.album}`;
          sectionEl.appendChild(itemEl);
        });
      });

      sectionsEl.appendChild(sectionEl);
    }

    playlistEl.appendChild(sectionsEl);
  }


  /**
   * Scroll the currently playing track into view
   */
  scrollCurrentTrackIntoView() {
    const playlistEl = this.querySelector('.playlist');
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

customElements.define('playlist-view', PlaylistView);
