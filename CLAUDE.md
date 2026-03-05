# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Music Player** is a lightweight PWA music player inspired by CMUS (a terminal music player). Built with vanilla HTML/CSS/JavaScript—no frameworks, no npm, no build tools.

- **Goal**: Minimal, fast music player with folder browsing, library view, playlists, and persistence
- **Tech Stack**: Vanilla JS, Web Components, HTML5 Audio API, File System Access API, IndexedDB
- **Browser Requirements**: Modern browser with support for:
  - Web Components (Shadow DOM)
  - File System Access API (for folder selection; gracefully degrades)
  - IndexedDB (for persistence)
  - Web Audio API (for audio duration calculation)

## Architecture

### Component-Based Design with Central State Management

The app follows a **centralized state + component communication** pattern:

1. **Central State** (`playerState` in `app.js`):
   - Single source of truth for: playlist, currently playing track, playback status, metadata library
   - State includes display filters (artist/album selection, search) and shuffle state

2. **Web Components** (in `components/`):
   - Self-contained UI elements with Shadow DOM encapsulation
   - Handle their own rendering and styling
   - Emit custom events on user interaction (button clicks, input, etc.)
   - Expose imperative methods for parent control (e.g., `setPlayState(isPlaying)`)

3. **Event-Driven Communication**:
   - Components emit custom events → `app.js` listens
   - `app.js` updates state → calls component methods to reflect changes
   - No two-way binding; explicit control flow

### File Structure

```
index.html              - Semantic HTML structure with custom elements
styles.css              - Global layout and theming (minimal, no component styles)
app.js                  - Central state, event handlers, playback logic (~1000 lines)
db.js                   - IndexedDB wrapper (IIFE pattern)
metadata.js             - ID3 tag parser, audio duration detection (IIFE pattern)
components/
  ├── file-selector.js           - Folder picker + restore banner
  ├── library-browser.js         - Artist/Album/Songs sidebar + Playlists view
  ├── playlist-view.js           - Track list with album grouping + search + add-to-playlist
  ├── player-controls.js         - Play/pause/next/prev + loop/shuffle buttons
  ├── progress-bar.js            - Seek bar + time display
  ├── now-playing-info.js        - Current track title/artist display
  └── volume-control.js          - Volume slider
```

### Data Model: Track Objects

Throughout the app, tracks are represented as objects:

```javascript
{
  file: File,              // Original File object (for playback)
  title: string,           // From ID3 TIT2 or filename
  artist: string,          // From ID3 TPE1
  album: string,           // From ID3 TALB
  track: string,           // From ID3 TRCK (e.g., "3" or "3/12")
  year: string,            // From ID3 TDRC/TYER
  duration: number         // In seconds (from Web Audio API)
}
```

## Key Implementation Details

### Metadata Parsing (`metadata.js`)

- Parses **ID3v2** tags (text frames: TIT2, TPE1, TALB, TRCK, TDRC, TYER) with multiple text encodings
- Parses **ID3v1** tags (fixed-width fields at end of file)
- Falls back to filename if no tags found
- `parseMetadata(file)` → Promise<Track>
- `parseAllMetadata(files, onProgress)` → batches parsing in chunks of 10 for memory efficiency
- `getAudioDuration(file)` → Promise<seconds> using Web Audio API preload

### Persistence (`db.js`)

Uses IndexedDB with three object stores:

1. **folder-handles**: Stores FileSystemDirectoryHandle for folder restoration
2. **playlists**: Stores custom playlists with their tracks
3. **folder-metadata**: Caches parsed metadata (for fast folder restores)

Also uses localStorage for:
- `music-player-volume`: Volume slider value (0–1)
- `music-player-last-index`: Last playing track index (only for folder-loaded playlists)

### Display and Sorting

- **displayedTracks**: Track[] currently visible (after library filters/search)
- **originalDisplayed**: Backup of displayedTracks before shuffle (to restore order)
- **Sorting**: Tracks are sorted by album year (min year in album), album name, then track number
- **Filtering**: Library browser filters to artist/album; search filters by title/artist/album

### Playlist Management

- Custom playlists stored in IndexedDB with name, creation time, and track array
- Each track in a playlist stores: fileName, title, artist, album, track, year, duration
- Duplicate detection: won't add same file twice to a playlist

### Component Event Reference

