/**
 * MUSIC METADATA PARSER
 *
 * Parses ID3v2 and ID3v1 tags from audio files to extract metadata.
 * Falls back to filename if no tags found.
 *
 * Usage:
 *   const track = await MusicMetadata.parseMetadata(file);
 *   const tracks = await MusicMetadata.parseAllMetadata(files, onProgress);
 */

window.MusicMetadata = (() => {
    /**
     * Decode a syncsafe integer (7 bits per byte)
     */
    function decodeSyncsafeInt(bytes) {
        let result = 0;
        for (let i = 0; i < 4; i++) {
            result = (result << 7) | (bytes[i] & 0x7f);
        }
        return result;
    }

    /**
     * Decode a text frame from ID3v2
     * @param {Uint8Array} data - Frame data starting with encoding byte
     * @returns {string} Decoded text
     */
    function decodeTextFrame(data) {
        if (data.length === 0) return '';

        const encoding = data[0];
        const textData = data.slice(1);

        try {
            switch (encoding) {
                case 0: {
                    // Latin-1
                    return new TextDecoder('iso-8859-1').decode(textData);
                }
                case 1: {
                    // UTF-16 with BOM
                    return new TextDecoder('utf-16').decode(textData);
                }
                case 2: {
                    // UTF-16BE (no BOM)
                    return new TextDecoder('utf-16be').decode(textData);
                }
                case 3: {
                    // UTF-8
                    return new TextDecoder('utf-8').decode(textData);
                }
                default:
                    return '';
            }
        } catch (e) {
            console.warn('Failed to decode text frame:', e);
            return '';
        }
    }

    /**
     * Parse ID3v2 tags from a file
     * @param {File} file
     * @returns {Promise<{title, artist, album, track, year}>}
     */
    async function parseID3v2(file) {
        try {
            const headerBuffer = await file.slice(0, 10).arrayBuffer();
            const headerView = new Uint8Array(headerBuffer);

            // Check for ID3v2 magic bytes
            if (headerView[0] !== 0x49 || headerView[1] !== 0x44 || headerView[2] !== 0x33) {
                return null; // Not ID3v2
            }

            // Decode tag size (syncsafe integer at bytes 6-9)
            const tagSize = decodeSyncsafeInt(headerView.slice(6));

            // Read the entire tag
            const tagBuffer = await file.slice(0, 10 + tagSize).arrayBuffer();
            const tagView = new Uint8Array(tagBuffer);

            const metadata = { title: '', artist: '', album: '', track: '', year: '' };

            // Parse frames (starting after 10-byte header)
            let offset = 10;
            while (offset < tagView.length - 8) {
                // Read frame header (10 bytes)
                const frameId = String.fromCharCode(
                    tagView[offset],
                    tagView[offset + 1],
                    tagView[offset + 2],
                    tagView[offset + 3]
                );

                const frameSize =
                    (tagView[offset + 4] << 24) |
                    (tagView[offset + 5] << 16) |
                    (tagView[offset + 6] << 8) |
                    tagView[offset + 7];

                // Skip invalid frames
                if (frameSize === 0 || frameSize > 1000000) {
                    break;
                }

                const frameDataStart = offset + 10;
                const frameData = tagView.slice(frameDataStart, frameDataStart + frameSize);

                // Parse text frames
                if (frameId === 'TIT2') {
                    // Title
                    metadata.title = decodeTextFrame(frameData).trim();
                } else if (frameId === 'TPE1') {
                    // Artist
                    metadata.artist = decodeTextFrame(frameData).trim();
                } else if (frameId === 'TALB') {
                    // Album
                    metadata.album = decodeTextFrame(frameData).trim();
                } else if (frameId === 'TRCK') {
                    // Track number
                    metadata.track = decodeTextFrame(frameData).trim();
                } else if (frameId === 'TDRC') {
                    // Recording date (year)
                    const dateStr = decodeTextFrame(frameData).trim();
                    if (dateStr) {
                        metadata.year = dateStr.substring(0, 4);
                    }
                } else if (frameId === 'TYER') {
                    // Year (older ID3v2 frame)
                    const yearStr = decodeTextFrame(frameData).trim();
                    if (yearStr && !metadata.year) {
                        metadata.year = yearStr.substring(0, 4);
                    }
                }

                offset += 10 + frameSize;
            }

            return metadata.title || metadata.artist || metadata.album ? metadata : null;
        } catch (e) {
            console.warn('Failed to parse ID3v2:', e);
            return null;
        }
    }

    /**
     * Parse ID3v1 tags from a file
     * @param {File} file
     * @returns {Promise<{title, artist, album, track, year}>}
     */
    async function parseID3v1(file) {
        try {
            const tagBuffer = await file.slice(-128).arrayBuffer();
            const tagView = new Uint8Array(tagBuffer);

            // Check for ID3v1 magic bytes "TAG"
            if (tagView[0] !== 0x54 || tagView[1] !== 0x41 || tagView[2] !== 0x47) {
                return null; // Not ID3v1
            }

            // Decode fixed-width Latin-1 strings
            const decoder = new TextDecoder('iso-8859-1');

            const title = decoder.decode(tagView.slice(3, 33)).trim();
            const artist = decoder.decode(tagView.slice(33, 63)).trim();
            const album = decoder.decode(tagView.slice(63, 93)).trim();
            const year = decoder.decode(tagView.slice(93, 97)).trim();

            return { title, artist, album, track: '', year };
        } catch (e) {
            console.warn('Failed to parse ID3v1:', e);
            return null;
        }
    }

    /**
     * Get audio duration from file
     * @param {File} file
     * @returns {Promise<number>} Duration in seconds
     */
    function getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            const url = URL.createObjectURL(file);
            audio.preload = 'metadata';

            // Set a timeout to prevent hanging on files with metadata issues
            const timeout = setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve(0);
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
                URL.revokeObjectURL(url);
            };

            audio.addEventListener('loadedmetadata', () => {
                cleanup();
                resolve(audio.duration || 0);
            }, { once: true });

            audio.addEventListener('error', () => {
                cleanup();
                resolve(0);
            }, { once: true });

            audio.src = url;
        });
    }

    /**
     * Parse metadata from a single file
     * @param {File} file
     * @param {boolean} includeID3 - Whether to parse ID3 tags (slower, optional)
     * @param {boolean} includeDuration - Whether to read audio duration (slower, optional)
     * @returns {Promise<Track>} { file, title, artist, album, track, year, duration }
     */
    async function parseMetadata(file, includeID3 = true, includeDuration = true) {
        let metadata = null;

        // Try ID3v2 and ID3v1 if requested
        if (includeID3) {
            metadata = await parseID3v2(file);
            if (!metadata) {
                metadata = await parseID3v1(file);
            }
        }

        // Fall back to filename if no ID3 tags found or skipped
        if (!metadata) {
            const title = file.name.replace(/\.[^/.]+$/, '');
            metadata = {
                title,
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                track: '',
                year: '',
            };
        }

        // Ensure all fields exist
        if (!metadata.title) metadata.title = file.name.replace(/\.[^/.]+$/, '');
        if (!metadata.artist) metadata.artist = 'Unknown Artist';
        if (!metadata.album) metadata.album = 'Unknown Album';
        if (!metadata.track) metadata.track = '';
        if (!metadata.year) metadata.year = '';

        // Get audio duration (optional, can be skipped for fast restoration)
        let duration = 0;
        if (includeDuration) {
            duration = await getAudioDuration(file);
        }

        return {
            file,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            track: metadata.track,
            year: metadata.year,
            duration,
        };
    }

    /**
     * Parse metadata from multiple files in batches
     * @param {File[]} files
     * @param {Function} onProgress - Called with (loaded, total) after each batch
     * @param {boolean} includeID3 - Whether to parse ID3 tags (default: true)
     * @param {boolean} includeDuration - Whether to read audio duration (default: true)
     * @returns {Promise<Track[]>}
     */
    async function parseAllMetadata(files, onProgress = null, includeID3 = true, includeDuration = true) {
        const results = [];
        const batchSize = includeDuration ? 10 : 100; // Larger batches when skipping duration/ID3

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map((f) => parseMetadata(f, includeID3, includeDuration)));
            results.push(...batchResults);

            if (onProgress) {
                onProgress(results.length, files.length);
            }
        }

        return results;
    }

    return { parseMetadata, parseAllMetadata };
})();
