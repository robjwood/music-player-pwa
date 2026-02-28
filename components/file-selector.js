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

                .add-btn,
                .clear-btn {
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

                .add-btn:hover {
                    background-color: #333;
                    border-color: #555;
                }

                .add-btn:active {
                    background-color: #252525;
                }

                .add-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .clear-btn {
                    background-color: #8b3a3a;
                    border: 1px solid #a84949;
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

                /* Modal dialog */
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    align-items: center;
                    justify-content: center;
                }

                .modal.active {
                    display: flex;
                }

                .modal-content {
                    background: #1a1a1a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 2rem;
                    min-width: 300px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                }

                .modal-title {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.2rem;
                    color: #e0e0e0;
                }

                .modal-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .modal-btn {
                    background-color: #2a2a2a;
                    border: 1px solid #444;
                    color: #e0e0e0;
                    padding: 0.75rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                    font-family: inherit;
                    text-align: left;
                }

                .modal-btn:hover {
                    background-color: #333;
                    border-color: #555;
                }

                .modal-btn:active {
                    background-color: #252525;
                }

                .modal-close {
                    background: transparent;
                    border: none;
                    color: #888;
                    font-size: 1.5rem;
                    cursor: pointer;
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                }

                .modal-close:hover {
                    color: #aaa;
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
                <button class="add-btn" aria-label="Add music files or folder">
                    + Add Music
                </button>
                <button class="clear-btn" aria-label="Clear playlist">
                    ✕ Clear
                </button>
                <div class="file-count">No files selected</div>
            </div>

            ${hasFolderApi ? `
                <div class="modal">
                    <div class="modal-content">
                        <button class="modal-close">✕</button>
                        <h2 class="modal-title">Add Music</h2>
                        <div class="modal-buttons">
                            <button class="modal-btn add-files-modal">
                                📄 Add Individual Files
                            </button>
                            <button class="modal-btn add-folder-modal">
                                📁 Add Folder
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const fileInput = this.shadowRoot.querySelector('.file-input');
        const addBtn = this.shadowRoot.querySelector('.add-btn');
        const clearBtn = this.shadowRoot.querySelector('.clear-btn');
        const modal = this.shadowRoot.querySelector('.modal');
        const addFilesModal = this.shadowRoot.querySelector('.add-files-modal');
        const addFolderModal = this.shadowRoot.querySelector('.add-folder-modal');
        const modalClose = this.shadowRoot.querySelector('.modal-close');

        // Open modal when add button is clicked
        addBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.add('active');
            } else {
                // Fallback if folder API not supported
                fileInput.click();
            }
        });

        // Close modal
        const closeModal = () => {
            if (modal) {
                modal.classList.remove('active');
            }
        };

        if (modal) {
            if (modalClose) {
                modalClose.addEventListener('click', closeModal);
            }

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Add files option
        if (addFilesModal) {
            addFilesModal.addEventListener('click', () => {
                closeModal();
                fileInput.click();
            });
        }

        // Add folder option
        if (addFolderModal) {
            addFolderModal.addEventListener('click', () => {
                closeModal();
                this.handleFolderSelection();
            });
        }

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
        const fileCountEl = this.shadowRoot.querySelector('.file-count');
        const originalText = fileCountEl.textContent;

        try {
            // Show "Scanning..." text
            this.isScanning = true;
            fileCountEl.textContent = 'Scanning…';

            // Try to retrieve and reuse the stored folder handle
            let dirHandle = null;
            try {
                dirHandle = await MusicPlayerDB.getFolderHandle();
                if (dirHandle) {
                    // Check if we still have permission
                    const permission = await dirHandle.queryPermission({ mode: 'read' });
                    if (permission !== 'granted') {
                        // Permission was revoked, need to ask again
                        try {
                            const result = await dirHandle.requestPermission({ mode: 'read' });
                            if (result !== 'granted') {
                                dirHandle = null;  // Fall back to picker
                            }
                        } catch (err) {
                            dirHandle = null;  // Fall back to picker
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to retrieve folder handle:', err);
                dirHandle = null;
            }

            // If no valid stored handle, open the folder picker
            if (!dirHandle) {
                dirHandle = await window.showDirectoryPicker();
            }

            // Recursively scan for audio files
            const audioFiles = await scanDirectory(dirHandle);

            if (audioFiles.length === 0) {
                alert('No audio files found in the selected folder or its subfolders.');
                fileCountEl.textContent = originalText;
                // Clear stored handle if scan yielded nothing
                MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
                return;
            }

            // Save the folder handle for later restoration
            MusicPlayerDB.saveFolderHandle(dirHandle).catch(err => console.warn('Failed to save folder handle:', err));

            // Emit custom event with found files, tagged as from folder
            this.dispatchEvent(new CustomEvent('files-selected', {
                detail: { files: audioFiles, fromFolder: true },
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

    /**
     * Show a dismissible restore banner
     * @param {string} folderName - Name of the folder to restore
     * @param {Function} onRestore - Callback when user clicks "Restore"
     */
    showRestoreBanner(folderName, onRestore) {
        const container = this.shadowRoot.querySelector('.file-selector');

        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'restore-banner';
        banner.innerHTML = `
            📁 Restore last folder: <strong>${this.escapeHtml(folderName)}</strong>
            <button class="restore-btn">Restore</button>
            <button class="dismiss-btn">✕</button>
        `;

        // Add banner styles if not already in CSS
        const style = this.shadowRoot.querySelector('style');
        if (style && !style.textContent.includes('.restore-banner')) {
            style.textContent += `
                .restore-banner {
                    margin-bottom: 1rem;
                    padding: 0.75rem 1rem;
                    background-color: #2a3a2a;
                    border: 1px solid #4a7a4a;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: #d0e0d0;
                    font-size: 0.95rem;
                }

                .restore-banner strong {
                    color: #a0d0a0;
                }

                .restore-banner .restore-btn,
                .restore-banner .dismiss-btn {
                    background-color: #3a5a3a;
                    border: 1px solid #5a8a5a;
                    color: #d0e0d0;
                    padding: 0.4rem 0.8rem;
                    border-radius: 3px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.85rem;
                }

                .restore-banner .restore-btn:hover {
                    background-color: #4a7a4a;
                    border-color: #7aaa7a;
                }

                .restore-banner .dismiss-btn {
                    margin-left: auto;
                    background-color: transparent;
                    border: none;
                    color: #888;
                    padding: 0.2rem 0.4rem;
                }

                .restore-banner .dismiss-btn:hover {
                    color: #aaa;
                }
            `;
        }

        // Insert banner at the top
        container.insertBefore(banner, container.firstChild);

        // Handle restore click
        const restoreBtn = banner.querySelector('.restore-btn');
        restoreBtn.addEventListener('click', async () => {
            banner.remove();
            await onRestore();
        });

        // Handle dismiss click
        const dismissBtn = banner.querySelector('.dismiss-btn');
        dismissBtn.addEventListener('click', () => {
            banner.remove();
        });
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

// Register the custom element
customElements.define('file-selector', FileSelector);
