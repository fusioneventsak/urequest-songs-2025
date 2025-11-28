import React, { useState, useEffect } from 'react';
import { Save, Upload, Loader2, QrCode, Palette, RefreshCw } from 'lucide-react';
import { LogoUploader } from './LogoUploader';
import { useUiSettings } from '../../hooks/useUiSettings';

// Reusable color picker component with gradient support
interface ColorPickerWithGradientProps {
  label: string;
  description: string;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  useGradient: boolean;
  onSolidChange: (color: string) => void;
  onGradientStartChange: (color: string) => void;
  onGradientEndChange: (color: string) => void;
  onUseGradientChange: (useGradient: boolean) => void;
}

function ColorPickerWithGradient({
  label,
  description,
  solidColor,
  gradientStart,
  gradientEnd,
  useGradient,
  onSolidChange,
  onGradientStartChange,
  onGradientEndChange,
  onUseGradientChange
}: ColorPickerWithGradientProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-white">{label}</h5>

        {/* Gradient Toggle Switch */}
        <label className="flex items-center cursor-pointer">
          <span className="mr-3 text-xs font-medium text-gray-300">Use Gradient</span>
          <input
            type="checkbox"
            checked={useGradient}
            onChange={(e) => onUseGradientChange(e.target.checked)}
            className="sr-only"
          />
          <div className={`relative inline-block w-11 h-6 rounded-full transition-colors ${useGradient ? 'bg-neon-pink' : 'bg-gray-600'}`}>
            <span
              className={`inline-block w-5 h-5 transform transition-transform bg-white rounded-full ${
                useGradient ? 'translate-x-6' : 'translate-x-0.5'
              }`}
              style={{
                top: '0.125rem',
                position: 'relative'
              }}
            />
          </div>
        </label>
      </div>

      {useGradient ? (
        // Gradient Mode - Show gradient start and end pickers
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Gradient Start */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Gradient Start
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={gradientStart}
                onChange={(e) => onGradientStartChange(e.target.value)}
                className="h-10 w-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={gradientStart}
                onChange={(e) => onGradientStartChange(e.target.value)}
                className="input-field text-gray-800 flex-1 text-sm"
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#ff00ff"
              />
            </div>
          </div>

          {/* Gradient End */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Gradient End
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={gradientEnd}
                onChange={(e) => onGradientEndChange(e.target.value)}
                className="h-10 w-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={gradientEnd}
                onChange={(e) => onGradientEndChange(e.target.value)}
                className="input-field text-gray-800 flex-1 text-sm"
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#9d00ff"
              />
            </div>
          </div>
        </div>
      ) : (
        // Solid Mode - Show only solid color picker (full width)
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Solid Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={solidColor}
              onChange={(e) => onSolidChange(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={solidColor}
              onChange={(e) => onSolidChange(e.target.value)}
              className="input-field text-gray-800 flex-1 text-sm"
              pattern="^#[0-9A-Fa-f]{6}$"
              placeholder="#ff00ff"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      <div>
        <div
          className="w-full h-12 rounded-lg border border-gray-600"
          style={{
            background: useGradient
              ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
              : solidColor
          }}
        />
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

export function SettingsManager() {
  const { settings, loading = false, initialized = true, updateSettings } = useUiSettings();

  // Band settings
  const [bandName, setBandName] = useState(settings?.band_name || 'uRequest Live');

  // Basic colors (kept for backward compatibility)
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color || '#ff00ff');
  const [primaryGradientStart, setPrimaryGradientStart] = useState(settings?.primary_gradient_start || '#ff00ff');
  const [primaryGradientEnd, setPrimaryGradientEnd] = useState(settings?.primary_gradient_end || '#9d00ff');

  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color || '#9d00ff');
  const [secondaryGradientStart, setSecondaryGradientStart] = useState(settings?.secondary_gradient_start || '#9d00ff');
  const [secondaryGradientEnd, setSecondaryGradientEnd] = useState(settings?.secondary_gradient_end || '#6d00af');

  // Frontend color controls with gradients
  const [frontendAccentColor, setFrontendAccentColor] = useState(settings?.frontend_accent_color || '#ff00ff');
  const [frontendAccentGradientStart, setFrontendAccentGradientStart] = useState(settings?.frontend_accent_gradient_start || '#ff00ff');
  const [frontendAccentGradientEnd, setFrontendAccentGradientEnd] = useState(settings?.frontend_accent_gradient_end || '#9d00ff');

  const [frontendSecondaryAccent, setFrontendSecondaryAccent] = useState(settings?.frontend_secondary_accent || '#9d00ff');
  const [frontendSecondaryAccentGradientStart, setFrontendSecondaryAccentGradientStart] = useState(settings?.frontend_secondary_accent_gradient_start || '#9d00ff');
  const [frontendSecondaryAccentGradientEnd, setFrontendSecondaryAccentGradientEnd] = useState(settings?.frontend_secondary_accent_gradient_end || '#6d00af');

  const [frontendBgColor, setFrontendBgColor] = useState(settings?.frontend_bg_color || '#13091f');
  const [frontendBgGradientStart, setFrontendBgGradientStart] = useState(settings?.frontend_bg_gradient_start || '#13091f');
  const [frontendBgGradientEnd, setFrontendBgGradientEnd] = useState(settings?.frontend_bg_gradient_end || '#0a0513');

  const [frontendHeaderBg, setFrontendHeaderBg] = useState(settings?.frontend_header_bg || '#13091f');
  const [frontendHeaderBgGradientStart, setFrontendHeaderBgGradientStart] = useState(settings?.frontend_header_bg_gradient_start || '#13091f');
  const [frontendHeaderBgGradientEnd, setFrontendHeaderBgGradientEnd] = useState(settings?.frontend_header_bg_gradient_end || '#0a0513');

  const [songBorderColor, setSongBorderColor] = useState(settings?.song_border_color || '#ff00ff');
  const [songBorderGradientStart, setSongBorderGradientStart] = useState(settings?.song_border_gradient_start || '#ff00ff');
  const [songBorderGradientEnd, setSongBorderGradientEnd] = useState(settings?.song_border_gradient_end || '#9d00ff');

  const [navBgColor, setNavBgColor] = useState(settings?.nav_bg_color || '#0f051d');
  const [navBgGradientStart, setNavBgGradientStart] = useState(settings?.nav_bg_gradient_start || '#0f051d');
  const [navBgGradientEnd, setNavBgGradientEnd] = useState(settings?.nav_bg_gradient_end || '#07020f');

  const [highlightColor, setHighlightColor] = useState(settings?.highlight_color || '#ff00ff');
  const [highlightGradientStart, setHighlightGradientStart] = useState(settings?.highlight_gradient_start || '#ff00ff');
  const [highlightGradientEnd, setHighlightGradientEnd] = useState(settings?.highlight_gradient_end || '#9d00ff');

  // Gradient toggle states
  const [primaryUseGradient, setPrimaryUseGradient] = useState(settings?.primary_use_gradient || false);
  const [secondaryUseGradient, setSecondaryUseGradient] = useState(settings?.secondary_use_gradient || false);
  const [frontendAccentUseGradient, setFrontendAccentUseGradient] = useState(settings?.frontend_accent_use_gradient || false);
  const [frontendSecondaryAccentUseGradient, setFrontendSecondaryAccentUseGradient] = useState(settings?.frontend_secondary_accent_use_gradient || false);
  const [frontendBgUseGradient, setFrontendBgUseGradient] = useState(settings?.frontend_bg_use_gradient || false);
  const [frontendHeaderBgUseGradient, setFrontendHeaderBgUseGradient] = useState(settings?.frontend_header_bg_use_gradient || false);
  const [songBorderUseGradient, setSongBorderUseGradient] = useState(settings?.song_border_use_gradient || false);
  const [navBgUseGradient, setNavBgUseGradient] = useState(settings?.nav_bg_use_gradient || false);
  const [highlightUseGradient, setHighlightUseGradient] = useState(settings?.highlight_use_gradient || false);

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

      // Primary colors
      setPrimaryColor(settings.primary_color || '#ff00ff');
      setPrimaryGradientStart(settings.primary_gradient_start || '#ff00ff');
      setPrimaryGradientEnd(settings.primary_gradient_end || '#9d00ff');

      // Secondary colors
      setSecondaryColor(settings.secondary_color || '#9d00ff');
      setSecondaryGradientStart(settings.secondary_gradient_start || '#9d00ff');
      setSecondaryGradientEnd(settings.secondary_gradient_end || '#6d00af');

      // Frontend accent colors
      setFrontendAccentColor(settings.frontend_accent_color || '#ff00ff');
      setFrontendAccentGradientStart(settings.frontend_accent_gradient_start || '#ff00ff');
      setFrontendAccentGradientEnd(settings.frontend_accent_gradient_end || '#9d00ff');

      // Frontend secondary accent
      setFrontendSecondaryAccent(settings.frontend_secondary_accent || '#9d00ff');
      setFrontendSecondaryAccentGradientStart(settings.frontend_secondary_accent_gradient_start || '#9d00ff');
      setFrontendSecondaryAccentGradientEnd(settings.frontend_secondary_accent_gradient_end || '#6d00af');

      // Background colors
      setFrontendBgColor(settings.frontend_bg_color || '#13091f');
      setFrontendBgGradientStart(settings.frontend_bg_gradient_start || '#13091f');
      setFrontendBgGradientEnd(settings.frontend_bg_gradient_end || '#0a0513');

      // Header colors
      setFrontendHeaderBg(settings.frontend_header_bg || '#13091f');
      setFrontendHeaderBgGradientStart(settings.frontend_header_bg_gradient_start || '#13091f');
      setFrontendHeaderBgGradientEnd(settings.frontend_header_bg_gradient_end || '#0a0513');

      // Song border colors
      setSongBorderColor(settings.song_border_color || '#ff00ff');
      setSongBorderGradientStart(settings.song_border_gradient_start || '#ff00ff');
      setSongBorderGradientEnd(settings.song_border_gradient_end || '#9d00ff');

      // Navigation colors
      setNavBgColor(settings.nav_bg_color || '#0f051d');
      setNavBgGradientStart(settings.nav_bg_gradient_start || '#0f051d');
      setNavBgGradientEnd(settings.nav_bg_gradient_end || '#07020f');

      // Highlight colors
      setHighlightColor(settings.highlight_color || '#ff00ff');
      setHighlightGradientStart(settings.highlight_gradient_start || '#ff00ff');
      setHighlightGradientEnd(settings.highlight_gradient_end || '#9d00ff');

      // Gradient toggle states
      setPrimaryUseGradient(settings.primary_use_gradient || false);
      setSecondaryUseGradient(settings.secondary_use_gradient || false);
      setFrontendAccentUseGradient(settings.frontend_accent_use_gradient || false);
      setFrontendSecondaryAccentUseGradient(settings.frontend_secondary_accent_use_gradient || false);
      setFrontendBgUseGradient(settings.frontend_bg_use_gradient || false);
      setFrontendHeaderBgUseGradient(settings.frontend_header_bg_use_gradient || false);
      setSongBorderUseGradient(settings.song_border_use_gradient || false);
      setNavBgUseGradient(settings.nav_bg_use_gradient || false);
      setHighlightUseGradient(settings.highlight_use_gradient || false);

      // Other settings
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

        // Primary colors
        primary_color: primaryColor,
        primary_gradient_start: primaryGradientStart,
        primary_gradient_end: primaryGradientEnd,

        // Secondary colors
        secondary_color: secondaryColor,
        secondary_gradient_start: secondaryGradientStart,
        secondary_gradient_end: secondaryGradientEnd,

        // Frontend accent colors
        frontend_accent_color: frontendAccentColor,
        frontend_accent_gradient_start: frontendAccentGradientStart,
        frontend_accent_gradient_end: frontendAccentGradientEnd,

        // Frontend secondary accent
        frontend_secondary_accent: frontendSecondaryAccent,
        frontend_secondary_accent_gradient_start: frontendSecondaryAccentGradientStart,
        frontend_secondary_accent_gradient_end: frontendSecondaryAccentGradientEnd,

        // Background colors
        frontend_bg_color: frontendBgColor,
        frontend_bg_gradient_start: frontendBgGradientStart,
        frontend_bg_gradient_end: frontendBgGradientEnd,

        // Header colors
        frontend_header_bg: frontendHeaderBg,
        frontend_header_bg_gradient_start: frontendHeaderBgGradientStart,
        frontend_header_bg_gradient_end: frontendHeaderBgGradientEnd,

        // Song border colors
        song_border_color: songBorderColor,
        song_border_gradient_start: songBorderGradientStart,
        song_border_gradient_end: songBorderGradientEnd,

        // Navigation colors
        nav_bg_color: navBgColor,
        nav_bg_gradient_start: navBgGradientStart,
        nav_bg_gradient_end: navBgGradientEnd,

        // Highlight colors
        highlight_color: highlightColor,
        highlight_gradient_start: highlightGradientStart,
        highlight_gradient_end: highlightGradientEnd,

        // Gradient toggle states
        primary_use_gradient: primaryUseGradient,
        secondary_use_gradient: secondaryUseGradient,
        frontend_accent_use_gradient: frontendAccentUseGradient,
        frontend_secondary_accent_use_gradient: frontendSecondaryAccentUseGradient,
        frontend_bg_use_gradient: frontendBgUseGradient,
        frontend_header_bg_use_gradient: frontendHeaderBgUseGradient,
        song_border_use_gradient: songBorderUseGradient,
        nav_bg_use_gradient: navBgUseGradient,
        highlight_use_gradient: highlightUseGradient,

        // Other settings
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
          <h4 className="text-md font-medium text-white mb-4">Primary Brand Colors</h4>
          <div className="space-y-6">
            <ColorPickerWithGradient
              label="Primary Color"
              description="Used for main accent color (legacy support)"
              solidColor={primaryColor}
              gradientStart={primaryGradientStart}
              gradientEnd={primaryGradientEnd}
              useGradient={primaryUseGradient}
              onSolidChange={setPrimaryColor}
              onGradientStartChange={setPrimaryGradientStart}
              onGradientEndChange={setPrimaryGradientEnd}
              onUseGradientChange={setPrimaryUseGradient}
            />

            <ColorPickerWithGradient
              label="Secondary Color"
              description="Used for background gradients (legacy support)"
              solidColor={secondaryColor}
              gradientStart={secondaryGradientStart}
              gradientEnd={secondaryGradientEnd}
              useGradient={secondaryUseGradient}
              onSolidChange={setSecondaryColor}
              onGradientStartChange={setSecondaryGradientStart}
              onGradientEndChange={setSecondaryGradientEnd}
              onUseGradientChange={setSecondaryUseGradient}
            />
          </div>
        </div>

        {/* Frontend Colors Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-4">Frontend Accent Colors</h4>
          <div className="space-y-6">
            <ColorPickerWithGradient
              label="Frontend Accent Color"
              description="Main buttons, REQUEST button, highlights"
              solidColor={frontendAccentColor}
              gradientStart={frontendAccentGradientStart}
              gradientEnd={frontendAccentGradientEnd}
              useGradient={frontendAccentUseGradient}
              onSolidChange={setFrontendAccentColor}
              onGradientStartChange={setFrontendAccentGradientStart}
              onGradientEndChange={setFrontendAccentGradientEnd}
              onUseGradientChange={setFrontendAccentUseGradient}
            />

            <ColorPickerWithGradient
              label="Frontend Secondary Accent"
              description="Secondary buttons and accents"
              solidColor={frontendSecondaryAccent}
              gradientStart={frontendSecondaryAccentGradientStart}
              gradientEnd={frontendSecondaryAccentGradientEnd}
              useGradient={frontendSecondaryAccentUseGradient}
              onSolidChange={setFrontendSecondaryAccent}
              onGradientStartChange={setFrontendSecondaryAccentGradientStart}
              onGradientEndChange={setFrontendSecondaryAccentGradientEnd}
              onUseGradientChange={setFrontendSecondaryAccentUseGradient}
            />

            <ColorPickerWithGradient
              label="Song Border Color"
              description="Border and glow around song cards"
              solidColor={songBorderColor}
              gradientStart={songBorderGradientStart}
              gradientEnd={songBorderGradientEnd}
              useGradient={songBorderUseGradient}
              onSolidChange={setSongBorderColor}
              onGradientStartChange={setSongBorderGradientStart}
              onGradientEndChange={setSongBorderGradientEnd}
              onUseGradientChange={setSongBorderUseGradient}
            />

            <ColorPickerWithGradient
              label="Highlight Color"
              description="Special highlights and focus states"
              solidColor={highlightColor}
              gradientStart={highlightGradientStart}
              gradientEnd={highlightGradientEnd}
              useGradient={highlightUseGradient}
              onSolidChange={setHighlightColor}
              onGradientStartChange={setHighlightGradientStart}
              onGradientEndChange={setHighlightGradientEnd}
              onUseGradientChange={setHighlightUseGradient}
            />
          </div>
        </div>

        {/* Background Colors Section */}
        <div className="pb-4 border-b border-gray-700">
          <h4 className="text-md font-medium text-white mb-4">Background Colors</h4>
          <div className="space-y-6">
            <ColorPickerWithGradient
              label="Frontend Background"
              description="Main page background color"
              solidColor={frontendBgColor}
              gradientStart={frontendBgGradientStart}
              gradientEnd={frontendBgGradientEnd}
              useGradient={frontendBgUseGradient}
              onSolidChange={setFrontendBgColor}
              onGradientStartChange={setFrontendBgGradientStart}
              onGradientEndChange={setFrontendBgGradientEnd}
              onUseGradientChange={setFrontendBgUseGradient}
            />

            <ColorPickerWithGradient
              label="Header Background"
              description="Header and navigation background"
              solidColor={frontendHeaderBg}
              gradientStart={frontendHeaderBgGradientStart}
              gradientEnd={frontendHeaderBgGradientEnd}
              useGradient={frontendHeaderBgUseGradient}
              onSolidChange={setFrontendHeaderBg}
              onGradientStartChange={setFrontendHeaderBgGradientStart}
              onGradientEndChange={setFrontendHeaderBgGradientEnd}
              onUseGradientChange={setFrontendHeaderBgUseGradient}
            />

            <ColorPickerWithGradient
              label="Navigation Background"
              description="Bottom navigation bar background"
              solidColor={navBgColor}
              gradientStart={navBgGradientStart}
              gradientEnd={navBgGradientEnd}
              useGradient={navBgUseGradient}
              onSolidChange={setNavBgColor}
              onGradientStartChange={setNavBgGradientStart}
              onGradientEndChange={setNavBgGradientEnd}
              onUseGradientChange={setNavBgUseGradient}
            />
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