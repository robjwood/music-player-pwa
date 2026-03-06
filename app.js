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
    library: [],            // Array of Track objects with metadata (all tracks)
    displayedTracks: [],    // Array of Track objects (currently visible, sorted)
    originalDisplayed: [],  // Original order (for shuffle/unshuffle)
    playlist: [],           // Array of File objects (parallel to displayedTracks)
    playlists: [],          // Array of saved playlists
    currentIndex: -1,       // Index of the currently selected track (-1 = none)
    isPlaying: false,       // Are we currently playing?
    isLooping: false,       // Should we loop the playlist when it ends?
    isShuffling: false,     // Should we shuffle the playlist?
    fromFolder: false,      // Was the playlist loaded from a folder pick?
    pendingTrack: null,     // Track waiting to be added to a playlist
    pendingTracks: null,    // Multiple tracks waiting to be added to a playlist
    currentPlaylistId: null,// ID of the currently selected playlist (if any)
    sortedLibrary: [],      // Cached sorted version of full library (for fast tab switching)
    playbackReady: false,   // Are File objects loaded and playback available?
    lastLoadedFileName: null,  // Filename of the last loaded track (for position resumption)
};

// ============================================
// DOM & COMPONENT REFERENCES
// ============================================

const DOM = {
    audio: document.getElementById('audioElement'),
    fileSelector: document.querySelector('file-selector'),
    playlistView: document.querySelector('playlist-view'),
    playerControls: document.querySelector('player-controls'),
    progressBar: document.querySelector('progress-bar'),
    nowPlayingInfo: document.querySelector('now-playing-info'),
    libraryBrowser: document.querySelector('library-browser'),
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

/**
 * Sort tracks by album year, album name, then track number
 * @param {Track[]} tracks - Array of Track objects
 * @returns {Track[]} Sorted array
 */
function sortTracksByAlbumAndNumber(tracks) {
    // Determine canonical year per album (minimum year among all its tracks)
    const albumYear = {};
    tracks.forEach(t => {
        const yr = parseInt(t.year, 10);
        if (!isNaN(yr)) {
            if (albumYear[t.album] === undefined || yr < albumYear[t.album]) {
                albumYear[t.album] = yr;
            }
        }
    });

    return [...tracks].sort((a, b) => {
        const yearA = albumYear[a.album] ?? 9999;
        const yearB = albumYear[b.album] ?? 9999;
        if (yearA !== yearB) return yearA - yearB;
        if (a.album !== b.album) return a.album.localeCompare(b.album);
        const nA = parseInt((a.track || '').split('/')[0], 10) || 0;
        const nB = parseInt((b.track || '').split('/')[0], 10) || 0;
        return nA - nB;
    });
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param {Track[]} tracks - Array to shuffle
 * @returns {Track[]} Shuffled copy
 */
function shuffleArray(tracks) {
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// FILE HANDLING
// ============================================

/**
 * Handle when the user selects files from a folder
 */
async function handleFilesSelected(event) {
    const audioFiles = event.detail.files;
    const folderHandle = event.detail.folderHandle;
    const folderName = event.detail.folderName;

    // IMPORTANT: Clear old library when loading fresh files to remove fake snapshot objects
    playerState.library = [];
    playerState.fromFolder = true;
    playerState.lastLoadedFileName = null;  // Reset track filename for position resumption
    saveLastTrackIndex(0);
    localStorage.removeItem('music-player-last-position');  // Clear old playback position
    localStorage.removeItem('music-player-last-position-file');  // Clear old track filename

    // Parse metadata asynchronously
    const tracks = await MusicMetadata.parseAllMetadata(
        audioFiles,
        (loaded, total) => {
            DOM.fileSelector.updateFileCount(`Loading metadata… ${loaded}/${total}`);
            // Also update loading screen if visible
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                updateLoadingProgress(`Parsing metadata… ${loaded}/${total}`);
            }
        }
    );

    // Add tracks to library (fresh start, no duplicates check needed)
    playerState.library = tracks;
    const newTracks = tracks;

    // Track how many duplicates were skipped
    const duplicateCount = tracks.length - newTracks.length;
    if (duplicateCount > 0) {
        console.log(`Skipped ${duplicateCount} duplicate file(s)`);
    }

    // Add tracks to library (instead of replacing)
    playerState.library.push(...newTracks);

    // Save folder handle for this folder
    if (folderHandle) {
        await MusicPlayerDB.addFolderHandle(folderHandle)
            .catch(err => console.warn('Failed to save folder handle:', err));
    }

    // Cache metadata for this folder (for faster restore if folder handle is still valid)
    if (playerState.fromFolder && folderName) {
        console.log(`Caching metadata for folder: ${folderName}`);

        try {
            await MusicPlayerDB.saveFolderMetadata(folderName, playerState.library);
            console.log('✓ Metadata cached successfully');
        } catch (err) {
            console.warn('Failed to save metadata cache:', err);
        }
    }

    // Sort tracks and cache the sorted library for fast tab switching
    const sorted = sortTracksByAlbumAndNumber(playerState.library);
    playerState.sortedLibrary = sorted;  // Cache for fast tab switches
    playerState.displayedTracks = sorted;
    playerState.originalDisplayed = [];
    playerState.isShuffling = false;
    playerState.playlist = sorted.map(t => t.file);
    playerState.playbackReady = true;  // File objects are loaded, playback is ready
    DOM.playerControls.setShuffleState(false);

    // If this is the first file, select it
    if (playerState.currentIndex === -1 && playerState.playlist.length > 0) {
        playerState.currentIndex = 0;
    }

    // Set library in browser (will emit library-filter-changed with all tracks)
    DOM.libraryBrowser.setLibrary(playerState.library);

    // Load and set playlists
    await loadAndSetPlaylists();

    // Update the UI with full library for global search
    DOM.playlistView.setTracks(playerState.displayedTracks, null, true, playerState.sortedLibrary);
    DOM.fileSelector.updateFileCount(playerState.playlist.length);
    DOM.playlistView.setCurrentTrack(playerState.currentIndex);
    DOM.playerControls.setPlayState(playerState.isPlaying);

    // Update now-playing
    if (playerState.currentIndex >= 0 && playerState.currentIndex < playerState.playlist.length) {
        const currentFile = playerState.playlist[playerState.currentIndex];
        const currentTrack = playerState.library.find(t => t.file === currentFile) || null;
        DOM.nowPlayingInfo.setTrack(currentFile, currentTrack);
    }
}

/**
 * Handle when the user clears the playlist
 */
function handleClearPlaylist() {
    // Stop the audio
    DOM.audio.pause();
    DOM.audio.src = '';

    // Reset the player state
    playerState.library = [];
    playerState.displayedTracks = [];
    playerState.playlist = [];
    playerState.currentIndex = -1;
    playerState.isPlaying = false;
    playerState.fromFolder = false;
    playerState.lastLoadedFileName = null;  // Reset track filename for position resumption

    // Clear library browser
    DOM.libraryBrowser.setLibrary([]);

    // Clear persistence (but not volume preference)
    MusicPlayerDB.clearAllFolderHandles().catch(err => console.warn('Failed to clear folder handle:', err));
    localStorage.removeItem('music-player-last-index');
    localStorage.removeItem('music-player-last-position');
    localStorage.removeItem('music-player-last-position-file');

    // Update the UI
    updateAllComponents();
}

/**
 * Handle when the library browser filters the library
 */
function handleLibraryFilterChanged(event) {
    console.time('handleLibraryFilterChanged-total');
    const filteredTracks = event.detail.tracks;
    const playlistId = event.detail.playlistId || null;
    const currentFile = playerState.playlist[playerState.currentIndex] || null;

    // Track the currently selected playlist
    playerState.currentPlaylistId = playlistId;

    console.time('handleLibraryFilterChanged-sort');
    // Filter pre-sorted library for fast tab switching
    // If viewing all tracks, use the cached sorted library
    let sorted;
    if (filteredTracks.length === playerState.library.length) {
        // Viewing all tracks - use cached sorted version
        sorted = playerState.sortedLibrary;
    } else {
        // Viewing a filtered subset (artist, album, or playlist)
        // Filter the cached sorted library to maintain sort order
        const filteredSet = new Set(filteredTracks.map(t => t.file.name));
        sorted = playerState.sortedLibrary.filter(t => filteredSet.has(t.file.name));
    }
    console.timeEnd('handleLibraryFilterChanged-sort');

    console.time('handleLibraryFilterChanged-state');
    playerState.displayedTracks = sorted;
    playerState.originalDisplayed = [];
    playerState.isShuffling = false;
    playerState.playlist = sorted.map(t => t.file);
    DOM.playerControls.setShuffleState(false);

    // Try to keep current track active in new view
    const newIndex = currentFile ? playerState.playlist.indexOf(currentFile) : -1;
    playerState.currentIndex = newIndex;
    console.timeEnd('handleLibraryFilterChanged-state');

    console.time('handleLibraryFilterChanged-UI');
    // Update UI components with full library for global search
    DOM.playlistView.setTracks(playerState.displayedTracks, playlistId, true, playerState.sortedLibrary);
    if (playerState.currentIndex >= 0) {
        DOM.playlistView.setCurrentTrack(playerState.currentIndex);
    }
    DOM.fileSelector.updateFileCount(playerState.playlist.length);

    // Update now-playing in case metadata display needs to change
    if (playerState.currentIndex >= 0) {
        const currentTrack = playerState.library.find(t => t.file === currentFile) || null;
        DOM.nowPlayingInfo.setTrack(currentFile, currentTrack);
    }
    console.timeEnd('handleLibraryFilterChanged-UI');
    console.timeEnd('handleLibraryFilterChanged-total');
}

/**
 * Load playlists from IndexedDB and set them in the library browser
 */
async function loadAndSetPlaylists() {
    try {
        const playlists = await MusicPlayerDB.getPlaylists();

        // Ensure "Liked" playlist exists
        const hasLiked = playlists.some(p => p.name === '♥ Liked');
        if (!hasLiked) {
            await getOrCreateLikedPlaylist();
            // Reload to include the newly created Liked playlist
            const updatedPlaylists = await MusicPlayerDB.getPlaylists();
            DOM.libraryBrowser.setPlaylists(updatedPlaylists);
            return;
        }

        DOM.libraryBrowser.setPlaylists(playlists);
    } catch (err) {
        console.warn('Failed to load playlists:', err);
    }
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
        console.warn('Invalid track index');
        return;
    }

    const currentFile = playerState.playlist[playerState.currentIndex];

    // Validate it's a real File object
    if (!currentFile || !(currentFile instanceof File)) {
        console.error('Track is not a valid File object:', currentFile);
        alert('Error: Track file is invalid. Try reloading the folder.');
        return;
    }

    // Save the current index for folder playlists
    if (playerState.fromFolder) {
        saveLastTrackIndex(playerState.currentIndex);
    }

    // Create a URL for the file
    const fileUrl = URL.createObjectURL(currentFile);

    // Set the audio source and start playing
    DOM.audio.src = fileUrl;
    const playPromise = DOM.audio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                playerState.isPlaying = true;
                console.log('Audio playback started');
                // Restore playback position (will check filename to ensure it's the same track)
                restorePlaybackPosition();
            })
            .catch(err => {
                console.error('Playback failed:', err);
                playerState.isPlaying = false;
                updateAllComponents();
            });
    } else {
        playerState.isPlaying = true;
        // Restore playback position (will check filename to ensure it's the same track)
        restorePlaybackPosition();
    }

    // Update the last loaded track filename
    playerState.lastLoadedFileName = currentFile.name;

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

    // If a track is selected but no audio source is loaded, load it now
    if (!DOM.audio.src && playerState.currentIndex >= 0) {
        loadAndPlayTrack();
        return;
    }

    // Toggle play/pause
    if (playerState.isPlaying) {
        DOM.audio.pause();
        playerState.isPlaying = false;
    } else {
        const playPromise = DOM.audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    playerState.isPlaying = true;
                    console.log('Audio playback resumed');
                })
                .catch(err => {
                    console.error('Playback resume failed:', err);
                    playerState.isPlaying = false;
                });
        } else {
            playerState.isPlaying = true;
        }
    }

    updateAllComponents();
}

