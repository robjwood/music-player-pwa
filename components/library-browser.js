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
        this.selectedArtist = null; // currently selected artist name
        this.selectedAlbum = null; // currently selected album name
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
                    display: flex;
                    flex-direction: column;
                }

                .library-header {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #333;
                    background-color: #0a0a0a;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
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
                }

                ::-webkit-scrollbar-thumb:hover {
                    background-color: #555;
                }
            </style>

            <div class="library-header">Artist / Album</div>
            <div class="entity-list"></div>
        `;
    }

    /**
     * Setup event listeners (currently none needed)
     */
    setupEventListeners() {
        // Event listeners are set up in renderEntityList
    }

    /**
     * Set the library and render artist/album view
     * @param {Track[]} tracks
     */
    setLibrary(tracks) {
        this.library = tracks;
        this.selectedArtist = null;
        this.selectedAlbum = null;

        this.renderEntityList();

        // Emit library-filter-changed with all tracks
        this.emitFilterChanged(tracks);
    }

    /**
     * Render the artist/album hierarchy
     */
    renderEntityList() {
        const listContainer = this.shadowRoot.querySelector('.entity-list');

        if (this.library.length === 0) {
            listContainer.innerHTML = '<div class="no-library">No library loaded</div>';
            return;
        }

        // Extract unique artists
        const artistSet = new Set();
        this.library.forEach((track) => {
            if (track.artist) artistSet.add(track.artist);
        });
        const artists = Array.from(artistSet).sort();

        // Render artists with expandable albums
        let html = '';
        artists.forEach((artist, idx) => {
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
                const artistName = artists[parseInt(item.dataset.entity, 10)];
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
    }

    /**
     * Select an artist and filter the library
     * @param {string} artistName
     */
    selectEntity(artistName) {
        // If clicking the same artist, collapse it
        if (this.selectedArtist === artistName) {
            this.selectedArtist = null;
            this.selectedAlbum = null;
            this.renderEntityList();
            // Emit all tracks
            this.emitFilterChanged(this.library);
        } else {
            // Switch to different artist
            this.selectedArtist = artistName;
            this.selectedAlbum = null;
            this.renderEntityList();
            // Emit all tracks by this artist
            const filteredTracks = this.library.filter((track) => track.artist === artistName);
            this.emitFilterChanged(filteredTracks);
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
