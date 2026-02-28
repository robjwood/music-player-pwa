/**
 * MUSIC PLAYER - MAIN APPLICATION LOGIC
 *
 * This file manages:
 * - Central state (playlist, current track, playback state)
 * - Audio playback (via the HTML5 audio element)
 * - Communication between components via custom events
 *
 * Architecture:
 * - Components handle their own UI and user interactions
 * - Components emit custom events when the user interacts
 * - App listens to events and updates the central state
 * - App updates components by calling their methods
 */

// ============================================
// STATE MANAGEMENT
// ============================================

// This object holds all the state for our player
const playerState = {
    playlist: [],           // Array of File objects
    currentIndex: -1,       // Index of the currently selected track (-1 = none)
    isPlaying: false,       // Are we currently playing?
    fromFolder: false,      // Was the playlist loaded from a folder pick?
};

// ============================================
// DOM & COMPONENT REFERENCES
// ============================================

const DOM = {
    audio: document.getElementById('audioElement'),
    fileSelector: document.querySelector('file-selector'),
    playlistView: document.querySelector('playlist-view'),
    playerControls: document.querySelector('player-controls'),
    volumeControl: document.querySelector('volume-control'),
    progressBar: document.querySelector('progress-bar'),
    nowPlayingInfo: document.querySelector('now-playing-info'),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract a friendly name from a file
 * e.g., "/path/to/song.mp3" -> "song"
 */
function getFilenameStem(file) {
    const nameWithExtension = file.name;
    return nameWithExtension.replace(/\.[^/.]+$/, '');
}

// ============================================
// FILE HANDLING
// ============================================

/**
 * Handle when the user selects files
 */
function handleFilesSelected(event) {
    const audioFiles = event.detail.files;
    const fromFolder = event.detail.fromFolder || false;
    const wasEmpty = playerState.playlist.length === 0;

    // Track origin: only a clean single-folder load is persisted
    if (fromFolder && wasEmpty) {
        playerState.fromFolder = true;
        saveLastTrackIndex(0);
    } else if (playerState.fromFolder && !fromFolder) {
        // Individual files added on top of folder load → mixed playlist
        playerState.fromFolder = false;
        MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
        localStorage.removeItem('music-player-last-index');
    } else if (fromFolder && playerState.fromFolder && wasEmpty === false) {
        // Second folder mixed in → clear persistence
        playerState.fromFolder = false;
        MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
        localStorage.removeItem('music-player-last-index');
    }

    // Add the new files to our playlist
    playerState.playlist.push(...audioFiles);

    // If this is the first file, select it
    if (playerState.currentIndex === -1 && playerState.playlist.length > 0) {
        playerState.currentIndex = 0;
    }

    // Update the UI
    updateAllComponents();
}

/**
 * Handle when the user clears the playlist
 */
function handleClearPlaylist() {
    // Stop the audio
    DOM.audio.pause();
    DOM.audio.src = '';

    // Reset the player state
    playerState.playlist = [];
    playerState.currentIndex = -1;
    playerState.isPlaying = false;
    playerState.fromFolder = false;

    // Clear persistence (but not volume preference)
    MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
    localStorage.removeItem('music-player-last-index');

    // Update the UI
    updateAllComponents();

    // Reset file input
    DOM.fileSelector.setCleared();
}

// ============================================
// PLAYLIST & TRACK SELECTION
// ============================================

/**
 * Handle when the user clicks on a track in the playlist
 */
function handleTrackSelected(event) {
    playerState.currentIndex = event.detail.index;
    loadAndPlayTrack();
}

/**
 * Load and play the current track
 */
function loadAndPlayTrack() {
    // Check if we have a valid track
    if (playerState.currentIndex < 0 || playerState.currentIndex >= playerState.playlist.length) {
        return;
    }

    // Save the current index for folder playlists
    if (playerState.fromFolder) {
        saveLastTrackIndex(playerState.currentIndex);
    }

    const currentFile = playerState.playlist[playerState.currentIndex];

    // Create a URL for the file
    const fileUrl = URL.createObjectURL(currentFile);

    // Set the audio source and start playing
    DOM.audio.src = fileUrl;
    DOM.audio.play();

    playerState.isPlaying = true;

    // Update components
    updateAllComponents();
}

/**
 * Play the next track in the playlist
 */
function playNextTrack() {
    if (playerState.currentIndex < playerState.playlist.length - 1) {
        playerState.currentIndex++;
        loadAndPlayTrack();
    }
}

/**
 * Play the previous track in the playlist
 */
function playPreviousTrack() {
    if (playerState.currentIndex > 0) {
        playerState.currentIndex--;
        loadAndPlayTrack();
    }
}

// ============================================
// PLAYBACK CONTROL
// ============================================

/**
 * Toggle between play and pause
 */
function togglePlayPause() {
    // If nothing is loaded, load the first track
    if (playerState.currentIndex < 0) {
        if (playerState.playlist.length > 0) {
            playerState.currentIndex = 0;
            loadAndPlayTrack();
        }
        return;
    }

    // Toggle play/pause
    if (playerState.isPlaying) {
        DOM.audio.pause();
        playerState.isPlaying = false;
    } else {
        DOM.audio.play();
        playerState.isPlaying = true;
    }

    updateAllComponents();
}

/**
 * Handle volume changes from the volume control
 */
function handleVolumeChanged(event) {
    const volume = event.detail.volume;
    // Convert 0-100 to 0-1
    DOM.audio.volume = volume / 100;
    // Save volume preference
    localStorage.setItem('music-player-volume', String(volume));
}

/**
 * Handle seeking from the progress bar
 */
function handleSeek(event) {
    const newTime = event.detail.time;
    DOM.audio.currentTime = newTime;
}

// ============================================
// AUDIO EVENTS
// ============================================

/**
 * Update progress bar as audio plays
 */
function onTimeUpdate() {
    const currentTime = DOM.audio.currentTime;
    const duration = DOM.audio.duration;
    DOM.progressBar.updateProgress(currentTime, duration);
}

/**
 * When track ends, play the next one
 */
function onTrackEnd() {
    playNextTrack();
}

/**
 * When audio starts/stops, update the play button
 */
function onPlayPauseChange() {
    playerState.isPlaying = !DOM.audio.paused;
    DOM.playerControls.setPlayState(playerState.isPlaying);
}

// ============================================
// COMPONENT UPDATES
// ============================================

/**
 * Update all components to reflect the current state
 */
function updateAllComponents() {
    // Update playlist view
    DOM.playlistView.setPlaylist(playerState.playlist);
    if (playerState.currentIndex >= 0) {
        DOM.playlistView.setCurrentTrack(playerState.currentIndex);
    }

    // Update file count
    DOM.fileSelector.updateFileCount(playerState.playlist.length);

    // Update now playing info
    if (playerState.currentIndex >= 0 && playerState.currentIndex < playerState.playlist.length) {
        const currentFile = playerState.playlist[playerState.currentIndex];
        DOM.nowPlayingInfo.setTrack(currentFile);
    } else {
        DOM.nowPlayingInfo.clearTrack();
    }

    // Update play button
    DOM.playerControls.setPlayState(playerState.isPlaying);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

/**
 * Handle keyboard shortcuts
 * Space: Play/Pause
 * Left Arrow: Previous track
 * Right Arrow: Next track
 */
document.addEventListener('keydown', (event) => {
    // Don't respond to keyboard shortcuts if the user is typing in an input
    if (event.target.tagName === 'INPUT' && event.target.type !== 'range') {
        return;
    }

    switch(event.code) {
        case 'Space':
            event.preventDefault();
            togglePlayPause();
            break;

        case 'ArrowLeft':
            event.preventDefault();
            playPreviousTrack();
            break;

        case 'ArrowRight':
            event.preventDefault();
            playNextTrack();
            break;
    }
});

// ============================================
// EVENT LISTENERS - COMPONENTS
// ============================================

// File selector events
DOM.fileSelector.addEventListener('files-selected', handleFilesSelected);
DOM.fileSelector.addEventListener('clear-playlist', handleClearPlaylist);

// Playlist events
DOM.playlistView.addEventListener('track-selected', handleTrackSelected);

// Player controls events
DOM.playerControls.addEventListener('play-pause', togglePlayPause);
DOM.playerControls.addEventListener('next-track', playNextTrack);
DOM.playerControls.addEventListener('previous-track', playPreviousTrack);

// Volume control events
DOM.volumeControl.addEventListener('volume-changed', handleVolumeChanged);

// Progress bar events
DOM.progressBar.addEventListener('seek', handleSeek);

// ============================================
// EVENT LISTENERS - AUDIO ELEMENT
// ============================================

DOM.audio.addEventListener('timeupdate', onTimeUpdate);
DOM.audio.addEventListener('ended', onTrackEnd);
DOM.audio.addEventListener('play', onPlayPauseChange);
DOM.audio.addEventListener('pause', onPlayPauseChange);
DOM.audio.addEventListener('loadedmetadata', onTimeUpdate);

// ============================================
// PERSISTENCE HELPERS
// ============================================

/**
 * Save the current track index to localStorage
 */
function saveLastTrackIndex(index) {
    if (playerState.fromFolder) {
        localStorage.setItem('music-player-last-index', String(index));
    }
}

/**
 * Restore volume from localStorage
 */
function restoreVolume() {
    const savedVolume = localStorage.getItem('music-player-volume');
    if (savedVolume !== null) {
        const vol = parseFloat(savedVolume);
        if (!isNaN(vol) && vol >= 0 && vol <= 100) {
            DOM.volumeControl.setVolume(vol);
            DOM.audio.volume = vol / 100;
        }
    }
}

/**
 * Attempt to restore the folder and playlist on startup
 */
async function attemptFolderRestore() {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
        return;
    }

    // Try to retrieve the stored folder handle
    let handle;
    try {
        handle = await MusicPlayerDB.getFolderHandle();
    } catch (err) {
        console.warn('Failed to retrieve folder handle from IndexedDB:', err);
        return;
    }

    if (!handle) {
        return;
    }

    // Check permission status
    try {
        const permission = await handle.queryPermission({ mode: 'read' });

        if (permission === 'granted') {
            // Permission already granted, restore silently
            await restoreFolderFromHandle(handle);
        } else if (permission === 'prompt') {
            // Permission needs to be re-granted, show banner
            DOM.fileSelector.showRestoreBanner(handle.name, async () => {
                try {
                    const result = await handle.requestPermission({ mode: 'read' });
                    if (result === 'granted') {
                        await restoreFolderFromHandle(handle);
                        updateAllComponents();
                    } else {
                        MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
                    }
                } catch (err) {
                    console.warn('Failed to request permission:', err);
                    MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
                }
            });
        } else {
            // Permission denied, clear stored handle
            MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
        }
    } catch (err) {
        console.warn('Failed to check permission or restore folder:', err);
        MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
    }
}

/**
 * Restore playlist from a FileSystemDirectoryHandle
 */
async function restoreFolderFromHandle(handle) {
    try {
        const audioFiles = await scanDirectory(handle);

        if (audioFiles.length === 0) {
            MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
            return;
        }

        playerState.playlist = audioFiles;
        playerState.fromFolder = true;

        // Restore the last track index
        const savedIndex = localStorage.getItem('music-player-last-index');
        if (savedIndex !== null) {
            const index = parseInt(savedIndex, 10);
            if (!isNaN(index) && index >= 0 && index < audioFiles.length) {
                playerState.currentIndex = index;
            }
        }
    } catch (err) {
        console.warn('Failed to restore folder from handle:', err);
        MusicPlayerDB.clearFolderHandle().catch(err => console.warn('Failed to clear folder handle:', err));
    }
}

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    // Restore volume preference
    restoreVolume();

    // Attempt to restore folder and playlist
    await attemptFolderRestore();

    // Initialize UI
    updateAllComponents();

    console.log('🎵 Music Player initialized');
});
