import React, { useState, useEffect } from 'react';
import { Save, Upload, Loader2, QrCode, Palette, RefreshCw } from 'lucide-react';
import { LogoUploader } from './LogoUploader';
import { useUiSettings } from '../hooks/useUiSettings';

export function SettingsManager() {
  const { settings, loading = false, initialized = true, updateSettings } = useUiSettings();

  // Band settings
  const [bandName, setBandName] = useState(settings?.band_name || 'uRequest Live');

  // Basic colors (kept for backward compatibility)
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color || '#ff00ff');
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color || '#9d00ff');

  // Frontend color controls
  const [frontendAccentColor, setFrontendAccentColor] = useState(settings?.frontend_accent_color || '#ff00ff');
  const [frontendSecondaryAccent, setFrontendSecondaryAccent] = useState(settings?.frontend_secondary_accent || '#9d00ff');
  const [frontendBgColor, setFrontendBgColor] = useState(settings?.frontend_bg_color || '#13091f');
  const [frontendHeaderBg, setFrontendHeaderBg] = useState(settings?.frontend_header_bg || '#13091f');
  const [songBorderColor, setSongBorderColor] = useState(settings?.song_border_color || '#ff00ff');
  const [navBgColor, setNavBgColor] = useState(settings?.nav_bg_color || '#0f051d');
  const [highlightColor, setHighlightColor] = useState(settings?.highlight_color || '#ff00ff');

  // Other settings
  const [showQrCode, setShowQrCode] = useState(settings?.show_qr_code || false);
  const [photoboothUrl, setPhotoboothUrl] = useState(settings?.photobooth_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update local state when settings are loaded or changed
  useEffect(() => {
    if (settings) {
      console.log('Settings updated in SettingsManager:', settings);
      setBandName(settings.band_name || 'uRequest Live');
      setPrimaryColor(settings.primary_color || '#ff00ff');
      setSecondaryColor(settings.secondary_color || '#9d00ff');
      setFrontendAccentColor(settings.frontend_accent_color || '#ff00ff');
      setFrontendSecondaryAccent(settings.frontend_secondary_accent || '#9d00ff');
      setFrontendBgColor(settings.frontend_bg_color || '#13091f');
      setFrontendHeaderBg(settings.frontend_header_bg || '#13091f');
      setSongBorderColor(settings.song_border_color || '#ff00ff');
      setNavBgColor(settings.nav_bg_color || '#0f051d');
      setHighlightColor(settings.highlight_color || '#ff00ff');
      setShowQrCode(settings.show_qr_code || false);
      setPhotoboothUrl(settings.photobooth_url || '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // Validate all colors
      const colors = [
        { value: primaryColor, name: 'Primary color' },
        { value: secondaryColor, name: 'Secondary color' },
        { value: frontendAccentColor, name: 'Frontend accent color' },
        { value: frontendSecondaryAccent, name: 'Frontend secondary accent' },
        { value: frontendBgColor, name: 'Frontend background color' },
        { value: frontendHeaderBg, name: 'Frontend header background' },
        { value: songBorderColor, name: 'Song border color' },
        { value: navBgColor, name: 'Navigation background' },
        { value: highlightColor, name: 'Highlight color' }
      ];

      for (const color of colors) {
        if (!color.value.match(/^#[0-9A-Fa-f]{6}$/)) {
          throw new Error(`${color.name} must be a valid hex color (e.g., #ff00ff)`);
        }
      }

      // Validate band name
      if (!bandName.trim()) {
        throw new Error('Band name cannot be empty');
      }

      console.log('Saving settings with band name:', bandName.trim());

      await updateSettings({
        band_name: bandName.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        frontend_accent_color: frontendAccentColor,
        frontend_secondary_accent: frontendSecondaryAccent,
        frontend_bg_color: frontendBgColor,
        frontend_header_bg: frontendHeaderBg,
        song_border_color: songBorderColor,
        nav_bg_color: navBgColor,
        highlight_color: highlightColor,
        show_qr_code: showQrCode,
        photobooth_url: photoboothUrl.trim() || null,
        updated_at: new Date().toISOString()
      });

      setSaveSuccess(true);
      console.log('Settings saved successfully!');

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neon-pink" />
        <span className="ml-2 text-white">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="glass-effect rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            App Settings & Branding
          </h3>
        </div>

        {/* Band Name Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">Band Information</h4>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Band Name
            </label>
            <input
              type="text"
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              className="input-field text-gray-800 w-full"
              maxLength={50}
              placeholder="Enter band name"
            />
            <p className="text-xs text-gray-400 mt-1">
              This name will appear under the logo in the header
            </p>
          </div>
        </div>

        {/* Primary Colors Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">Primary Brand Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#ff00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used for main accent color (legacy support)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#9d00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used for background gradients (legacy support)
              </p>
            </div>
          </div>
        </div>

        {/* Frontend Colors Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">Frontend Accent Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Frontend Accent Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={frontendAccentColor}
                  onChange={(e) => setFrontendAccentColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={frontendAccentColor}
                  onChange={(e) => setFrontendAccentColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#ff00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Main buttons, REQUEST button, highlights
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Frontend Secondary Accent
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={frontendSecondaryAccent}
                  onChange={(e) => setFrontendSecondaryAccent(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={frontendSecondaryAccent}
                  onChange={(e) => setFrontendSecondaryAccent(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#9d00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Secondary buttons and accents
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Song Border Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={songBorderColor}
                  onChange={(e) => setSongBorderColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={songBorderColor}
                  onChange={(e) => setSongBorderColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#ff00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Border and glow around song cards
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Highlight Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#ff00ff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Special highlights and focus states
              </p>
            </div>
          </div>
        </div>

        {/* Background Colors Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">Background Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Frontend Background
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={frontendBgColor}
                  onChange={(e) => setFrontendBgColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={frontendBgColor}
                  onChange={(e) => setFrontendBgColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#13091f"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Main page background color
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Header Background
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={frontendHeaderBg}
                  onChange={(e) => setFrontendHeaderBg(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={frontendHeaderBg}
                  onChange={(e) => setFrontendHeaderBg(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#13091f"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Header and navigation background
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Navigation Background
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={navBgColor}
                  onChange={(e) => setNavBgColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={navBgColor}
                  onChange={(e) => setNavBgColor(e.target.value)}
                  className="input-field text-gray-800 flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#0f051d"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Bottom navigation bar background
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-md font-medium text-white mb-3 flex items-center">
            <QrCode className="w-4 h-4 mr-2" />
            Kiosk Settings
          </h4>

          <div className="flex items-center space-x-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-block w-10 h-5 rounded-full transition-colors ${showQrCode ? 'bg-neon-pink' : 'bg-gray-600'}`}>
                <span
                  className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                    showQrCode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  style={{
                    top: '0.125rem',
                    position: 'relative'
                  }}
                />
              </div>
              <span className="ml-2 text-sm text-white">
                Show QR Code in Kiosk Mode
              </span>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-12">
            When enabled, displays a QR code in the top corner of the kiosk view that links to your request page
          </p>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-md font-medium text-white mb-3">Photobooth Integration (Optional)</h4>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Photobooth URL
            </label>
            <input
              type="url"
              value={photoboothUrl}
              onChange={(e) => setPhotoboothUrl(e.target.value)}
              className="input-field text-gray-800 w-full"
              placeholder="https://your-photobooth-app.com/booth/123"
            />
            <p className="text-xs text-gray-400 mt-1">
              Paste your mobile photobooth URL here to enable the Photo feature in the frontend navigation.
              Leave empty to disable the photo booth.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="neon-button flex items-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
        
        {saveSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
            Settings saved successfully!
          </div>
        )}
        
        {saveError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            Error: {saveError}
          </div>
        )}
      </form>
    </div>
  );
}