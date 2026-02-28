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
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    // Set initial volume
    DOM.audio.volume = DOM.volumeControl.getVolume() / 100;

    // Initialize UI
    updateAllComponents();

    console.log('🎵 Music Player initialized');
});