/**
 * Handle seeking from the progress bar
 */
function handleSeek(event) {
    const newTime = event.detail.time;
    DOM.audio.currentTime = newTime;
}

/**
 * Toggle loop mode
 */
function toggleLoop() {
    playerState.isLooping = !playerState.isLooping;
    DOM.playerControls.setLoopState(playerState.isLooping);
}

/**
 * Handle adding a track to a playlist
 */
async function handleAddTrackToPlaylist(event) {
    const track = event.detail.track;
    playerState.pendingTrack = track;

    // Load playlists and show modal
    await loadAndShowPlaylistModal();
}

/**
 * Handle adding all filtered tracks to a playlist
 */
async function handleAddAllToPlaylist(event) {
    const tracks = event.detail.tracks;
    playerState.pendingTracks = tracks;

    // Load playlists and show modal
    await loadAndShowPlaylistModal(true);
}

/**
 * Handle adding current track to the "Liked" playlist
 */
async function handleAddToLiked(event) {
    const track = event.detail.track;

    try {
        // Get or create the "Liked" playlist
        const likedPlaylist = await getOrCreateLikedPlaylist();

        // Add track to the playlist
        await MusicPlayerDB.addTrackToPlaylist(likedPlaylist.id, track);
        console.log(`✓ Added "${track.title}" to Liked playlist`);

        // Show brief notification
        alert(`Added to Liked playlist! ♥`);

        // Reload playlists in sidebar
        await loadAndSetPlaylists();
    } catch (err) {
        console.warn('Failed to add track to Liked playlist:', err);
        alert('Error adding to Liked playlist');
    }
}

