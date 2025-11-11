// LRCLIB API Service for fetching song lyrics
// API Documentation: https://lrclib.net/docs

export interface LRCLIBLyrics {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

const LRCLIB_API_BASE = 'https://lrclib.net/api';

/**
 * Search for lyrics by track name and artist name
 */
export async function searchLyrics(
  trackName: string,
  artistName: string
): Promise<LRCLIBLyrics | null> {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });

    const response = await fetch(`${LRCLIB_API_BASE}/search?${params}`);

    if (!response.ok) {
      console.error('LRCLIB API error:', response.status, response.statusText);
      return null;
    }

    const results: LRCLIBLyrics[] = await response.json();

    // Return the first result if available
    if (results && results.length > 0) {
      return results[0];
    }

    return null;
  } catch (error) {
    console.error('Error fetching lyrics from LRCLIB:', error);
    return null;
  }
}

/**
 * Get lyrics by track ID (if you have it from a previous search)
 */
export async function getLyricsById(id: number): Promise<LRCLIBLyrics | null> {
  try {
    const response = await fetch(`${LRCLIB_API_BASE}/get/${id}`);

    if (!response.ok) {
      console.error('LRCLIB API error:', response.status, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching lyrics by ID from LRCLIB:', error);
    return null;
  }
}

/**
 * Parse synced lyrics (LRC format) into array of timestamped lines
 */
export interface LyricLine {
  timestamp: number; // in seconds
  text: string;
}

export function parseSyncedLyrics(syncedLyrics: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const lrcLines = syncedLyrics.split('\n');

  for (const line of lrcLines) {
    // Match LRC format: [mm:ss.xx]text or [mm:ss]text
    const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3] ? parseInt(match[3], 10) : 0;
      const text = match[4].trim();

      const timestamp = minutes * 60 + seconds + centiseconds / 100;
      lines.push({ timestamp, text });
    }
  }

  return lines;
}
