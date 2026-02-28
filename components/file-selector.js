/**
 * FILE SELECTOR COMPONENT
 *
 * File input for selecting audio files, folder picker for selecting entire folders,
 * and clear button for the playlist
 *
 * Usage:
 *   <file-selector></file-selector>
 *
 * Events emitted:
 *   - files-selected: { detail: { files: File[] } }
 *   - clear-playlist: {}
 *
 * Methods:
 *   updateFileCount(count) - Update the count display
 *   setCleared() - Reset the file input
 */

// Audio file extensions supported for directory scanning
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.weba'];

/**
 * Check if a filename is an audio file by extension
 */
function isAudioFile(filename) {
    return AUDIO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));
}

/**
 * Recursively scan a directory and collect all audio files
 */
async function scanDirectory(dirHandle, audioFiles = []) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            // Recurse into subdirectories
            await scanDirectory(entry, audioFiles);
        } else if (entry.kind === 'file' && isAudioFile(entry.name)) {
            // Get File object from FileSystemFileHandle
            const file = await entry.getFile();
            audioFiles.push(file);
        }
    }
    return audioFiles;
}

class FileSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isScanning = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * Render the component's HTML and styles
     */
    render() {
        const hasFolderApi = 'showDirectoryPicker' in window;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 1.5rem;
                    border-bottom: 1px solid #333;
                }

                .file-selector {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                input[type="file"] {
                    display: none;
                }

                .file-label,
                .folder-btn {
                    background-color: #2a2a2a;
                    border: 1px solid #444;
                    color: #e0e0e0;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                    font-size: 1rem;
                    font-family: inherit;
                }

                .file-label:hover,
                .folder-btn:hover {
                    background-color: #333;
                    border-color: #555;
                }

                .file-label:active,
                .folder-btn:active {
                    background-color: #252525;
                }

                .folder-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .clear-btn {
                    background-color: #8b3a3a;
                    border: 1px solid #a84949;
                    color: #e0e0e0;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }

                .clear-btn:hover {
                    background-color: #a84949;
                    border-color: #c85959;
                }

                .clear-btn:active {
                    background-color: #743030;
                }

                .clear-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .file-count {
                    font-size: 0.9rem;
                    color: #888;
                }

                .folder-btn.hidden {
                    display: none;
                }
            </style>

            <div class="file-selector">
                <input
                    type="file"
                    class="file-input"
                    accept="audio/*"
                    multiple
                    aria-label="Select music files"
                >
                <label for="file-input" class="file-label">
                    + Add Music Files
                </label>
                ${hasFolderApi ? '<button class="folder-btn" aria-label="Select folder">📁 Select Folder</button>' : ''}
                <button class="clear-btn" aria-label="Clear playlist">
                    ✕ Clear
                </button>
                <div class="file-count">No files selected</div>
            </div>
        `;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const fileInput = this.shadowRoot.querySelector('.file-input');
        const fileLabel = this.shadowRoot.querySelector('.file-label');
        const folderBtn = this.shadowRoot.querySelector('.folder-btn');
        const clearBtn = this.shadowRoot.querySelector('.clear-btn');

        // Connect the label to the file input
        fileLabel.addEventListener('click', () => {
            fileInput.click();
        });

        // When files are selected via file input
        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;

            // Filter for audio files only
            const audioFiles = Array.from(files).filter(file =>
                file.type.startsWith('audio/')
            );

            if (audioFiles.length === 0) {
                alert('No audio files selected. Please select .mp3, .wav, .ogg, etc.');
                return;
            }

            // Emit custom event
            this.dispatchEvent(new CustomEvent('files-selected', {
                detail: { files: audioFiles },
                bubbles: true,
                composed: true,
            }));
        });

        // Folder picker button (only if supported)
        if (folderBtn) {
            folderBtn.addEventListener('click', () => {
                this.handleFolderSelection();
            });
        }

        // Clear button
        clearBtn.addEventListener('click', () => {
            // Ask for confirmation
            if (confirm('Are you sure you want to clear the playlist?')) {
                this.dispatchEvent(new CustomEvent('clear-playlist', {
                    bubbles: true,
                    composed: true,
                }));
            }
        });
    }

    /**
     * Handle folder selection via File System Access API
     */
    async handleFolderSelection() {
        const folderBtn = this.shadowRoot.querySelector('.folder-btn');
        const fileCountEl = this.shadowRoot.querySelector('.file-count');
        const originalText = fileCountEl.textContent;

        try {
            // Show "Scanning..." text
            this.isScanning = true;
            if (folderBtn) folderBtn.disabled = true;
            fileCountEl.textContent = 'Scanning…';

            // Open folder picker
            const dirHandle = await window.showDirectoryPicker();

            // Recursively scan for audio files
            const audioFiles = await scanDirectory(dirHandle);

            if (audioFiles.length === 0) {
                alert('No audio files found in the selected folder or its subfolders.');
                fileCountEl.textContent = originalText;
                return;
            }

            // Emit custom event with found files
            this.dispatchEvent(new CustomEvent('files-selected', {
                detail: { files: audioFiles },
                bubbles: true,
                composed: true,
            }));

        } catch (error) {
            // AbortError means user cancelled the picker
            if (error.name === 'AbortError') {
                // Silently do nothing
            } else {
                alert(`Error reading folder: ${error.message}`);
            }
            fileCountEl.textContent = originalText;
        } finally {
            this.isScanning = false;
            if (folderBtn) folderBtn.disabled = false;
        }
    }

    /**
     * Update the file count display
     * @param {number} count - Number of files in the playlist
     */
    updateFileCount(count) {
        const fileCountEl = this.shadowRoot.querySelector('.file-count');
        const clearBtn = this.shadowRoot.querySelector('.clear-btn');

        if (count === 0) {
            fileCountEl.textContent = 'No files selected';
        } else if (count === 1) {
            fileCountEl.textContent = '1 file selected';
        } else {
            fileCountEl.textContent = `${count} files selected`;
        }

        // Disable clear button if no files
        clearBtn.disabled = count === 0;
    }

    /**
     * Reset the file input (after clearing)
     */
    setCleared() {
        const fileInput = this.shadowRoot.querySelector('.file-input');
        fileInput.value = '';
    }
}

// Register the custom element
customElements.define('file-selector', FileSelector);
