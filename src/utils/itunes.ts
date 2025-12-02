// iTunes API search interface
export interface iTunesSearchResult {
  resultCount: number;
  results: Array<{
    artworkUrl100: string;
    artistName: string;
    trackName: string;
    collectionName?: string;
  }>;
}

// Default placeholder icon as SVG data URL
export const DEFAULT_ALBUM_ART = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 18V5l12-2v13"/>
  <circle cx="6" cy="18" r="3"/>
  <circle cx="18" cy="16" r="3"/>
</svg>
`)}`;

/**
 * Clean up a search term by removing common variations and special characters
 */
function cleanSearchTerm(term: string): string {
  return term
    // Remove content in parentheses like "(feat. Artist)" or "(Remastered)"
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    // Remove content in brackets like "[Radio Edit]"
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    // Remove "feat.", "ft.", "featuring"
    .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/i, '')
    // Remove "& " for multi-artist (will try with just first artist)
    .replace(/\s*&\s+.*$/, '')
    // Remove special characters but keep spaces and alphanumeric
    .replace(/[^\w\s]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate search variations to try
 */
function generateSearchVariations(title: string, artist: string): string[] {
  const variations: string[] = [];

  // Original search (title + artist)
  variations.push(`${title} ${artist}`);

  // Cleaned version
  const cleanTitle = cleanSearchTerm(title);
  const cleanArtist = cleanSearchTerm(artist);
  if (cleanTitle !== title || cleanArtist !== artist) {
    variations.push(`${cleanTitle} ${cleanArtist}`);
  }

  // Just the title (sometimes artist variations cause issues)
  variations.push(title);
  if (cleanTitle !== title) {
    variations.push(cleanTitle);
  }

  // Artist only search (for compilations/covers)
  variations.push(`${cleanTitle} song`);

  // Remove "The" from artist name
  if (artist.toLowerCase().startsWith('the ')) {
    const artistWithoutThe = artist.slice(4);
    variations.push(`${title} ${artistWithoutThe}`);
    variations.push(`${cleanTitle} ${cleanSearchTerm(artistWithoutThe)}`);
  }

  // Try with just first word of multi-word titles (for remixes etc)
  const titleWords = cleanTitle.split(' ');
  if (titleWords.length > 2) {
    const shortTitle = titleWords.slice(0, 2).join(' ');
    variations.push(`${shortTitle} ${cleanArtist}`);
  }

  // Remove duplicates while preserving order
  return [...new Set(variations)];
}

/**
 * Perform a single iTunes search
 */
async function performiTunesSearch(query: string): Promise<string | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=5`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data: iTunesSearchResult = await response.json();

    if (data.resultCount > 0) {
      // Use 300x300 for better performance
      const artworkUrl = data.results[0].artworkUrl100.replace('100x100', '300x300');
      return artworkUrl;
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function searchITunes(title: string, artist: string): Promise<string> {
  try {
    // Don't attempt search if title is empty
    if (!title.trim()) {
      return DEFAULT_ALBUM_ART;
    }

    // If artist is empty, just search by title
    const searchArtist = artist.trim() || '';

    // Generate search variations
    const variations = generateSearchVariations(title, searchArtist);

    // Try each variation until we find album art
    for (const query of variations) {
      const artworkUrl = await performiTunesSearch(query);

      if (artworkUrl) {
        // Skip HEAD validation - it often fails due to CORS but the image still loads
        // The browser will handle any broken images gracefully
        console.log(`🎵 Found album art for "${title}" using query: "${query}"`);
        return artworkUrl;
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`⚠️ No album art found for "${title}" by "${artist}" after trying ${variations.length} variations`);
    return DEFAULT_ALBUM_ART;
  } catch (error) {
    console.warn('Error fetching iTunes data:', error);
    return DEFAULT_ALBUM_ART;
  }
}

/**
 * Batch search for multiple songs (with rate limiting)
 */
export async function batchSearchITunes(
  songs: Array<{ title: string; artist: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < songs.length; i++) {
    const { title, artist } = songs[i];
    const key = `${title}|${artist}`;

    const artworkUrl = await searchITunes(title, artist);
    results.set(key, artworkUrl);

    onProgress?.(i + 1, songs.length);

    // Rate limiting: wait 200ms between songs
    if (i < songs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
