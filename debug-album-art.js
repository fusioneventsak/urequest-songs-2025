// Debug script for testing album art URLs
// Run this in the browser console to test album art URLs

// Test iTunes API
async function testItunesAPI(title, artist) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.resultCount > 0) {
      const originalUrl = data.results[0].artworkUrl100;
      const transformedUrl = originalUrl.replace('100x100', '300x300');
      
      console.log('🎵 iTunes API Test:', {
        title,
        artist,
        originalUrl,
        transformedUrl,
        trackName: data.results[0].trackName,
        artistName: data.results[0].artistName
      });
      
      // Test both URLs
      await testImageUrl(originalUrl, 'Original 100x100');
      await testImageUrl(transformedUrl, 'Transformed 300x300');
      
      return transformedUrl;
    } else {
      console.log('❌ No results found for:', title, artist);
      return null;
    }
  } catch (error) {
    console.error('❌ iTunes API error:', error);
    return null;
  }
}

// Test if an image URL works
async function testImageUrl(url, label = '') {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      console.log(`✅ ${label}:`, url);
      return true;
    } else {
      console.log(`❌ ${label} (HTTP ${response.status}):`, url);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${label} (Error):`, url, error.message);
    return false;
  }
}

// Test URL transformation
function testUrlTransformation(originalUrl) {
  const regex = /\/\d+x\d+bb\.jpg$/;
  const sizeMap = {
    thumbnail: '60x60bb.jpg',
    small: '100x100bb.jpg', 
    medium: '300x300bb.jpg',
    large: '600x600bb.jpg'
  };
  
  console.log('🔧 URL Transformation Test:');
  console.log('Original:', originalUrl);
  console.log('Regex matches:', regex.test(originalUrl));
  
  Object.entries(sizeMap).forEach(([size, replacement]) => {
    const transformed = originalUrl.replace(regex, `/${replacement}`);
    console.log(`${size}:`, transformed);
  });
}

// Batch test multiple songs
async function testMultipleSongs() {
  const testSongs = [
    { title: 'Bohemian Rhapsody', artist: 'Queen' },
    { title: 'Hotel California', artist: 'Eagles' },
    { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
    { title: 'Sweet Child O Mine', artist: 'Guns N Roses' },
    { title: 'Imagine', artist: 'John Lennon' }
  ];
  
  console.log('🧪 Testing multiple songs...');
  
  for (const song of testSongs) {
    console.log(`\n--- Testing: ${song.title} by ${song.artist} ---`);
    await testItunesAPI(song.title, song.artist);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
}

// Test current page's album art URLs
function testCurrentPageImages() {
  const images = document.querySelectorAll('img[src*="mzstatic.com"], img[src*="itunes.apple.com"]');
  console.log(`🖼️ Found ${images.length} iTunes images on current page`);
  
  images.forEach((img, index) => {
    console.log(`Image ${index + 1}:`, {
      src: img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      error: img.onerror ? 'Has error handler' : 'No error handler'
    });
  });
}

// Export functions to global scope for console access
window.debugAlbumArt = {
  testItunesAPI,
  testImageUrl,
  testUrlTransformation,
  testMultipleSongs,
  testCurrentPageImages
};

console.log('🎨 Album Art Debug Tools Loaded!');
console.log('Available functions:');
console.log('- debugAlbumArt.testItunesAPI(title, artist)');
console.log('- debugAlbumArt.testImageUrl(url)');
console.log('- debugAlbumArt.testUrlTransformation(url)');
console.log('- debugAlbumArt.testMultipleSongs()');
console.log('- debugAlbumArt.testCurrentPageImages()');
console.log('\nExample usage:');
console.log('debugAlbumArt.testItunesAPI("Bohemian Rhapsody", "Queen")');