/**
 * Get the "Liked" playlist, creating it if it doesn't exist
 */
async function getOrCreateLikedPlaylist() {
    try {
        const playlists = await MusicPlayerDB.getPlaylists();
        let likedPlaylist = playlists.find(p => p.name === '♥ Liked');

        if (!likedPlaylist) {
            // Create the Liked playlist if it doesn't exist
            const playlistId = await MusicPlayerDB.createPlaylist('♥ Liked');
            likedPlaylist = await MusicPlayerDB.getPlaylist(playlistId);
        }

        return likedPlaylist;
    } catch (err) {
        console.error('Failed to get/create Liked playlist:', err);
        throw err;
    }
}

/**
 * Load playlists and show the modal
 * @param {boolean} isMultiple - Whether adding multiple tracks (vs single track)
 */
async function loadAndShowPlaylistModal(isMultiple = false) {
    try {
        playerState.playlists = await MusicPlayerDB.getPlaylists();
        showPlaylistModal(isMultiple);
    } catch (err) {
        console.warn('Failed to load playlists:', err);
        alert('Error loading playlists');
    }
}

/**
 * Show the playlist selection modal
 * @param {boolean} isMultiple - Whether adding multiple tracks
 */
function showPlaylistModal(isMultiple = false) {
    const modal = document.getElementById('playlistModal');
    const modalTitle = modal.querySelector('h2');
    const playlistList = document.getElementById('playlistList');
    const newPlaylistInput = document.getElementById('newPlaylistName');

    // Update title based on single or multiple tracks
    if (isMultiple) {
        modalTitle.textContent = `Add ${playerState.pendingTracks?.length || 0} Tracks to Playlist`;
        newPlaylistInput.placeholder = 'Or create new playlist for these tracks...';
    } else {
        modalTitle.textContent = 'Add to Playlist';
        newPlaylistInput.placeholder = 'Or create new playlist...';
    }

    // Clear previous list
    playlistList.innerHTML = '';
    newPlaylistInput.value = '';

    // Show existing playlists
    if (playerState.playlists.length > 0) {
        playerState.playlists.forEach(p => {
            const div = document.createElement('div');
            div.className = 'playlist-option';
            div.textContent = `${p.name} (${p.tracks.length})`;
            div.addEventListener('click', () => {
                addTrackToPlaylist(p.id);
                modal.close();
            });
            playlistList.appendChild(div);
        });
    } else {
        const msg = document.createElement('div');
        msg.style.color = '#888';
        msg.textContent = 'No playlists yet. Create one below.';
        playlistList.appendChild(msg);
    }

    modal.showModal();
}

