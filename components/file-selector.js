/**
 * FILE SELECTOR COMPONENT
 *
 * Folder picker for selecting entire directories of music files
 *
 * Usage:
 *   <file-selector></file-selector>
 *
 * Events emitted:
 *   - files-selected: { detail: { files: File[], fromFolder: true } }
 *   - clear-playlist: {}
 *
 * Methods:
 *   updateFileCount(count) - Update the count display
 *   showRestoreBanner(folderName, onRestore) - Show a restore banner for auto-resume
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
 * @param {FileSystemDirectoryHandle} dirHandle - Directory to scan
 * @param {Array} audioFiles - Accumulator for audio files
 * @param {Function} onProgress - Optional callback(count) called as files are found
 */
async function scanDirectory(dirHandle, audioFiles = [], onProgress = null) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            // Recurse into subdirectories
            await scanDirectory(entry, audioFiles, onProgress);
        } else if (entry.kind === 'file' && isAudioFile(entry.name)) {
            // Get File object from FileSystemFileHandle
            const file = await entry.getFile();
            audioFiles.push(file);
            // Call progress callback if provided
            if (onProgress) {
                onProgress(audioFiles.length);
            }
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

                .folder-btn,
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

                .folder-btn:hover {
                    background-color: #333;
                    border-color: #555;
                }

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
            </style>

            <div class="file-selector">
                <button class="folder-btn" aria-label="Select folder">
                    📁 Select Folder
                </button>
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
        const folderBtn = this.shadowRoot.querySelector('.folder-btn');
        const clearBtn = this.shadowRoot.querySelector('.clear-btn');

        // Folder picker button
        folderBtn.addEventListener('click', () => {
            this.handleFolderSelection();
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
        const startTime = Date.now();
        let lastUpdateTime = startTime;

        try {
            // Show "Scanning..." text
            this.isScanning = true;
            fileCountEl.textContent = 'Scanning… (0 files)';

            // Open folder picker
            const dirHandle = await window.showDirectoryPicker();

            // Progress callback to update UI as files are found
            const onProgress = (count) => {
                const now = Date.now();
                const elapsedSeconds = (now - startTime) / 1000;
                const filesPerSecond = count / elapsedSeconds;

                // Update display every 200ms to avoid too many updates
                if (now - lastUpdateTime > 200) {
                    const speed = filesPerSecond.toFixed(1);
                    fileCountEl.textContent = `Scanning… (${count} file${count !== 1 ? 's' : ''}, ${speed} files/sec)`;
                    lastUpdateTime = now;
                }
            };

            // Recursively scan for audio files with progress tracking
            const audioFiles = await scanDirectory(dirHandle, [], onProgress);

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
                detail: { files: audioFiles, fromFolder: true, folderName: dirHandle.name },
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
