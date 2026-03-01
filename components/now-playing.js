/**
 * NOW PLAYING COMPONENT
 *
 * Displays the currently playing track title and artist from metadata or filename
 *
 * Usage:
 *   <now-playing-info></now-playing-info>
 *
 * Methods:
 *   setTrack(file, track) - Update the displayed track (track metadata optional)
 *   clearTrack() - Clear the display
 */

class NowPlayingInfo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
                    margin-bottom: 1rem;
                }

                .track-title {
                    font-weight: 600;
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: #e0e0e0;
                }

                .track-artist {
                    font-size: 0.9rem;
                    color: #888;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>

            <div class="track-title">No track selected</div>
            <div class="track-artist">Select a file to start</div>
        `;
    }

    /**
     * Update the display with a new track
     * @param {File} file - The audio file object
     * @param {Track|null} track - Optional track metadata with { title, artist, album, track }
     */
    setTrack(file, track = null) {
        if (!file) {
            this.clearTrack();
            return;
        }

        const titleEl = this.shadowRoot.querySelector('.track-title');
        const artistEl = this.shadowRoot.querySelector('.track-artist');

        // Use metadata if available, otherwise fall back to filename
        const title = track?.title || file.name.replace(/\.[^/.]+$/, '');
        const artist = track?.artist || 'Unknown Artist';

        titleEl.textContent = title;
        artistEl.textContent = artist;
    }

    /**
     * Clear the track display
     */
    clearTrack() {
        const titleEl = this.shadowRoot.querySelector('.track-title');
        const artistEl = this.shadowRoot.querySelector('.track-artist');

        titleEl.textContent = 'No track selected';
        artistEl.textContent = 'Select a file to start';
    }
}

// Register the custom element
customElements.define('now-playing-info', NowPlayingInfo);
