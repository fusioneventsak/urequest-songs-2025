import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { registerServiceWorker, promptPWAInstall, getPWADisplayMode } from './utils/registerSW';

// Register service worker for PWA support
registerServiceWorker();

// Show PWA install prompt if not already installed
promptPWAInstall();

// Log PWA display mode
console.log('📱 PWA Display Mode:', getPWADisplayMode());

// Safely get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Create root with error boundary
const root = createRoot(rootElement);

// Render app with error boundary and toast notifications
root.render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1a0b2e',
          color: '#ffffff',
          border: '1px solid #9d00ff',
        },
        success: {
          iconTheme: {
            primary: '#ff00ff',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ff3333',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #ff3333',
          },
          duration: 5000,
        },
      }}
    />
  </StrictMode>
);