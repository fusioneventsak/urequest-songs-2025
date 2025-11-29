# Album Art System Improvements

## Current Issues

### 1. URL Transformation Problems
- **SongList**: Uses Cloudinary transforms on iTunes URLs (won't work)
- **KioskPage**: Assumes `/default.jpg` pattern in all URLs
- **Inconsistent**: Different components handle URLs differently

### 2. CORS and Reliability Issues
- iTunes images may have CORS restrictions
- No fallback CDN or proxy service
- Limited error recovery

### 3. Performance Issues
- No progressive loading (low-res first, then high-res)
- Cache strategy could be improved
- No image compression for user-uploaded URLs

## Recommended Solutions

### 1. Unified Image URL Handler
Create a utility function to handle all album art URLs consistently:

```typescript
// utils/albumArt.ts
export function getOptimizedAlbumArtUrl(
  originalUrl: string, 
  size: 'thumbnail' | 'small' | 'medium' | 'large' = 'medium'
): string {
  if (!originalUrl) return DEFAULT_ALBUM_ART;
  
  // Handle iTunes URLs
  if (originalUrl.includes('itunes.apple.com') || originalUrl.includes('mzstatic.com')) {
    const sizeMap = {
      thumbnail: '60x60',
      small: '100x100', 
      medium: '300x300',
      large: '600x600'
    };
    return originalUrl.replace(/\d+x\d+/, sizeMap[size]);
  }
  
  // Handle other URLs (user uploads, etc.)
  return originalUrl;
}
```

### 2. Enhanced AlbumArtDisplay Component
Add progressive loading and better error handling:

```typescript
export function AlbumArtDisplay({ albumArtUrl, size = 'medium' }) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  
  useEffect(() => {
    if (!albumArtUrl) return;
    
    // Progressive loading: start with thumbnail, then load full size
    const thumbnailUrl = getOptimizedAlbumArtUrl(albumArtUrl, 'thumbnail');
    const fullUrl = getOptimizedAlbumArtUrl(albumArtUrl, size);
    
    // Load thumbnail first
    const thumbnailImg = new Image();
    thumbnailImg.onload = () => {
      setCurrentSrc(thumbnailUrl);
      
      // Then load full resolution
      const fullImg = new Image();
      fullImg.onload = () => {
        setCurrentSrc(fullUrl);
        setImageState('loaded');
      };
      fullImg.onerror = () => setImageState('error');
      fullImg.src = fullUrl;
    };
    thumbnailImg.onerror = () => setImageState('error');
    thumbnailImg.src = thumbnailUrl;
  }, [albumArtUrl, size]);
  
  // Rest of component...
}
```

### 3. Image Proxy Service
Consider adding a proxy service for better reliability:

```typescript
// For production, consider using a service like:
// - Cloudinary (paid)
// - ImageKit (paid) 
// - Custom proxy server
// - Supabase Storage with image transformations

export function getProxiedImageUrl(originalUrl: string, size: string): string {
  if (USE_IMAGE_PROXY) {
    return `https://your-proxy.com/image?url=${encodeURIComponent(originalUrl)}&size=${size}`;
  }
  return getOptimizedAlbumArtUrl(originalUrl, size);
}
```

### 4. Improved Caching Strategy
Enhanced caching with expiration and cleanup:

```typescript
// utils/imageCache.ts
export class AlbumArtCache {
  private static CACHE_NAME = 'album-art-v2';
  private static MAX_CACHE_SIZE = 100; // MB
  private static CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  static async cacheImage(url: string): Promise<void> {
    if (!('caches' in window)) return;
    
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await fetch(url);
      
      if (response.ok) {
        // Add timestamp for expiration
        const responseWithTimestamp = new Response(response.body, {
          ...response,
          headers: {
            ...response.headers,
            'cached-at': Date.now().toString()
          }
        });
        
        await cache.put(url, responseWithTimestamp);
        await this.cleanupExpiredCache();
      }
    } catch (error) {
      console.warn('Failed to cache image:', error);
    }
  }
  
  static async cleanupExpiredCache(): Promise<void> {
    // Implementation for cache cleanup...
  }
}
```

### 5. Fallback Strategy
Implement multiple fallback sources:

```typescript
export async function getAlbumArtWithFallbacks(
  title: string, 
  artist: string, 
  existingUrl?: string
): Promise<string> {
  // Try existing URL first
  if (existingUrl && await isImageAccessible(existingUrl)) {
    return existingUrl;
  }
  
  // Try iTunes API
  try {
    const itunesUrl = await searchITunes(title, artist);
    if (itunesUrl !== DEFAULT_ALBUM_ART) {
      return itunesUrl;
    }
  } catch (error) {
    console.warn('iTunes search failed:', error);
  }
  
  // Try alternative APIs (Spotify, Last.fm, etc.)
  // ... additional fallback sources
  
  // Return default
  return DEFAULT_ALBUM_ART;
}
```

## Implementation Priority

1. **High Priority**: Fix URL transformation inconsistencies
2. **Medium Priority**: Add progressive loading to AlbumArtDisplay
3. **Medium Priority**: Implement unified URL handler
4. **Low Priority**: Add image proxy service
5. **Low Priority**: Enhanced caching with cleanup

## Testing Recommendations

1. Test with various image sources (iTunes, direct URLs, broken URLs)
2. Test on slow networks (progressive loading)
3. Test cache behavior and cleanup
4. Test CORS handling with different domains
5. Performance testing with large song libraries