| Component | Events | Methods |
|-----------|--------|---------|
| file-selector | `files-selected` (detail: `{files, fromFolder}`) | `showRestoreBanner(folderName, onRestore)` |
| library-browser | `library-filter-changed` (detail: `{tracks}`) | `setLibrary(tracks)`, `setView(mode)`, `setPlaylists(playlists)`, `switchView(view)` |
| playlist-view | `track-selected`, `add-track-to-playlist` | `setTracks(tracks)`, `scrollCurrentTrackIntoView()` |
| player-controls | `play-pause`, `next-track`, `previous-track`, `toggle-loop`, `toggle-shuffle` | `setPlayState(isPlaying)`, `setLoopState(isLooping)`, `setShuffleState(isShuffling)` |
| progress-bar | `seek` (detail: `{time}`) | `setTime(current, total)`, `setDuration(duration)` |
| volume-control | `volume-changed` (detail: `{volume}`) | — |

## Development Workflow

### Making Changes

1. **Editing Components**: Edit the component file (e.g., `components/playlist-view.js`)
   - Components use Shadow DOM, so styles are scoped
   - Update the `connectedCallback()` to wire up new event listeners
   - Emit custom events via `this.dispatchEvent(new CustomEvent(...))`

2. **Editing State Logic**: Edit `app.js`
   - Find the relevant event handler (search for `addEventListener('event-name')`)
   - Update playerState
   - Call component methods to reflect changes (e.g., `DOM.playlistView.setTracks(...)`)

3. **Adding New Features**:
   - If UI: create a new Web Component in `components/`
   - If persistence: add methods to `db.js` (IIFE pattern)
   - If metadata parsing: extend `metadata.js`
   - Update `app.js` to wire up the new component's events

### Testing & Running

No build step or tests—just open `index.html` in a browser:

```bash
# Using Python's built-in server (recommended for CORS with File System Access API)
python3 -m http.server 8000
# Visit http://localhost:8000
```

Or open `file:///path/to/index.html` directly (File System Access API may be limited in file:// protocol on some browsers).

### Code Style

- **Comments**: Inline comments explain "why" not "what"; every function has a comment block
- **Naming**: camelCase for functions/variables; PascalCase for classes/components
- **No external deps**: Browser APIs only; no npm packages
- **Shadow DOM**: Components use `attachShadow({ mode: 'open' })` for style encapsulation

## Common Tasks

### Adding a UI Control

1. Create a new Web Component in `components/component-name.js`
2. Add custom element to `index.html`
3. In `app.js`, add a reference to `DOM` and wire up event listeners
4. Implement state update logic in the relevant event handler

### Persisting New Data

1. Add a new method to `db.js` (or a new object store if needed)
2. Call it from `app.js` when data changes
3. Call the retrieval method in `DOMContentLoaded` to restore on startup

### Filtering or Searching

The pattern: create filtered arrays without mutating originals
- Library filtering: `libraryBrowser` emits filtered track array
- `app.js` receives it and updates `displayedTracks`
- `app.js` remaps `currentIndex` to the filtered array (or clears it if current track is filtered out)

### Adding Keyboard Shortcuts

Add to the `document.addEventListener('keydown', ...)` handler in `app.js`:
```javascript
if (event.key === 'f' && !isInputFocused(event.target)) {
  // Handle 'f' key
}
```

## Browser API Limitations

- **File System Access API**: Not available in all browsers; app gracefully degrades (files-only mode)
- **IndexedDB**: May have storage quota limits; consider cleanup strategies for large playlists
- **Web Audio API**: Duration calculation may fail for corrupt/incompatible formats (falls back to "-:--")
- **Playback**: Limited to formats supported by `<audio>` element (MP3, OGG, WAV, FLAC, M4A vary by browser)

## Important Patterns

### Avoiding Memory Leaks
- Components clean up event listeners in methods (not in `connectedCallback`)
- `app.js` never removes event listeners (components are persistent)
- File objects are not stored; only File references are kept in the playlist array

### XSS Prevention
- Metadata (artist, album names) are HTML-escaped before display
- Use `textContent` not `innerHTML` for user-provided data when possible
- File System Access API only works with user-selected handles (no direct path access)

### State Consistency
- `playlist[i].file` always corresponds to `displayedTracks[i]`
- After filtering: remap `currentIndex` or find the current file in the new array
- After shuffle: save `originalDisplayed` for unshuffling

## Git Workflow

- Changes are ready to commit whenever modified files reflect a complete feature or fix
- Use descriptive commit messages referencing the phase/feature being worked on
- No force pushes or destructive operations; create new commits for corrections
