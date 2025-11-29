// Album Art URL utilities for consistent handling across the app

export type AlbumArtSize = 'thumbnail' | 'small' | 'medium' | 'large';

/**
 * Get optimized album art URL based on the source and desired size
 */
export function getOptimizedAlbumArtUrl(
  originalUrl: string | undefined, 
  size: AlbumArtSize = 'medium'
): string | undefined {
  if (!originalUrl) return undefined;
  
  // Handle iTunes/Apple Music URLs
  if (originalUrl.includes('itunes.apple.com') || originalUrl.includes('mzstatic.com')) {
    const sizeMap = {
      thumbnail: '60x60',
      small: '100x100', 
      medium: '300x300',
      large: '600x600'
    };
    
    // Replace any existing size with the desired size
    return originalUrl.replace(/\d+x\d+/, sizeMap[size]);
  }
  
  // For other URLs (user uploads, etc.), return as-is
  // In the future, we could add image proxy/CDN transformations here
  return originalUrl;
}

/**
 * Check if an image URL is accessible (for validation)
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // Avoid CORS issues for basic connectivity check
    });
    return response.ok || response.type === 'opaque'; // opaque = no-cors success
  } catch (error) {
    return false;
  }
}

/**
 * Get album art with multiple fallback strategies
 */
export async function getAlbumArtWithFallbacks(
  title: string,
  artist: string,
  existingUrl?: string,
  size: AlbumArtSize = 'medium'
): Promise<string | undefined> {
  // Try existing URL first if provided
  if (existingUrl) {
    const optimizedUrl = getOptimizedAlbumArtUrl(existingUrl, size);
    if (optimizedUrl && await isImageAccessible(optimizedUrl)) {
      return optimizedUrl;
    }
  }
  
  // Try iTunes API as fallback
  try {
    const { searchITunes, DEFAULT_ALBUM_ART } = await import('./itunes');
    const itunesUrl = await searchITunes(title, artist);
    
    if (itunesUrl && itunesUrl !== DEFAULT_ALBUM_ART) {
      return getOptimizedAlbumArtUrl(itunesUrl, size);
    }
  } catch (error) {
    console.warn('iTunes fallback failed:', error);
  }
  
  // Return undefined to let components show their default fallback
  return undefined;
}

/**
 * Preload an image and return a promise that resolves when loaded
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Batch preload multiple images with progress tracking
 */
export async function preloadImages(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  let loaded = 0;
  const total = urls.length;
  
  const promises = urls.map(async (url) => {
    try {
      await preloadImage(url);
      loaded++;
      onProgress?.(loaded, total);
    } catch (error) {
      // Continue on individual failures
      loaded++;
      onProgress?.(loaded, total);
    }
  });
  
  await Promise.all(promises);
}