/**
 * Add the pending track(s) to a playlist
 */
async function addTrackToPlaylist(playlistId) {
    const tracksToAdd = playerState.pendingTracks || (playerState.pendingTrack ? [playerState.pendingTrack] : []);
    if (tracksToAdd.length === 0) return;

    try {
        for (const track of tracksToAdd) {
            await MusicPlayerDB.addTrackToPlaylist(playlistId, track);
        }
        alert(`Added ${tracksToAdd.length} track${tracksToAdd.length > 1 ? 's' : ''} to playlist!`);
        playerState.pendingTrack = null;
        playerState.pendingTracks = null;
        // Reload playlists in sidebar
        await loadAndSetPlaylists();
    } catch (err) {
        console.warn('Failed to add track(s) to playlist:', err);
        alert('Error adding track(s) to playlist');
    }
}

/**
 * Create a new playlist and add track
 */
async function createAndAddPlaylist() {
    const playlistName = document.getElementById('newPlaylistName').value.trim();
    if (!playlistName) {
        alert('Please enter a playlist name');
        return;
    }

    try {
        const playlistId = await MusicPlayerDB.createPlaylist(playlistName);
        await addTrackToPlaylist(playlistId);
        // addTrackToPlaylist already reloads playlists
        document.getElementById('playlistModal').close();
    } catch (err) {
        console.warn('Failed to create playlist:', err);
        alert('Error creating playlist');
    }
}

/**
 * Handle deleting a track from a playlist
 */
async function handleDeleteTrackFromPlaylist(event) {
    if (!playerState.currentPlaylistId) {
        console.warn('No playlist selected');
        return;
    }

    const track = event.detail.track;

    try {
        await MusicPlayerDB.removeTrackFromPlaylist(playerState.currentPlaylistId, track.file.name);

        // Reload the current playlist to reflect the deletion
        const updatedPlaylist = await MusicPlayerDB.getPlaylist(playerState.currentPlaylistId);
        if (updatedPlaylist) {
            // Build updated track list
            const updatedTracks = updatedPlaylist.tracks.map(pt => {
                const libraryTrack = playerState.library.find(t => t.file.name === pt.fileName);
                if (libraryTrack) {
                    return libraryTrack;
                }
                return {
                    file: { name: pt.fileName },
                    title: pt.title,
                    artist: pt.artist,
                    album: pt.album,
                    track: pt.track,
                    year: pt.year,
                    duration: pt.duration,
                    unavailable: true,
                };
            });

            // Update display and cache
            const sorted = sortTracksByAlbumAndNumber(updatedTracks);
            playerState.sortedLibrary = sorted;  // Cache for fast tab switching
            playerState.displayedTracks = sorted;
            playerState.playlist = sorted.map(t => t.file);
            playerState.currentIndex = -1;

            DOM.playlistView.setTracks(playerState.displayedTracks, playerState.currentPlaylistId, true, playerState.sortedLibrary);
            DOM.fileSelector.updateFileCount(playerState.playlist.length);
        }

        // Reload playlists in sidebar to update track counts
        await loadAndSetPlaylists();
    } catch (err) {
        console.warn('Failed to delete track from playlist:', err);
        alert('Error removing track from playlist');
    }
}

/**
 * Toggle shuffle mode
 */
