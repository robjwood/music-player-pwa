# Music Player

A lightweight, vanilla JavaScript music player PWA inspired by [CMUS](https://cmus.github.io/). Built with HTML, CSS, and JavaScript—no frameworks, no npm required.

## Features

### Current (Phase 1)
- ✅ Manual file selection (pick one or multiple audio files)
- ✅ Playlist display with click-to-play
- ✅ Play/pause/next/previous controls
- ✅ Progress bar with seeking
- ✅ Time display (current / total duration)
- ✅ Auto-advance to next track
- ✅ Dark, minimal CMUS-inspired UI

### Planned
- **Phase 2**: Folder selection via File System Access API
- **Phase 3**: Persist selected folders and music library to IndexedDB
- **Phase 4**: Search functionality for songs/artists
- **Phase 5**: CMUS-style sidebar with Artists/Albums/Songs views

## Getting Started

### Quick Start
1. Open `index.html` in a modern web browser
2. Click **"Add Music Files"** to select audio files
3. Click a track to play it
4. Use the controls to navigate and seek

### Supported Formats
- MP3, WAV, OGG, FLAC, M4A (depends on your browser)
- Any format that the HTML5 `<audio>` element supports

### Browser Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- File System Access API for Phase 2+ (available in modern browsers)

## How It Works

### Architecture
```
index.html      - Simple, semantic HTML structure
styles.css      - Dark theme styling (no dependencies)
app.js          - Core player logic (~400 lines, heavily commented)
```

### Key Concepts
- **playerState**: Central state object tracking playlist, current track, and playback status
- **URL.createObjectURL()**: Creates playable URLs from File objects
- **HTML5 Audio API**: Native `<audio>` element for playback
- **No external dependencies**: Uses only browser APIs

### Code Comments
Every function and section is heavily commented to explain the "why" behind each piece of code. This makes it great for learning vanilla JavaScript and web APIs.

## Development

### Making Changes
1. Edit the relevant file (HTML structure, CSS styles, or JS logic)
2. Save and refresh your browser
3. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

### Running Locally
No build step or server required—just open the HTML file in your browser. You can also use a simple HTTP server if you prefer:
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Future Improvements

- **Metadata**: Parse ID3 tags to display artist/album info
- **Keyboard shortcuts**: Add vim-like keybindings (inspired by CMUS)
- **Playlists**: Save and load custom playlists
- **Themes**: Support light mode and custom themes
- **PWA**: Make it installable as a desktop app

## Why Vanilla JavaScript?

This project prioritizes:
- **Learning**: Understanding how web audio works without framework abstractions
- **Simplicity**: No build tools, no npm, no dependencies
- **Performance**: Minimal overhead, fast loading
- **Control**: Full understanding of every line of code

Perfect for learning web development fundamentals!

## License

MIT (feel free to use and modify)
