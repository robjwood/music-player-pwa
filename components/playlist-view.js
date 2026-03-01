/**
 * PLAYLIST VIEW COMPONENT
 *
 * Displays all tracks in the playlist with click-to-play functionality
 *
 * Usage:
 *   <playlist-view></playlist-view>
 *
 * Events emitted:
 *   - track-selected: { detail: { index: number } }
 *
 * Methods:
 *   setPlaylist(files) - Set the playlist to display
 *   setCurrentTrack(index) - Mark a track as currently playing
 */

class PlaylistView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.playlist = [];
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
                    border-radius: 4px;
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
                    gap: 0.25rem;
                    padding: 0.5rem;
                }

                .playlist-empty {
                    padding: 2rem 1rem;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }

                .playlist-item {
                    padding: 0.75rem 1rem;
                    background-color: #252525;
                    border-left: 3px solid transparent;
                    cursor: pointer;
                    transition: all 0.15s;
                    border-radius: 2px;
                    user-select: none;
                }

                .playlist-item:hover {
                    background-color: #2a2a2a;
                }

                .playlist-item.active {
                    background-color: #333;
                    border-left-color: #4a9eff;
                    font-weight: 600;
                    box-shadow: 0 0 8px rgba(74, 158, 255, 0.2);
                }

                /* Visual indicator (▶) prefix for the now-playing track */
                .playlist-item.active::before {
                    content: '▶ ';
                    color: #4a9eff;
                    font-size: 0.8rem;
                    margin-right: 0.25rem;
                }

                .playlist-item-title {
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: #e0e0e0;
                }

                .playlist-item.active .playlist-item-title {
                    font-weight: 600;
                    color: #4a9eff;
                }

                .playlist-item-filename {
                    font-size: 0.85rem;
                    color: #888;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
     * Set the playlist to display
     * @param {File[]} files - Array of audio files
     */
    setPlaylist(files) {
        this.playlist = files;
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
     * Render the playlist items
     */
    renderPlaylist() {
        const playlistEl = this.shadowRoot.querySelector('.playlist');
        playlistEl.innerHTML = '';

        // Show empty state if no files
        if (this.playlist.length === 0) {
            playlistEl.innerHTML = '<div class="playlist-empty">Select files to start playing</div>';
            return;
        }

        // Build filtered list keeping track of original indices
        const items = this.playlist
            .map((file, originalIndex) => ({ file, originalIndex }))
            .filter(({ file }) =>
                !this.searchQuery ||
                file.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );

        // Show "no results" message if search yielded no matches
        if (items.length === 0 && this.searchQuery) {
            playlistEl.innerHTML = '<div class="playlist-empty">No tracks match your search</div>';
            return;
        }

        // Create a list item for each filtered file
        items.forEach(({ file, originalIndex }) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';

            // Mark the currently playing track
            if (originalIndex === this.currentIndex) {
                item.classList.add('active');
            }

            // Get filename without extension
            const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');

            item.innerHTML = `
                <div class="playlist-item-title">${nameWithoutExtension}</div>
                <div class="playlist-item-filename">${file.name}</div>
            `;

            // When user clicks this item, emit event with original index
            item.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('track-selected', {
                    detail: { index: originalIndex },
                    bubbles: true,
                    composed: true,
                }));
            });

            playlistEl.appendChild(item);
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
}

// Register the custom element
customElements.define('playlist-view', PlaylistView);
