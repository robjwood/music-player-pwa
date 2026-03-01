/**
 * LIBRARY BROWSER COMPONENT
 *
 * Left sidebar that organizes the library by Artists or Albums.
 * Allows hierarchical browsing and filtering of the playlist.
 *
 * Usage:
 *   <library-browser></library-browser>
 *
 * Methods:
 *   setLibrary(tracks) - Set the library and reset to Artists view
 *
 * Events:
 *   library-filter-changed - Emitted with { tracks: filteredTracks }
 */

class LibraryBrowser extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.library = []; // Track[] — full library with metadata
        this.view = 'artists'; // 'artists' | 'albums' | 'songs'
        this.selectedArtist = null; // currently selected artist name
        this.selectedAlbum = null; // currently selected album name (only in artists view)
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
                    height: 100%;
                    overflow: hidden;
                    background-color: #1a1a1a;
                }

                .view-modes {
                    display: flex;
                    flex-direction: row;
                    border-bottom: 1px solid #333;
                    background-color: #0a0a0a;
                    padding: 0.5rem;
                    gap: 0.5rem;
                }

                .mode-btn {
                    flex: 1;
                    padding: 0.5rem;
                    border: none;
                    background-color: transparent;
                    color: #888;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 500;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }

                .mode-btn:hover {
                    color: #c0c0c0;
                }

                .mode-btn.active {
                    color: #4a9eff;
                    border-bottom-color: #4a9eff;
                }

                .entity-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }

                .entity-item {
                    padding: 0.5rem;
                    margin: 0.25rem 0;
                    border-left: 2px solid transparent;
                    cursor: pointer;
                    color: #c0c0c0;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: all 0.1s ease;
                }

                .entity-item:hover {
                    background-color: #222;
                }

                .entity-item.active {
                    border-left-color: #4a9eff;
                    background-color: #1a2a3a;
                    color: #4a9eff;
                    font-weight: 600;
                }

                .no-library {
                    padding: 1rem;
                    color: #666;
                    font-size: 0.9rem;
                    text-align: center;
                }

                .album-item {
                    padding: 0.3rem 0.5rem 0.3rem 1.75rem;
                    font-size: 0.82rem;
                    color: #888;
                    border-left: 2px solid transparent;
                    cursor: pointer;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: all 0.1s ease;
                }

                .album-item:hover {
                    color: #bbb;
                    background: #1e1e1e;
                }

                .album-item.active {
                    color: #4a9eff;
                    border-left-color: #4a9eff;
                }

                ::-webkit-scrollbar {
                    width: 6px;
                }

                ::-webkit-scrollbar-track {
                    background-color: transparent;
                }

                ::-webkit-scrollbar-thumb {
                    background-color: #444;
                    border-radius: 3px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background-color: #555;
                }
            </style>

            <div class="view-modes">
                <button class="mode-btn active" data-mode="artists">Artists</button>
                <button class="mode-btn" data-mode="albums">Albums</button>
                <button class="mode-btn" data-mode="songs">Songs</button>
            </div>
            <div class="entity-list"></div>
        `;
    }

    /**
     * Setup event listeners for view mode buttons
     */
    setupEventListeners() {
        const modeButtons = this.shadowRoot.querySelectorAll('.mode-btn');

        modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const newMode = btn.dataset.mode;
                this.setView(newMode);
            });
        });
    }

    /**
     * Set the library and reset to Artists view
     * @param {Track[]} tracks
     */
    setLibrary(tracks) {
        this.library = tracks;
        this.view = 'artists';
        this.selectedArtist = null;
        this.selectedAlbum = null;

        this.renderEntityList();

        // Emit library-filter-changed with all tracks
        this.emitFilterChanged(tracks);
    }

    /**
     * Change the view mode (artists, albums, songs)
     * @param {string} mode
     */
    setView(mode) {
        this.view = mode;
        this.selectedArtist = null;
        this.selectedAlbum = null;

        // Update active button
        const modeButtons = this.shadowRoot.querySelectorAll('.mode-btn');
        modeButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.renderEntityList();

        // Emit library-filter-changed with all tracks (reset filter)
        this.emitFilterChanged(this.library);
    }

    /**
     * Render the entity list (artists or albums)
     */
    renderEntityList() {
        const listContainer = this.shadowRoot.querySelector('.entity-list');

        if (this.library.length === 0) {
            listContainer.innerHTML = '<div class="no-library">No library loaded</div>';
            return;
        }

        if (this.view === 'songs') {
            listContainer.innerHTML = '';
            return;
        }

        // Extract unique entities
        let entities = [];
        if (this.view === 'artists') {
            const artistSet = new Set();
            this.library.forEach((track) => {
                if (track.artist) artistSet.add(track.artist);
            });
            entities = Array.from(artistSet).sort();

            // Render artists with expandable albums
            let html = '';
            entities.forEach((artist, idx) => {
                html += `<div class="entity-item ${this.selectedArtist === artist ? 'active' : ''}" data-entity="${idx}">
                    ${this.escapeHtml(artist)}
                </div>`;

                // If artist is selected, show their albums indented below
                if (this.selectedArtist === artist) {
                    const artistTracks = this.library.filter(t => t.artist === artist);
                    const albumSet = new Set();
                    const albumYear = {};

                    artistTracks.forEach(t => {
                        if (t.album) {
                            albumSet.add(t.album);
                            const yr = parseInt(t.year, 10);
                            if (!isNaN(yr)) {
                                if (albumYear[t.album] === undefined || yr < albumYear[t.album]) {
                                    albumYear[t.album] = yr;
                                }
                            }
                        }
                    });

                    const albums = Array.from(albumSet).sort((a, b) => {
                        const yearA = albumYear[a] ?? 9999;
                        const yearB = albumYear[b] ?? 9999;
                        return yearA !== yearB ? yearA - yearB : a.localeCompare(b);
                    });

                    albums.forEach((album, albumIdx) => {
                        html += `<div class="album-item ${this.selectedAlbum === album ? 'active' : ''}" data-album="${albumIdx}">
                            ${this.escapeHtml(album)}
                        </div>`;
                    });
                }
            });

            listContainer.innerHTML = html;

            // Add event listeners
            const artistItems = listContainer.querySelectorAll('.entity-item');
            artistItems.forEach((item) => {
                item.addEventListener('click', () => {
                    const artistName = entities[parseInt(item.dataset.entity, 10)];
                    this.selectEntity(artistName);
                });
            });

            const albumItems = listContainer.querySelectorAll('.album-item');
            albumItems.forEach((item) => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Get albums list for the current artist
                    const artistTracks = this.library.filter(t => t.artist === this.selectedArtist);
                    const albumSet = new Set();
                    const albumYear = {};

                    artistTracks.forEach(t => {
                        if (t.album) {
                            albumSet.add(t.album);
                            const yr = parseInt(t.year, 10);
                            if (!isNaN(yr)) {
                                if (albumYear[t.album] === undefined || yr < albumYear[t.album]) {
                                    albumYear[t.album] = yr;
                                }
                            }
                        }
                    });

                    const albums = Array.from(albumSet).sort((a, b) => {
                        const yearA = albumYear[a] ?? 9999;
                        const yearB = albumYear[b] ?? 9999;
                        return yearA !== yearB ? yearA - yearB : a.localeCompare(b);
                    });

                    const albumName = albums[parseInt(item.dataset.album, 10)];
                    this.selectAlbum(albumName);
                });
            });
        } else if (this.view === 'albums') {
            const albumSet = new Set();
            this.library.forEach((track) => {
                if (track.album) albumSet.add(track.album);
            });
            entities = Array.from(albumSet).sort();

            // Render album items
            listContainer.innerHTML = entities
                .map(
                    (entity, idx) =>
                        `<div class="entity-item ${this.selectedAlbum === entity ? 'active' : ''}" data-entity="${idx}">
                            ${this.escapeHtml(entity)}
                        </div>`
                )
                .join('');

            // Add event listeners to entity items
            const items = listContainer.querySelectorAll('.entity-item');
            items.forEach((item) => {
                item.addEventListener('click', () => {
                    const entityName = entities[parseInt(item.dataset.entity, 10)];
                    this.selectEntity(entityName);
                });
            });
        }
    }

    /**
     * Select an entity (artist or album) and filter the library
     * @param {string} entityName
     */
    selectEntity(entityName) {
        if (this.view === 'artists') {
            // If clicking the same artist, collapse it
            if (this.selectedArtist === entityName) {
                this.selectedArtist = null;
                this.selectedAlbum = null;
                this.renderEntityList();
                // Emit all tracks
                this.emitFilterChanged(this.library);
            } else {
                // Switch to different artist
                this.selectedArtist = entityName;
                this.selectedAlbum = null;
                this.renderEntityList();
                // Emit all tracks by this artist
                const filteredTracks = this.library.filter((track) => track.artist === entityName);
                this.emitFilterChanged(filteredTracks);
            }
        } else if (this.view === 'albums') {
            // Toggle album selection in albums view
            if (this.selectedAlbum === entityName) {
                this.selectedAlbum = null;
                this.renderEntityList();
                this.emitFilterChanged(this.library);
            } else {
                this.selectedAlbum = entityName;
                this.renderEntityList();
                const filteredTracks = this.library.filter((track) => track.album === entityName);
                this.emitFilterChanged(filteredTracks);
            }
        }
    }

    /**
     * Select an album within an artist (artists view only)
     * @param {string} albumName
     */
    selectAlbum(albumName) {
        this.selectedAlbum = albumName;
        this.renderEntityList();

        // Filter by artist AND album
        const filteredTracks = this.library.filter(
            (track) => track.artist === this.selectedArtist && track.album === albumName
        );
        this.emitFilterChanged(filteredTracks);
    }

    /**
     * Emit library-filter-changed event
     * @param {Track[]} filteredTracks
     */
    emitFilterChanged(filteredTracks) {
        const event = new CustomEvent('library-filter-changed', {
            detail: { tracks: filteredTracks },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }

    /**
     * Escape HTML special characters (XSS protection)
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Register the custom element
customElements.define('library-browser', LibraryBrowser);
