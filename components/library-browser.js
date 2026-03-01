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
        this.selectedEntity = null; // currently selected artist or album name
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
        this.selectedEntity = null;

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
        this.selectedEntity = null;

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
        } else if (this.view === 'albums') {
            const albumSet = new Set();
            this.library.forEach((track) => {
                if (track.album) albumSet.add(track.album);
            });
            entities = Array.from(albumSet).sort();
        }

        // Render entity items
        listContainer.innerHTML = entities
            .map(
                (entity, idx) =>
                    `<div class="entity-item ${this.selectedEntity === entity ? 'active' : ''}" data-entity="${idx}">
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

    /**
     * Select an entity (artist or album) and filter the library
     * @param {string} entityName
     */
    selectEntity(entityName) {
        this.selectedEntity = entityName;
        this.renderEntityList();

        // Filter the library
        let filteredTracks = this.library;
        if (this.view === 'artists') {
            filteredTracks = this.library.filter((track) => track.artist === entityName);
        } else if (this.view === 'albums') {
            filteredTracks = this.library.filter((track) => track.album === entityName);
        }

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