function toggleShuffle() {
    console.time('toggleShuffle-total');
    playerState.isShuffling = !playerState.isShuffling;

    console.time('toggleShuffle-shuffle');
    if (playerState.isShuffling) {
        // Save the original order and shuffle
        playerState.originalDisplayed = playerState.displayedTracks;
        playerState.displayedTracks = shuffleArray(playerState.displayedTracks);
    } else {
        // Restore original order
        playerState.displayedTracks = playerState.originalDisplayed;
        playerState.originalDisplayed = [];
    }
    console.timeEnd('toggleShuffle-shuffle');

    console.time('toggleShuffle-updatePlaylist');
    // Update playlist File array to match the new order
    playerState.playlist = playerState.displayedTracks.map(t => t.file);
    console.timeEnd('toggleShuffle-updatePlaylist');

    console.time('toggleShuffle-findCurrent');
    // Re-find the current track in the new order
    const currentFile = DOM.audio.src ? playerState.playlist.find(f => URL.createObjectURL(f) === DOM.audio.src) : null;
    if (currentFile) {
        playerState.currentIndex = playerState.playlist.indexOf(currentFile);
    } else if (playerState.currentIndex >= 0 && playerState.currentIndex < playerState.playlist.length) {
        // Keep current index if it's still valid
    } else {
        playerState.currentIndex = -1;
    }
    console.timeEnd('toggleShuffle-findCurrent');

    console.time('toggleShuffle-updateUI');
    // Update UI with full library for global search
    DOM.playerControls.setShuffleState(playerState.isShuffling);
    DOM.playlistView.setTracks(playerState.displayedTracks, null, true, playerState.sortedLibrary);
    if (playerState.currentIndex >= 0) {
        DOM.playlistView.setCurrentTrack(playerState.currentIndex);
    }
    console.timeEnd('toggleShuffle-updateUI');
    console.timeEnd('toggleShuffle-total');
}

// ============================================
// AUDIO EVENTS
// ============================================

/**
 * Smooth progress bar updates using requestAnimationFrame
 */
let animationFrameId = null;

function updateProgressSmooth() {
    const currentTime = DOM.audio.currentTime;
    const duration = DOM.audio.duration;
    DOM.progressBar.updateProgress(currentTime, duration);

    // Continue updating while playing
    if (!DOM.audio.paused) {
        animationFrameId = requestAnimationFrame(updateProgressSmooth);
    }
}

function onTimeUpdate() {
    // Start smooth animation loop if not already running
    if (DOM.audio.paused === false && !animationFrameId) {
        animationFrameId = requestAnimationFrame(updateProgressSmooth);
    }
}

/**
 * When track ends, play the next one (or loop to beginning if enabled)
 */
function onTrackEnd() {
    if (playerState.currentIndex >= playerState.playlist.length - 1) {
        // At the end of playlist
        if (playerState.isLooping) {
            // Loop back to beginning
            playerState.currentIndex = 0;
            loadAndPlayTrack();
        }
        // Otherwise do nothing (stop playing)
    } else {
        // Not at end, play next track
        playNextTrack();
    }
}

/**
 * When audio starts/stops, update the play button
 */
