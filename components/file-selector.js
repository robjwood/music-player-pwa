/**
 * FILE SELECTOR COMPONENT
 *
 * Web Component that enhances HTML folder picker with File System Access API.
 * HTML structure (buttons, file count) is defined in index.html.
 * This component wraps that HTML and adds folder selection and file scanning.
 *
 * Usage in HTML:
 *   <file-selector>
 *     <div class="file-selector-controls">
 *       <button class="folder-btn">📁 Select Folder</button>
 *       <button class="clear-btn">✕ Clear</button>
 *       <div class="file-count">No files selected</div>
 *     </div>
 *   </file-selector>
 *
 * Events emitted:
 *   - files-selected: { detail: { files: File[], fromFolder: bool, folderName: string, folderHandle } }
 *   - clear-playlist: {} - When user confirms clearing playlist
 *
 * Methods:
 *   updateFileCount(count) - Update the count display
 *   showRestoreBanner(folderName, onRestore) - Show a restore banner
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
        this.isScanning = false;
    }

    connectedCallback() {
        // Cache DOM elements
        this.folderBtn = this.querySelector('.folder-btn');
        this.clearBtn = this.querySelector('.clear-btn');
        this.fileCountEl = this.querySelector('.file-count');
        this.controlsDiv = this.querySelector('.file-selector-controls');

        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Folder picker button
        if (this.folderBtn) {
            this.folderBtn.addEventListener('click', () => {
                this.handleFolderSelection();
            });
        }

        // Clear button
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                // Ask for confirmation
                if (confirm('Are you sure you want to clear the playlist?')) {
                    this.dispatchEvent(new CustomEvent('clear-playlist', {
                        bubbles: true,
                        composed: true,
                    }));
                }
            });
        }
    }

    /**
     * Handle folder selection via File System Access API
     */
    async handleFolderSelection() {
        const originalText = this.fileCountEl.textContent;
        const startTime = Date.now();
        let lastUpdateTime = startTime;

        try {
            // Show "Scanning..." text
            this.isScanning = true;
            this.fileCountEl.textContent = 'Scanning… (0 files)';

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
                    this.fileCountEl.textContent = `Scanning… (${count} file${count !== 1 ? 's' : ''}, ${speed} files/sec)`;
                    lastUpdateTime = now;
                }
            };

            // Recursively scan for audio files with progress tracking
            const audioFiles = await scanDirectory(dirHandle, [], onProgress);

            if (audioFiles.length === 0) {
                alert('No audio files found in the selected folder or its subfolders.');
                this.fileCountEl.textContent = originalText;
                // Clear stored handle if scan yielded nothing
                MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
                return;
            }

            // Save the folder handle for later restoration
            MusicPlayerDB.addFolderHandle(dirHandle).catch(err => console.warn('Failed to add folder handle:', err));

            // Emit custom event with found files, tagged as from folder
            this.dispatchEvent(new CustomEvent('files-selected', {
                detail: { files: audioFiles, fromFolder: true, folderName: dirHandle.name, folderHandle: dirHandle },
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
            this.fileCountEl.textContent = originalText;
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Update the file count display
     * @param {number} count - Number of files in the playlist
     */
    updateFileCount(count) {
        if (count === 0) {
            this.fileCountEl.textContent = 'No files selected';
        } else if (count === 1) {
            this.fileCountEl.textContent = '1 file selected';
        } else {
            this.fileCountEl.textContent = `${count} files selected`;
        }

        // Disable clear button if no files
        this.clearBtn.disabled = count === 0;
    }

    /**
     * Show a dismissible restore banner
     * @param {string} folderName - Name of the folder to restore
     * @param {Function} onRestore - Callback when user clicks "Restore"
     */
    showRestoreBanner(folderName, onRestore) {
        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'restore-banner';
        banner.innerHTML = `
            📁 Restore last folder: <strong>${this.escapeHtml(folderName)}</strong>
            <button class="restore-btn">Restore</button>
            <button class="dismiss-btn">✕</button>
        `;

        // Insert banner at the top of the file-selector
        this.insertBefore(banner, this.controlsDiv);

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

customElements.define('file-selector', FileSelector);
