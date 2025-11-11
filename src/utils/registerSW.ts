// Service Worker Registration Utility
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  console.log('🔄 New version available! Reload to update.');

                  // Optionally show update prompt
                  if (window.confirm('New version available! Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed - reloading');
        window.location.reload();
      });
    });
  } else {
    console.warn('⚠️ Service Workers not supported in this browser');
  }
}

// Check if app is installed as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Prompt user to install PWA
export function promptPWAInstall() {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 PWA install prompt available');

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show custom install UI
    showInstallPrompt(deferredPrompt);
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully');
    deferredPrompt = null;
  });
}

function showInstallPrompt(deferredPrompt: any) {
  // Check if user has dismissed install prompt before
  const dismissedInstall = localStorage.getItem('pwa-install-dismissed');
  const dismissedDate = dismissedInstall ? new Date(dismissedInstall) : null;
  const daysSinceDismissal = dismissedDate
    ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  // Don't show if dismissed within last 7 days
  if (daysSinceDismissal < 7) {
    console.log('⏭️ Skipping install prompt (dismissed recently)');
    return;
  }

  // Create install banner
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 90%;
    width: 400px;
    font-family: system-ui, -apple-system, sans-serif;
    animation: slideUp 0.3s ease-out;
  `;

  banner.innerHTML = `
    <style>
      @keyframes slideUp {
        from { transform: translate(-50%, 100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="font-size: 16px; font-weight: 600;">
        📱 Install uRequest Live
      </div>
      <div style="font-size: 14px; opacity: 0.9;">
        Install the app for quick access and offline support!
      </div>
      <div style="display: flex; gap: 12px; margin-top: 4px;">
        <button id="pwa-install-btn" style="
          flex: 1;
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">
          Install
        </button>
        <button id="pwa-dismiss-btn" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        ">
          Not Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  // Install button handler
  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`👤 User response to install prompt: ${outcome}`);

    // Clear deferred prompt
    deferredPrompt = null;

    // Remove banner
    banner.remove();
  });

  // Dismiss button handler
  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    banner.remove();
    console.log('⏭️ Install prompt dismissed by user');
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(banner)) {
      banner.remove();
    }
  }, 15000);
}

// Clear service worker cache (useful for debugging)
export async function clearSWCache() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration && registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('🗑️ Service Worker cache cleared');
    }
  }
}

// Get PWA display mode
export function getPWADisplayMode(): string {
  if (document.referrer.startsWith('android-app://')) {
    return 'twa';
  }

  if ((navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }

  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }

  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }

  return 'browser';
}

console.log('📱 PWA Utilities loaded');
