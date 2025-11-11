# PWA Setup Guide - uRequest Live

Full Progressive Web App support has been added to uRequest Live! Users can now install the app on their devices for a native app-like experience.

## ✅ What's Been Implemented

### Core PWA Files
- ✅ **manifest.json** - App metadata and installation configuration
- ✅ **Service Worker (sw.js)** - Offline support and caching
- ✅ **PWA Registration** - Automatic service worker registration
- ✅ **Install Prompt** - Smart install banner for non-installed users
- ✅ **Meta Tags** - All required PWA and iOS meta tags

### Features
- ✅ **Offline Support** - App works without internet (cached assets)
- ✅ **Install Prompts** - Automatic install suggestions
- ✅ **App Shortcuts** - Quick access to Browse, Kiosk, and Queue
- ✅ **iOS Support** - Full iOS/Safari PWA compatibility
- ✅ **Android Support** - Full Android/Chrome PWA compatibility
- ✅ **Auto Updates** - Detects and prompts for new versions
- ✅ **Standalone Mode** - Runs like a native app

### Icons Generated
- ✅ 72x72, 96x96, 128x128, 144x144
- ✅ 152x152, 192x192, 384x384, 512x512
- ✅ Both SVG and PNG formats
- ✅ Maskable icon support

## 📱 How Users Install the App

### On Android (Chrome/Edge)
1. Visit the website
2. See "Install uRequest Live" banner at bottom
3. Tap "Install" button
4. App appears on home screen

**Alternative:**
- Tap browser menu (⋮)
- Select "Add to Home Screen" or "Install App"

### On iOS (Safari)
1. Visit the website in Safari
2. Tap Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. App appears on home screen

### On Desktop (Chrome/Edge)
1. Visit the website
2. See install icon in address bar
3. Click install icon or banner
4. Confirm installation
5. App opens in separate window

## 🎨 Customizing Icons

### Current Icons
- Icons are purple/pink themed matching the app
- Feature a music note (♪) symbol
- Located in `/public/icons/`

### To Replace Icons
1. Create PNG images in these sizes:
   - 72x72, 96x96, 128x128, 144x144
   - 152x152, 192x192, 384x384, 512x512

2. Replace files in `/public/icons/`
   - Name them: `icon-72x72.png`, `icon-96x96.png`, etc.

3. Use high-quality, square images
4. Test on multiple devices

### Quick Icon Generation
Run the icon generator:
```bash
node generate-pwa-icons.js
```

Or open in browser:
```
/public/icons/generate-icons.html
```

## ⚙️ Configuration

### manifest.json Settings
Located in `/public/manifest.json`:

```json
{
  "name": "uRequest Live - Band Request Hub",
  "short_name": "uRequest Live",
  "theme_color": "#ff00ff",
  "background_color": "#13091f",
  "display": "standalone"
}
```

**Customizable Fields:**
- `name` - Full app name
- `short_name` - Name on home screen
- `theme_color` - Browser UI color
- `background_color` - Splash screen color
- `description` - App description

### Service Worker Configuration
Located in `/public/sw.js`:

**Cache Names:**
- `urequest-live-v1` - Main app cache
- `urequest-runtime-v1` - Runtime cache

**To Clear Cache:**
Update version numbers in `sw.js`:
```javascript
const CACHE_NAME = 'urequest-live-v2';  // Increment version
const RUNTIME_CACHE = 'urequest-runtime-v2';
```

## 🔄 Updates

### How Updates Work
1. Service worker detects new version
2. Downloads updated files in background
3. Shows prompt: "New version available! Reload to update?"
4. User clicks OK → app reloads with new version

### Manual Update Check
Users can force update:
1. Close all app tabs/windows
2. Reopen the app
3. Service worker will check for updates

### Developer Updates
To push an update:
1. Make your changes
2. Update cache version in `sw.js`
3. Deploy to hosting
4. Users see update prompt on next visit

## 🧪 Testing PWA

### Chrome DevTools
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section
4. Check "Service Workers" section
5. Use "Update on reload" for testing

### Lighthouse Audit
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Analyze page load"
5. Review PWA checklist

### Test Install Flow
1. Open in incognito/private window
2. Wait for install prompt
3. Test installation
4. Verify app opens standalone

## 📊 PWA Checklist

✅ **Installability**
- [x] Valid manifest.json
- [x] Service worker registered
- [x] Served over HTTPS
- [x] Icons (192x192 and 512x512)

✅ **PWA Optimized**
- [x] Offline support
- [x] Fast load times
- [x] Mobile responsive
- [x] Install prompts

✅ **App-like Experience**
- [x] Standalone display mode
- [x] Theme color
- [x] No browser UI
- [x] App shortcuts

✅ **iOS Compatibility**
- [x] Apple touch icons
- [x] Status bar styling
- [x] Viewport meta tag
- [x] Safari meta tags

## 🚀 Deployment Checklist

Before deploying PWA to production:

1. **Icons**: Replace placeholder icons with branded ones
2. **HTTPS**: Ensure site is served over HTTPS
3. **Manifest**: Verify all URLs are correct
4. **Service Worker**: Test offline functionality
5. **Meta Tags**: Verify theme colors match branding
6. **Testing**: Test on iOS Safari and Android Chrome

## 🐛 Troubleshooting

### Install Prompt Not Showing
- Check HTTPS is enabled
- Verify manifest.json is accessible
- Check service worker registered
- Clear browser cache
- Try incognito mode

### App Not Working Offline
- Check service worker status in DevTools
- Verify cache is populated
- Check for service worker errors
- Update cache version

### Icons Not Displaying
- Verify icon files exist in `/public/icons/`
- Check file sizes match manifest
- Clear browser cache
- Check file permissions

### iOS Install Not Working
- Use Safari (not Chrome)
- Check apple-touch-icon tags in index.html
- Verify icons are accessible
- Try clearing Safari cache

## 📝 Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [iOS PWA Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

## 🎉 Success!

Your app now has full PWA support! Users can:
- ✅ Install on any device
- ✅ Use offline
- ✅ Get quick access from home screen
- ✅ Receive automatic updates
- ✅ Enjoy app-like experience

---

**Note**: The current PNG icons are SVG-based placeholders. For production, replace them with proper PNG files or use the icon generator tools provided.
