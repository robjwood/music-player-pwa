/**
 * VOLUME CONTROL COMPONENT
 *
 * A slider to control audio volume from 0-100
 *
 * Usage:
 *   <volume-control></volume-control>
 *
 * Events emitted:
 *   - volume-changed: { detail: { volume: 0-100 } }
 *
 * Methods:
 *   setVolume(value) - Set the volume programmatically (0-100)
 *   getVolume() - Get the current volume value (0-100)
 */

class VolumeControl extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
                    margin-bottom: 1rem;
                }

                .volume-container {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .volume-label {
                    font-size: 1.2rem;
                    flex-shrink: 0;
                    cursor: default;
                }

                .volume-slider {
                    flex: 1;
                    max-width: 150px;
                    height: 6px;
                    border-radius: 3px;
                    background-color: #1a1a1a;
                    outline: none;
                    -webkit-appearance: none;
                    appearance: none;
                    cursor: pointer;
                }

                /* Styling the slider thumb for webkit browsers */
                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #4a9eff;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .volume-slider::-webkit-slider-thumb:hover {
                    background-color: #5aafff;
                    transform: scale(1.2);
                }

                /* Styling the slider thumb for Firefox */
                .volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #4a9eff;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                }

                .volume-slider::-moz-range-thumb:hover {
                    background-color: #5aafff;
                    transform: scale(1.2);
                }

                .volume-slider::-moz-range-track {
                    background-color: transparent;
                    border: none;
                }
            </style>

            <div class="volume-container">
                <label class="volume-label">🔊</label>
                <input
                    type="range"
                    class="volume-slider"
                    min="0"
                    max="100"
                    value="70"
                    aria-label="Volume control"
                >
            </div>
        `;
    }

    /**
     * Set up event listeners for user interaction
     */
    setupEventListeners() {
        const slider = this.shadowRoot.querySelector('.volume-slider');

        slider.addEventListener('input', (event) => {
            const volume = parseFloat(event.target.value);

            // Emit custom event so the app can update the audio element
            this.dispatchEvent(new CustomEvent('volume-changed', {
                detail: { volume },
                bubbles: true,
                composed: true,
            }));
        });
    }

    /**
     * Set the volume value programmatically
     * @param {number} value - Volume from 0-100
     */
    setVolume(value) {
        const slider = this.shadowRoot.querySelector('.volume-slider');
        slider.value = Math.max(0, Math.min(100, value));
    }

    /**
     * Get the current volume value
     * @returns {number} Volume from 0-100
     */
    getVolume() {
        const slider = this.shadowRoot.querySelector('.volume-slider');
        return parseFloat(slider.value);
    }
}

// Register the custom element
customElements.define('volume-control', VolumeControl);
