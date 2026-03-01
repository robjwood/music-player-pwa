/**
 * INDEXEDDB WRAPPER
 *
 * Manages persistent storage of:
 * - FileSystemDirectoryHandle objects (for folder access)
 * - Cached metadata (for instant restore)
 *
 * Global namespace: MusicPlayerDB
 * Methods:
 *   - saveFolderHandle(handle) - Store a directory handle
 *   - getFolderHandle() - Retrieve the stored handle, or null if not present
 *   - clearFolderHandle() - Delete the stored handle
 *   - saveFolderMetadata(folderName, tracks) - Cache parsed metadata for a folder
 *   - getFolderMetadata(folderName) - Get cached metadata
 *   - clearFolderMetadata(folderName) - Delete cached metadata
 */

const MusicPlayerDB = (() => {
    const DB_NAME = 'music-player-db';
    const DB_VERSION = 2;
    const HANDLE_STORE = 'folder-handles';
    const METADATA_STORE = 'folder-metadata';
    const HANDLE_KEY = 'lastFolder';

    /**
     * Open or create the IndexedDB database
     */
    function open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(HANDLE_STORE)) {
                    db.createObjectStore(HANDLE_STORE);
                }
                if (!db.objectStoreNames.contains(METADATA_STORE)) {
                    db.createObjectStore(METADATA_STORE);
                }
            };

            req.onsuccess = (e) => {
                resolve(e.target.result);
            };

            req.onerror = (e) => {
                reject(e.target.error);
            };
        });
    }

    /**
     * Save a FileSystemDirectoryHandle to IndexedDB
     * @param {FileSystemDirectoryHandle} handle - The directory handle to save
     */
    async function saveFolderHandle(handle) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.put(handle, HANDLE_KEY);

            req.onsuccess = () => {
                resolve();
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Retrieve the stored FileSystemDirectoryHandle
     * @returns {Promise<FileSystemDirectoryHandle|null>} - The handle or null
     */
    async function getFolderHandle() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readonly');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.get(HANDLE_KEY);

            req.onsuccess = () => {
                resolve(req.result || null);
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Delete the stored FileSystemDirectoryHandle
     */
    async function clearFolderHandle() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.delete(HANDLE_KEY);

            req.onsuccess = () => {
                resolve();
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Save cached metadata for a folder
     * @param {string} folderName - Name of the folder (used as cache key)
     * @param {Track[]} tracks - Parsed track metadata
     */
    async function saveFolderMetadata(folderName, tracks) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readwrite');
            const store = tx.objectStore(METADATA_STORE);
            // Store only the essential metadata, not File objects
            const cacheData = {
                folderName,
                timestamp: Date.now(),
                tracks: tracks.map(t => ({
                    title: t.title,
                    artist: t.artist,
                    album: t.album,
                    track: t.track,
                    year: t.year,
                    duration: t.duration,
                    fileName: t.file.name,
                    fileSize: t.file.size,
                }))
            };
            const req = store.put(cacheData, folderName);

            req.onsuccess = () => {
                resolve();
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Get cached metadata for a folder
     * @param {string} folderName - Name of the folder
     * @returns {Promise<object|null>} - Cached metadata or null
     */
    async function getFolderMetadata(folderName) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readonly');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.get(folderName);

            req.onsuccess = () => {
                resolve(req.result || null);
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Clear cached metadata for a folder
     * @param {string} folderName - Name of the folder
     */
    async function clearFolderMetadata(folderName) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readwrite');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.delete(folderName);

            req.onsuccess = () => {
                resolve();
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    return {
        saveFolderHandle,
        getFolderHandle,
        clearFolderHandle,
        saveFolderMetadata,
        getFolderMetadata,
        clearFolderMetadata,
    };
})();
