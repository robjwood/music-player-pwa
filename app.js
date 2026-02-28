/* ============================================
   MUSIC PLAYER - PHASE 1 MVP
   Simple, vanilla JavaScript audio player
   ============================================

   OVERVIEW:
   This app manages a simple music player with:
   - File selection (manual upload)
   - Playlist display
   - Play/pause controls
   - Next/previous navigation
   - Progress bar with seeking
   - Time display

   ARCHITECTURE:
   - Playlist: Array of File objects
   - Current Track: Index into the playlist
   - Audio Element: Native HTML5 <audio> for playback
   - UI State: Automatically updates based on playback state
*/

// ============================================
// STATE MANAGEMENT
// ============================================

// This object holds all the state for our player
// Think of it like a "database" for our app
const playerState = {
    playlist: [],          // Array of File objects
    currentIndex: -1,      // Index of the currently selected track (-1 = none)
    isPlaying: false,      // Are we currently playing?
};

// ============================================
// DOM REFERENCES
// ============================================

// Cache DOM elements so we don't have to query them repeatedly
// This is more efficient than using querySelector every time
const DOM = {
    // File input
    fileInput: document.getElementById('fileInput'),
    fileCount: document.getElementById('fileCount'),

    // Playlist
    playlist: document.getElementById('playlist'),

    // Now playing info
    nowPlayingTitle: document.getElementById('nowPlayingTitle'),
    nowPlayingArtist: document.getElementById('nowPlayingArtist'),

    // Progress bar and time
    progressFill: document.getElementById('progressFill'),
    seekBar: document.getElementById('seekBar'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),

    // Buttons
    playBtn: document.getElementById('playBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),

    // Audio element (the actual player)
    audio: document.getElementById('audioElement'),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format seconds into a readable time string
 * e.g., 204 seconds -> "3:24"
 */
function formatTime(seconds) {
    // Handle invalid inputs
    if (!isFinite(seconds) || seconds < 0) {
        return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    // Pad seconds with a leading zero if needed
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract a friendly name from a file
 * e.g., "/path/to/song.mp3" -> "song"
 */
function getFilenameStem(file) {
    // Get just the filename without the path
    const nameWithExtension = file.name;

    // Remove the file extension
    return nameWithExtension.replace(/\.[^/.]+$/, '');
}

// ============================================
// FILE HANDLING
// ============================================

/**
 * Handle when the user selects files
 * This is called when they click the file input
 */
function handleFileSelection(event) {
    // Get the array of selected File objects
    const selectedFiles = Array.from(event.target.files);

    // Only accept audio files (filter out anything else)
    const audioFiles = selectedFiles.filter(file =>
        file.type.startsWith('audio/')
    );

    if (audioFiles.length === 0) {
        alert('No audio files selected. Please select .mp3, .wav, .ogg, etc.');
        return;
    }

    // Add the new files to our playlist
    playerState.playlist.push(...audioFiles);

    // If this is the first file, select it
    if (playerState.currentIndex === -1 && playerState.playlist.length > 0) {
        playerState.currentIndex = 0;
    }

    // Update the UI to reflect the new playlist
    updateFileCount();
    renderPlaylist();
}

/**
 * Update the file count display
 */
function updateFileCount() {
    const count = playerState.playlist.length;

    if (count === 0) {
        DOM.fileCount.textContent = 'No files selected';
    } else if (count === 1) {
        DOM.fileCount.textContent = '1 file selected';
    } else {
        DOM.fileCount.textContent = `${count} files selected`;
    }
}

// ============================================
// PLAYLIST RENDERING
// ============================================

/**
 * Render the entire playlist to the DOM
 * This is called whenever the playlist changes
 */
function renderPlaylist() {
    // Clear the current playlist display
    DOM.playlist.innerHTML = '';

    // If no files, show empty state
    if (playerState.playlist.length === 0) {
        DOM.playlist.innerHTML = '<div class="playlist-empty">Select files to start playing</div>';
        return;
    }

    // For each file in the playlist, create a list item
    playerState.playlist.forEach((file, index) => {
        // Create the list item element
        const item = document.createElement('div');
        item.className = 'playlist-item';

        // Mark the currently playing track
        if (index === playerState.currentIndex) {
            item.classList.add('active');
        }

        // Set the content
        item.innerHTML = `
            <div class="playlist-item-title">${getFilenameStem(file)}</div>
            <div class="playlist-item-filename">${file.name}</div>
        `;

        // When the user clicks this item, play it
        item.addEventListener('click', () => {
            playerState.currentIndex = index;
            loadAndPlayTrack();
            renderPlaylist(); // Re-render to show the new active track
        });

        // Add the item to the playlist
        DOM.playlist.appendChild(item);
    });
}

// ============================================
// AUDIO LOADING & PLAYBACK
// ============================================

/**
 * Load the current track and start playing it
 * This handles reading the file and setting up the audio element
 */
function loadAndPlayTrack() {
    // Check if we have a valid track to play
    if (playerState.currentIndex < 0 || playerState.currentIndex >= playerState.playlist.length) {
        return;
    }

    // Get the current file
    const currentFile = playerState.playlist[playerState.currentIndex];

    // Create a URL that points to this file
    // This is necessary to play local files in the browser
    const fileUrl = URL.createObjectURL(currentFile);

    // Set the audio element's source
    DOM.audio.src = fileUrl;

    // Update the "now playing" info
    updateNowPlayingInfo();

    // Start playing
    DOM.audio.play();
    playerState.isPlaying = true;
    updatePlayButton();
}

/**
 * Update the "now playing" title and artist display
 */
function updateNowPlayingInfo() {
    if (playerState.currentIndex < 0 || playerState.currentIndex >= playerState.playlist.length) {
        DOM.nowPlayingTitle.textContent = 'No track selected';
        DOM.nowPlayingArtist.textContent = 'Select a file to start';
        return;
    }

    const file = playerState.playlist[playerState.currentIndex];

    // For Phase 1, we just show the filename
    // Phase 2 will parse ID3 tags for artist/album info
    DOM.nowPlayingTitle.textContent = getFilenameStem(file);
    DOM.nowPlayingArtist.textContent = `File: ${file.name}`;
}

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

    // If we're playing, pause
    if (playerState.isPlaying) {
        DOM.audio.pause();
        playerState.isPlaying = false;
    } else {
        // If we're paused, resume
        DOM.audio.play();
        playerState.isPlaying = true;
    }

    updatePlayButton();
}

/**
 * Update the play button text to match the current state
 */
function updatePlayButton() {
    DOM.playBtn.textContent = playerState.isPlaying ? '⏸ Pause' : '▶ Play';
}

/**
 * Play the next track in the playlist
 */
function playNextTrack() {
    // If we're at the end, stop (or loop if you prefer)
    if (playerState.currentIndex < playerState.playlist.length - 1) {
        playerState.currentIndex++;
        loadAndPlayTrack();
        renderPlaylist();
    }
}

/**
 * Play the previous track in the playlist
 */
function playPreviousTrack() {
    // If we're at the start, stop (or go to the end if you prefer)
    if (playerState.currentIndex > 0) {
        playerState.currentIndex--;
        loadAndPlayTrack();
        renderPlaylist();
    }
}

// ============================================
// PROGRESS BAR & SEEKING
// ============================================

/**
 * Update the progress bar and time display
 * This is called frequently while the audio is playing
 */
function updateProgress() {
    // Get the current playback position and duration
    const currentTime = DOM.audio.currentTime;
    const duration = DOM.audio.duration;

    // Calculate the progress as a percentage (0-100)
    const progressPercent = (currentTime / duration) * 100;

    // Update the visual progress bar
    DOM.progressFill.style.width = `${progressPercent}%`;

    // Update the time display
    DOM.currentTime.textContent = formatTime(currentTime);
    DOM.duration.textContent = formatTime(duration);

    // Update the seek bar position (but only if the user isn't dragging it)
    // This prevents the slider from jumping while the user is trying to seek
    if (!DOM.seekBar.dataset.dragging) {
        DOM.seekBar.max = duration || 100;
        DOM.seekBar.value = currentTime || 0;
    }
}

/**
 * Handle when the user clicks or drags the seek bar
 */
function handleSeek() {
    // Get the new position directly - the seek bar's value is already in seconds
    // because we set its max to the duration in updateProgress()
    const newTime = parseFloat(DOM.seekBar.value);

    // Update the audio playback position
    DOM.audio.currentTime = newTime;

    // Update the progress display immediately
    updateProgress();
}

/**
 * Mark when the user starts dragging the seek bar
 */
function startSeekDrag() {
    DOM.seekBar.dataset.dragging = 'true';
}

/**
 * Mark when the user stops dragging the seek bar
 */
function stopSeekDrag() {
    DOM.seekBar.dataset.dragging = 'false';
    handleSeek();
}

// ============================================
// EVENT LISTENERS
// ============================================

// File selection
DOM.fileInput.addEventListener('change', handleFileSelection);

// Playback controls
DOM.playBtn.addEventListener('click', togglePlayPause);
DOM.nextBtn.addEventListener('click', playNextTrack);
DOM.prevBtn.addEventListener('click', playPreviousTrack);

// Progress bar and seeking
DOM.seekBar.addEventListener('mousedown', startSeekDrag);
DOM.seekBar.addEventListener('touchstart', startSeekDrag);
DOM.seekBar.addEventListener('mouseup', stopSeekDrag);
DOM.seekBar.addEventListener('touchend', stopSeekDrag);
DOM.seekBar.addEventListener('input', handleSeek);

// Audio element events
// Update the progress bar as the audio plays
DOM.audio.addEventListener('timeupdate', updateProgress);

// When the track ends, play the next one
DOM.audio.addEventListener('ended', () => {
    playNextTrack();
});

// Update duration when metadata is loaded
DOM.audio.addEventListener('loadedmetadata', updateProgress);

// Update play/pause button when audio starts/stops
DOM.audio.addEventListener('play', () => {
    playerState.isPlaying = true;
    updatePlayButton();
});

DOM.audio.addEventListener('pause', () => {
    playerState.isPlaying = false;
    updatePlayButton();
});

// ============================================
// INITIALIZATION
// ============================================

// On page load, set up the initial UI
window.addEventListener('DOMContentLoaded', () => {
    updateFileCount();
    renderPlaylist();
    updateNowPlayingInfo();
    updatePlayButton();
});