function onPlayPauseChange() {
    playerState.isPlaying = !DOM.audio.paused;
    DOM.playerControls.setPlayState(playerState.isPlaying);

    // Cancel animation frame if paused
    if (DOM.audio.paused && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// ============================================
// COMPONENT UPDATES
// ============================================

/**
 * Update all components to reflect the current state
 */
function updateAllComponents() {
    // Update playlist view (don't clear search - just updating which track is current)
    // Pass full sorted library for global search capability
    DOM.playlistView.setTracks(playerState.displayedTracks, playerState.currentPlaylistId, false, playerState.sortedLibrary);
    if (playerState.currentIndex >= 0) {
        DOM.playlistView.setCurrentTrack(playerState.currentIndex);
    }

    // Update file count
    DOM.fileSelector.updateFileCount(playerState.playlist.length);

    // Update now playing info
    if (playerState.currentIndex >= 0 && playerState.currentIndex < playerState.playlist.length) {
        const currentFile = playerState.playlist[playerState.currentIndex];
        const currentTrack = playerState.library.find(t => t.file === currentFile) || null;
        DOM.nowPlayingInfo.setTrack(currentFile, currentTrack);
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
    // Check both direct input elements and inputs inside Shadow DOM
    const composedPath = event.composedPath();
    const hasActiveInput = composedPath.some(el => {
        return el.tagName === 'INPUT' && el.type !== 'range';
    });

    if (hasActiveInput) {
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

// Library browser events
DOM.libraryBrowser.addEventListener('library-filter-changed', handleLibraryFilterChanged);

// Playlist events
DOM.playlistView.addEventListener('track-selected', handleTrackSelected);
DOM.playlistView.addEventListener('add-track-to-playlist', handleAddTrackToPlaylist);
DOM.playlistView.addEventListener('add-all-to-playlist', handleAddAllToPlaylist);
DOM.playlistView.addEventListener('delete-track-from-playlist', handleDeleteTrackFromPlaylist);

// Now playing events (add to playlist from player)
DOM.nowPlayingInfo.addEventListener('add-to-liked', handleAddToLiked);
DOM.nowPlayingInfo.addEventListener('add-to-playlist', handleAddTrackToPlaylist);

// Playlist Modal events
document.getElementById('closePlaylistModal').addEventListener('click', () => {
    document.getElementById('playlistModal').close();
});

document.getElementById('createPlaylistBtn').addEventListener('click', createAndAddPlaylist);

// Close modal when clicking outside
document.getElementById('playlistModal').addEventListener('click', (e) => {
    if (e.target.id === 'playlistModal') {
        e.target.close();
    }
});

// Player controls events
DOM.playerControls.addEventListener('play-pause', togglePlayPause);
DOM.playerControls.addEventListener('next-track', playNextTrack);
DOM.playerControls.addEventListener('previous-track', playPreviousTrack);
DOM.playerControls.addEventListener('toggle-loop', toggleLoop);
DOM.playerControls.addEventListener('toggle-shuffle', toggleShuffle);

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

// Save playback position periodically (every 5 seconds)
DOM.audio.addEventListener('timeupdate', () => {
    // Only save every 5 seconds to avoid excessive writes
    if (Math.floor(DOM.audio.currentTime) % 5 === 0 && DOM.audio.currentTime > 0) {
        savePlaybackPosition();
    }
});
DOM.audio.addEventListener('error', (e) => {
    const error = DOM.audio.error;
    console.error('Audio error:', {
        code: error?.code,
        message: error?.message,
        mediaError: error
    });
});

// ============================================
// PERSISTENCE HELPERS
// ============================================

/**
 * Save the current track index and playback position to localStorage
 */
function saveLastTrackIndex(index) {
    if (playerState.fromFolder) {
        localStorage.setItem('music-player-last-index', String(index));
    }
}

/**
 * Save the current playback position and track filename
 */
function savePlaybackPosition() {
    if (playerState.fromFolder && playerState.currentIndex >= 0) {
        const currentFile = playerState.playlist[playerState.currentIndex];
        const currentTime = DOM.audio.currentTime || 0;
        localStorage.setItem('music-player-last-position', String(currentTime));
        localStorage.setItem('music-player-last-position-file', currentFile.name);
    }
}

/**
 * Restore the last playback position (only if the filename matches)
 */
function restorePlaybackPosition() {
    const currentFile = playerState.playlist[playerState.currentIndex];
    const savedFileName = localStorage.getItem('music-player-last-position-file');

    // Only restore position if the saved file matches the current file
    if (savedFileName === currentFile.name) {
        const savedPosition = localStorage.getItem('music-player-last-position');
        if (savedPosition) {
            const position = parseFloat(savedPosition);
            if (!isNaN(position) && position > 0) {
                DOM.audio.currentTime = position;
                console.log(`Restored playback position: ${position.toFixed(2)}s`);
            }
        }
    }
}

/**
 * Load library from cached snapshot instantly (without rescanning folder)
 */
async function loadFromSnapshot() {
    try {
        const snapshot = await MusicPlayerDB.getLastFolderSnapshot();
        if (!snapshot) {
            console.log('No snapshot found in cache');
            return false;
        }

        console.log(`✓ Loading from snapshot: ${snapshot.folderName} (${snapshot.trackCount} songs)`);

        // Create Track objects from cached metadata
        const tracks = snapshot.tracks.map(cached => ({
            file: {
                name: cached.fileName,
                size: cached.fileSize,
            },
            title: cached.title,
            artist: cached.artist,
            album: cached.album,
            track: cached.track,
            year: cached.year,
            duration: cached.duration,
        }));

        // Sort and populate library
        playerState.library = tracks;
        playerState.sortedLibrary = sortTracksByAlbumAndNumber(tracks);
        playerState.displayedTracks = playerState.sortedLibrary;
        playerState.playlist = tracks.map(t => t.file);
        playerState.fromFolder = true;

        // Set library in browser
        DOM.libraryBrowser.setLibrary(playerState.library);
        await loadAndSetPlaylists();

        // Restore last track index
        const savedIndex = localStorage.getItem('music-player-last-index');
        if (savedIndex !== null) {
            const index = parseInt(savedIndex, 10);
            if (!isNaN(index) && index >= 0 && index < playerState.playlist.length) {
                playerState.currentIndex = index;
            }
        }

        return true;
    } catch (err) {
        console.warn('Failed to load from snapshot:', err);
        return false;
    }
}

/**
 * Verify snapshot validity in the background
 * Checks if folder still accessible and file count matches
 */
async function verifySnapshotInBackground() {
    try {
        const snapshot = await MusicPlayerDB.getLastFolderSnapshot();
        if (!snapshot) return;

        // Try to get the folder handles
        let handles;
        try {
            handles = await MusicPlayerDB.getFolderHandles();
        } catch (err) {
            console.warn('Failed to retrieve folder handles for verification:', err);
            return;
        }

        if (!handles || handles.length === 0) return;

        // Find matching folder
        const matchingHandle = handles.find(h => h.name === snapshot.folderName);
        if (!matchingHandle) return;

        // Check permission
        const permission = await matchingHandle.queryPermission({ mode: 'read' });
        if (permission !== 'granted') return;

        // Quick file count check
        let fileCount = 0;
        try {
            for await (const entry of matchingHandle.entries()) {
                if (entry[1].kind === 'file') {
                    const name = entry[0].toLowerCase();
                    if (/\.(mp3|wav|flac|m4a|ogg|wma)$/i.test(name)) {
                        fileCount++;
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to verify snapshot:', err);
            return;
        }

        // If file count differs significantly, the snapshot is stale
        const expectedCount = snapshot.trackCount;
        const percentChange = Math.abs(fileCount - expectedCount) / expectedCount;

        if (percentChange > 0.1) {
            // More than 10% change detected, offer to rescan
            console.warn(`Folder has changed: ${fileCount} files vs ${expectedCount} cached`);
            DOM.fileSelector.showRestoreBanner(
                `${snapshot.folderName} - files changed. Click to refresh.`,
                async () => {
                    try {
                        await restoreFolderFromHandle(matchingHandle);
                        updateAllComponents();
                    } catch (err) {
                        console.warn('Failed to refresh folder:', err);
                    }
                }
            );
        } else {
            console.log(`✓ Snapshot verified: folder intact (${fileCount} files)`);
        }
    } catch (err) {
        console.warn('Snapshot verification error:', err);
    }
}

/**
 * Attempt to restore the folder and playlist on startup
 */
async function attemptFolderRestore() {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
        console.log('File System Access API not supported');
        return;
    }

    // Try to retrieve all saved folder handles
    let handles;
    try {
        handles = await MusicPlayerDB.getFolderHandles();
        console.log(`Found ${handles?.length || 0} saved folder handles`);
    } catch (err) {
        console.warn('Failed to retrieve folder handles from IndexedDB:', err);
        return;
    }

    if (!handles || handles.length === 0) {
        console.log('No folder handles saved - user needs to select folder');
        return;
    }

    // Process each saved folder
    const bannersToShow = [];
    let restoredCount = 0;

    for (const handle of handles) {
        try {
            console.log(`Checking permission for folder: ${handle.name}`);
            const permission = await handle.queryPermission({ mode: 'read' });
            console.log(`Permission for ${handle.name}: ${permission}`);

            if (permission === 'granted') {
                // Permission already granted, restore silently
                console.log(`✓ Auto-restoring folder: ${handle.name}`);
                await restoreFolderFromHandle(handle);
                restoredCount++;
            } else if (permission === 'prompt') {
                // Permission needs to be re-granted, queue banner
                console.log(`Permission prompt needed for: ${handle.name}`);
                bannersToShow.push(handle);
            } else {
                // Permission denied, remove this handle
                console.log(`Permission denied for: ${handle.name}`);
                await MusicPlayerDB.removeFolderHandle(handle.name)
                    .catch(err => console.warn('Failed to remove folder handle:', err));
            }
        } catch (err) {
            console.warn(`Failed to check permission for folder ${handle.name}:`, err);
        }
    }

    console.log(`Restored ${restoredCount} folder(s)`);
    console.log(`Showing ${bannersToShow.length} permission banner(s)`);

    // Show message for folders that need permission
    if (bannersToShow.length > 0) {
        const folderNames = bannersToShow.map(h => h.name).join(', ');
        console.log(`⚠️  Permission needed for: ${folderNames}`);
        console.log('💡 Click the Folders button (📁) and re-select your folder to restore access');

        // Show a visual indicator in the app
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            updateLoadingProgress(`Permission needed - click Folders button`);
        }
    }

}

/**
 * Restore playlist from a FileSystemDirectoryHandle
 */
async function restoreFolderFromHandle(handle) {
    try {
        const folderName = handle.name;
        console.log(`🔄 Restoring folder: ${folderName}`);

        // Scan directory for files
        const audioFiles = await scanDirectory(handle);
        console.log(`Found ${audioFiles.length} audio files in ${folderName}`);

        if (audioFiles.length === 0) {
            console.warn(`No audio files found in ${folderName}`);
            MusicPlayerDB.clearAllFolderHandles().catch(err => console.warn('Failed to clear folder handle:', err));
            return;
        }

        // Try to load from cache first (instant restore)
        const cached = await MusicPlayerDB.getFolderMetadata(folderName);
        console.log(`Cache lookup for "${folderName}":`, cached ? `HIT (${cached.tracks.length} songs)` : 'MISS');

        if (cached) {
            console.log('Using cached metadata (scanning for File objects)');
            // audioFiles already scanned above

            const trackMap = {};
            cached.tracks.forEach(t => {
                trackMap[t.fileName] = t;
            });

            const tracks = audioFiles.map(file => {
                const cachedTrack = trackMap[file.name];
                return cachedTrack ? {
                    file,
                    title: cachedTrack.title,
                    artist: cachedTrack.artist,
                    album: cachedTrack.album,
                    track: cachedTrack.track,
                    year: cachedTrack.year,
                    duration: cachedTrack.duration,
                } : {
                    file,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    track: '',
                    year: '',
                    duration: 0,
                };
            });

            // Filter out duplicates before adding (for multiple folder support)
            const existingFileNames = new Set(playerState.library.map(t => t.file.name));
            const newTracks = tracks.filter(t => !existingFileNames.has(t.file.name));

            // Add tracks to library
            playerState.library.push(...newTracks);
            playerState.fromFolder = true;

            // Re-sort entire library and cache for fast tab switching
            const sorted = sortTracksByAlbumAndNumber(playerState.library);
            playerState.sortedLibrary = sorted;  // Cache for fast tab switching
            playerState.displayedTracks = sorted;
            playerState.playlist = sorted.map(t => t.file);

            DOM.libraryBrowser.setLibrary(playerState.library);
            await loadAndSetPlaylists();

            // Restore the last track index
            const savedIndex = localStorage.getItem('music-player-last-index');
            if (savedIndex !== null) {
                const index = parseInt(savedIndex, 10);
                if (!isNaN(index) && index >= 0 && index < playerState.playlist.length) {
                    playerState.currentIndex = index;
                }
            }

            return;
        }

        // Cache miss or folder changed - parse audio files (already scanned above)
        if (audioFiles.length === 0) {
            MusicPlayerDB.clearAllFolderHandles().catch(err => console.warn('Failed to clear folder handle:', err));
            return;
        }

        // Parse metadata (skip ID3 and duration on restore for speed)
        const tracks = await MusicMetadata.parseAllMetadata(audioFiles, null, false, false);

        // Filter out duplicates before adding (for multiple folder support)
        const existingFileNames = new Set(playerState.library.map(t => t.file.name));
        const newTracks = tracks.filter(t => !existingFileNames.has(t.file.name));

        // Add tracks to library
        playerState.library.push(...newTracks);

        // Cache the metadata for next restore
        MusicPlayerDB.saveFolderMetadata(folderName, tracks).catch(err => console.warn('Failed to save metadata cache:', err));

        // Sort entire library and cache for fast tab switching
        const sorted = sortTracksByAlbumAndNumber(playerState.library);
        playerState.sortedLibrary = sorted;  // Cache for fast tab switching
        playerState.displayedTracks = sorted;
        playerState.playlist = sorted.map(t => t.file);
        playerState.fromFolder = true;

        // Set library in browser
        DOM.libraryBrowser.setLibrary(playerState.library);
        await loadAndSetPlaylists();

        // Restore the last track index (into the sorted order)
        const savedIndex = localStorage.getItem('music-player-last-index');
        if (savedIndex !== null) {
            const index = parseInt(savedIndex, 10);
            if (!isNaN(index) && index >= 0 && index < playerState.playlist.length) {
                playerState.currentIndex = index;
            }
        }
    } catch (err) {
        console.warn('Failed to restore folder from handle:', err);
        MusicPlayerDB.clearAllFolderHandles().catch(err => console.warn('Failed to clear folder handle:', err));
    }
}

/**
 * Recover from a cached snapshot when folder handles are lost
 * Shows a recovery banner asking user to re-select the folder
 */
async function recoverFromSnapshot() {
    try {
        const snapshot = await MusicPlayerDB.getLastFolderSnapshot();
        if (!snapshot) {
            console.log('No folder snapshot found for recovery');
            return;
        }

        console.log(`Found cached snapshot for folder: ${snapshot.folderName} (${snapshot.trackCount} songs)`);

        // Show recovery banner
        DOM.fileSelector.showRestoreBanner(
            `${snapshot.folderName} (${snapshot.trackCount} songs - cached)`,
            async () => {
                // When user clicks, prompt them to re-select the folder
                try {
                    const dirHandle = await window.showDirectoryPicker();
                    if (dirHandle) {
                        // User selected a folder - it will be processed as files-selected
                        // The metadata cache will be used for instant restore
                        console.log(`User re-selected folder: ${dirHandle.name}`);
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.warn('Failed to pick directory:', err);
                    }
                }
            }
        );
    } catch (err) {
        console.warn('Failed to recover from snapshot:', err);
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Update the loading screen progress text
 */
function updateLoadingProgress(text) {
    const progressEl = document.getElementById('loadingProgress');
    if (progressEl) {
        progressEl.textContent = text;
    }
}

/**
 * Hide the loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    // Show loading screen
    updateLoadingProgress('Initializing...');

    // Set default volume
    DOM.audio.volume = 1.0;

    // Try to load from cached snapshot first (instant, no scanning)
    updateLoadingProgress('Loading library...');
    const loadedFromSnapshot = await loadFromSnapshot();

    // Attempt to restore folder and playlist
    updateLoadingProgress('Loading library...');
    await attemptFolderRestore();

    // Load playlists
    updateLoadingProgress('Loading playlists...');
    await loadAndSetPlaylists();

    // Initialize UI
    updateAllComponents();

    // Initialize UI if not already done
    updateLoadingProgress('Ready');

    // Hide loading screen
    setTimeout(() => hideLoadingScreen(), 500);

    // Setup folder menu dialog
    const foldersDialog = document.getElementById('foldersDialog');
    const foldersBtn = document.getElementById('foldersBtn');
    const closeFoldersBtn = document.getElementById('closeFoldersDialog');

    foldersBtn.addEventListener('click', () => {
        // Reset file count when opening dialog
        DOM.fileSelector.updateFileCount(0);
        foldersDialog.showModal();
    });

    closeFoldersBtn.addEventListener('click', () => {
        foldersDialog.close();
    });

    // Close dialog when pressing Escape
    foldersDialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            foldersDialog.close();
        }
    });

    // Save playback position when user leaves the page
    window.addEventListener('beforeunload', () => {
        savePlaybackPosition();
    });

    // Setup 'f' key shortcut to open/close folders dialog
    document.addEventListener('keydown', (e) => {
        // Only trigger if 'f' is pressed and no modifiers (ctrl, alt, shift)
        if (e.key === 'f' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            // Don't trigger if typing in an input field
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (foldersDialog.open) {
                    foldersDialog.close();
                } else {
                    // Reset file count when opening dialog
                    DOM.fileSelector.updateFileCount(0);
                    foldersDialog.showModal();
                }
            }
        }
    });

    console.log('🎵 Music Player initialized');
});

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✓ Service Worker registered successfully');
            })
            .catch(err => {
                console.warn('Service Worker registration failed:', err);
            });
    });
}
