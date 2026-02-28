/**
 * NOW PLAYING COMPONENT
 *
 * Displays the currently playing track title and artist/filename
 *
 * Usage:
 *   <now-playing-info></now-playing-info>
 *
 * Methods:
 *   setTrack(file) - Update the displayed track
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
     */
    setTrack(file) {
        if (!file) {
            this.clearTrack();
            return;
        }

        const titleEl = this.shadowRoot.querySelector('.track-title');
        const artistEl = this.shadowRoot.querySelector('.track-artist');

        // Extract filename without extension
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');

        titleEl.textContent = nameWithoutExtension;
        artistEl.textContent = `File: ${file.name}`;
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
