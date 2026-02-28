/**
 * INDEXEDDB WRAPPER
 *
 * Manages persistent storage of FileSystemDirectoryHandle objects
 * (the only way to store them — File objects are not structured-cloneable)
 *
 * Global namespace: MusicPlayerDB
 * Methods:
 *   - saveFolderHandle(handle) - Store a directory handle
 *   - getFolderHandle() - Retrieve the stored handle, or null if not present
 *   - clearFolderHandle() - Delete the stored handle
 */

const MusicPlayerDB = (() => {
    const DB_NAME = 'music-player-db';
    const DB_VERSION = 1;
    const STORE = 'folder-handles';
    const KEY = 'lastFolder';

    /**
     * Open or create the IndexedDB database
     */
    function open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
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
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const req = store.put(handle, KEY);

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
            const tx = db.transaction(STORE, 'readonly');
            const store = tx.objectStore(STORE);
            const req = store.get(KEY);

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
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const req = store.delete(KEY);

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
    };
})();
