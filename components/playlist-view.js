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
    }

    connectedCallback() {
        this.render();
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
                    padding: 0.5rem;
                }

                .playlist {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
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

            <div class="playlist"></div>
        `;
    }

    /**
     * Set the playlist to display
     * @param {File[]} files - Array of audio files
     */
    setPlaylist(files) {
        this.playlist = files;
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

        // Create a list item for each file
        this.playlist.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';

            // Mark the currently playing track
            if (index === this.currentIndex) {
                item.classList.add('active');
            }

            // Get filename without extension
            const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');

            item.innerHTML = `
                <div class="playlist-item-title">${nameWithoutExtension}</div>
                <div class="playlist-item-filename">${file.name}</div>
            `;

            // When user clicks this item, emit event
            item.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('track-selected', {
                    detail: { index },
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
        const items = this.shadowRoot.querySelectorAll('.playlist-item');
        const activeItem = items[this.currentIndex];

        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Register the custom element
customElements.define('playlist-view', PlaylistView);
