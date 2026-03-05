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
    const DB_VERSION = 3;
    const HANDLE_STORE = 'folder-handles';
    const METADATA_STORE = 'folder-metadata';
    const PLAYLISTS_STORE = 'playlists';
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
                if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
                    db.createObjectStore(PLAYLISTS_STORE);
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

    /**
     * Save a complete folder snapshot (for recovery if handle is lost)
     * Stores folder name + full metadata together
     * @param {string} folderName - Name of the folder
     * @param {Track[]} tracks - Parsed track metadata
     */
    async function saveFolderSnapshot(folderName, tracks) {
        const db = await open();
        const snapshot = {
            folderName,
            timestamp: Date.now(),
            trackCount: tracks.length,
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

        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readwrite');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.put(snapshot, '__lastSnapshot__');

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Get the last saved folder snapshot
     * @returns {Promise<object|null>} - Snapshot with folderName and tracks, or null
     */
    async function getLastFolderSnapshot() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readonly');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.get('__lastSnapshot__');

            req.onsuccess = () => {
                resolve(req.result || null);
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Clear the folder snapshot
     */
    async function clearFolderSnapshot() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readwrite');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.delete('__lastSnapshot__');

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Create a new playlist
     * @param {string} name - Playlist name
     * @returns {Promise<string>} - Playlist ID
     */
    async function createPlaylist(name) {
        const db = await open();
        const playlistId = `playlist-${Date.now()}`;
        const playlist = {
            id: playlistId,
            name,
            createdAt: Date.now(),
            tracks: [],
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readwrite');
            const store = tx.objectStore('playlists');
            const req = store.put(playlist, playlistId);

            req.onsuccess = () => resolve(playlistId);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Get all playlists
     * @returns {Promise<object[]>} - Array of playlists
     */
    async function getPlaylists() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readonly');
            const store = tx.objectStore('playlists');
            const req = store.getAll();

            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Get a specific playlist
     * @param {string} playlistId - Playlist ID
     * @returns {Promise<object|null>} - Playlist or null
     */
    async function getPlaylist(playlistId) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readonly');
            const store = tx.objectStore('playlists');
            const req = store.get(playlistId);

            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Delete a playlist
     * @param {string} playlistId - Playlist ID
     */
    async function deletePlaylist(playlistId) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readwrite');
            const store = tx.objectStore('playlists');
            const req = store.delete(playlistId);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Add a track to a playlist
     * @param {string} playlistId - Playlist ID
     * @param {Track} track - Track to add
     */
    async function addTrackToPlaylist(playlistId, track) {
        const playlist = await getPlaylist(playlistId);
        if (!playlist) return;

        // Check if track already in playlist
        const exists = playlist.tracks.some(t => t.fileName === track.file.name);
        if (exists) return;

        // Add track
        playlist.tracks.push({
            fileName: track.file.name,
            title: track.title,
            artist: track.artist,
            album: track.album,
            track: track.track,
            year: track.year,
            duration: track.duration,
        });

        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readwrite');
            const store = tx.objectStore('playlists');
            const req = store.put(playlist, playlistId);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Remove a track from a playlist
     * @param {string} playlistId - Playlist ID
     * @param {string} fileName - File name to remove
     */
    async function removeTrackFromPlaylist(playlistId, fileName) {
        const playlist = await getPlaylist(playlistId);
        if (!playlist) return;

        playlist.tracks = playlist.tracks.filter(t => t.fileName !== fileName);

        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('playlists', 'readwrite');
            const store = tx.objectStore('playlists');
            const req = store.put(playlist, playlistId);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Add a folder handle to the list of saved handles
     * @param {FileSystemDirectoryHandle} handle - The directory handle to add
     */
    async function addFolderHandle(handle) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.get('folderHandles');

            req.onsuccess = () => {
                const handles = req.result || [];
                // Check if handle already exists (by name)
                if (!handles.some(h => h.name === handle.name)) {
                    handles.push(handle);
                }
                const putReq = store.put(handles, 'folderHandles');
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };

            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Get all saved folder handles
     * @returns {Promise<FileSystemDirectoryHandle[]>} - Array of folder handles
     */
    async function getFolderHandles() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readonly');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.get('folderHandles');

            req.onsuccess = () => {
                resolve(req.result || []);
            };

            req.onerror = () => {
                reject(req.error);
            };
        });
    }

    /**
     * Remove a folder handle by name
     * @param {string} folderName - Name of the folder to remove
     */
    async function removeFolderHandle(folderName) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.get('folderHandles');

            req.onsuccess = () => {
                const handles = (req.result || []).filter(h => h.name !== folderName);
                const putReq = store.put(handles, 'folderHandles');
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };

            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Clear all folder handles
     */
    async function clearAllFolderHandles() {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            const store = tx.objectStore(HANDLE_STORE);
            const req = store.put([], 'folderHandles');

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    return {
        saveFolderHandle,
        getFolderHandle,
        clearFolderHandle,
        addFolderHandle,
        getFolderHandles,
        removeFolderHandle,
        clearAllFolderHandles,
        saveFolderMetadata,
        getFolderMetadata,
        clearFolderMetadata,
        saveFolderSnapshot,
        getLastFolderSnapshot,
        clearFolderSnapshot,
        createPlaylist,
        getPlaylists,
        getPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
    };
})();
