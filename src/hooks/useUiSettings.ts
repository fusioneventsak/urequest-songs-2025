import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { UiSettings } from '../types';

// Default logo URL from Fusion Events 
const DEFAULT_LOGO_URL = "https://www.fusion-events.ca/wp-content/uploads/2025/03/ulr-wordmark.png";

// Default settings to use when none exist in the database
const DEFAULT_SETTINGS: Omit<UiSettings, 'id'> = {
  band_logo_url: DEFAULT_LOGO_URL,
  band_name: 'uRequest Live',
  primary_color: '#ff00ff',
  primary_gradient_start: '#ff00ff',
  primary_gradient_end: '#9d00ff',
  secondary_color: '#9d00ff',
  secondary_gradient_start: '#9d00ff',
  secondary_gradient_end: '#7a00cc',
  frontend_bg_color: '#13091f',
  frontend_bg_gradient_start: '#13091f',
  frontend_bg_gradient_end: '#0f051d',
  frontend_accent_color: '#ff00ff',
  frontend_accent_gradient_start: '#ff00ff',
  frontend_accent_gradient_end: '#9d00ff',
  frontend_header_bg: '#13091f',
  frontend_header_bg_gradient_start: '#13091f',
  frontend_header_bg_gradient_end: '#0f051d',
  frontend_secondary_accent: '#9d00ff',
  frontend_secondary_accent_gradient_start: '#9d00ff',
  frontend_secondary_accent_gradient_end: '#7a00cc',
  song_border_color: '#ff00ff',
  song_border_gradient_start: '#ff00ff',
  song_border_gradient_end: '#9d00ff',
  nav_bg_color: '#0f051d',
  nav_bg_gradient_start: '#0f051d',
  nav_bg_gradient_end: '#0a0310',
  highlight_color: '#ff00ff',
  highlight_gradient_start: '#ff00ff',
  highlight_gradient_end: '#9d00ff',
  custom_message: '',
  ticker_active: false,
  show_qr_code: false,
  photobooth_url: null
};

// Function to apply colors instantly without DOM manipulation that breaks scrolling
const applyColorsInstantly = (colors: Record<string, string>) => {
  // Use a simpler, more performant method that doesn't break scrolling
  const style = document.getElementById('instant-colors-style') || document.createElement('style');
  if (!style.id) {
    style.id = 'instant-colors-style';
    document.head.appendChild(style);
  }
  
  // Create CSS rules that override with high specificity instead of !important
  const cssRules = Object.entries(colors).map(([property, value]) => {
    return `:root { ${property}: ${value} !important; }`;
  }).join('\n');
  
  style.textContent = cssRules;
  
  // Save to localStorage for next visit
  localStorage.setItem('uiColors', JSON.stringify(colors));
  
  console.log('Applied colors instantly via CSS injection:', colors);
};

export function useUiSettings() {
  // All useState hooks first - fixed order
  const [settings, setSettings] = useState<UiSettings | null>(() => {
    // Initialize with defaults immediately - no loading state
    return DEFAULT_SETTINGS as UiSettings;
  });
  const [loading, setLoading] = useState(false); // Start as false - no loading states
  const [timestamp, setTimestamp] = useState(Date.now());
  const [initialized, setInitialized] = useState(true); // Start as initialized
  const [error, setError] = useState<Error | null>(null);

  // All useCallback hooks - fixed order
  const applyCssVariables = useCallback((newSettings: UiSettings) => {
    const colors = {
      // Solid color variables (always solid, for borders/text/shadows)
      '--frontend-bg-color': newSettings.frontend_bg_color || DEFAULT_SETTINGS.frontend_bg_color,
      '--frontend-accent-color': newSettings.frontend_accent_color || DEFAULT_SETTINGS.frontend_accent_color,
      '--frontend-header-bg': newSettings.frontend_header_bg || DEFAULT_SETTINGS.frontend_header_bg,
      '--frontend-secondary-accent': newSettings.frontend_secondary_accent || DEFAULT_SETTINGS.frontend_secondary_accent,
      '--song-border-color': newSettings.song_border_color || newSettings.frontend_accent_color || DEFAULT_SETTINGS.song_border_color,
      '--neon-pink': newSettings.primary_color || DEFAULT_SETTINGS.primary_color,
      '--neon-purple': newSettings.secondary_color || DEFAULT_SETTINGS.secondary_color,
      '--nav-bg-color': newSettings.nav_bg_color || DEFAULT_SETTINGS.nav_bg_color,
      '--highlight-color': newSettings.highlight_color || DEFAULT_SETTINGS.highlight_color,

      // Background-specific variables (can be gradients)
      '--frontend-bg-color-bg': newSettings.frontend_bg_use_gradient
        ? `linear-gradient(135deg, ${newSettings.frontend_bg_gradient_start}, ${newSettings.frontend_bg_gradient_end})`
        : (newSettings.frontend_bg_color || DEFAULT_SETTINGS.frontend_bg_color),
      '--frontend-accent-color-bg': newSettings.frontend_accent_use_gradient
        ? `linear-gradient(135deg, ${newSettings.frontend_accent_gradient_start}, ${newSettings.frontend_accent_gradient_end})`
        : (newSettings.frontend_accent_color || DEFAULT_SETTINGS.frontend_accent_color),
      '--frontend-header-bg-bg': newSettings.frontend_header_bg_use_gradient
        ? `linear-gradient(135deg, ${newSettings.frontend_header_bg_gradient_start}, ${newSettings.frontend_header_bg_gradient_end})`
        : (newSettings.frontend_header_bg || DEFAULT_SETTINGS.frontend_header_bg),
      '--frontend-secondary-accent-bg': newSettings.frontend_secondary_accent_use_gradient
        ? `linear-gradient(135deg, ${newSettings.frontend_secondary_accent_gradient_start}, ${newSettings.frontend_secondary_accent_gradient_end})`
        : (newSettings.frontend_secondary_accent || DEFAULT_SETTINGS.frontend_secondary_accent),
      '--song-border-color-bg': newSettings.song_border_use_gradient
        ? `linear-gradient(135deg, ${newSettings.song_border_gradient_start}, ${newSettings.song_border_gradient_end})`
        : (newSettings.song_border_color || newSettings.frontend_accent_color || DEFAULT_SETTINGS.song_border_color),
      '--neon-pink-bg': newSettings.primary_use_gradient
        ? `linear-gradient(135deg, ${newSettings.primary_gradient_start}, ${newSettings.primary_gradient_end})`
        : (newSettings.primary_color || DEFAULT_SETTINGS.primary_color),
      '--neon-purple-bg': newSettings.secondary_use_gradient
        ? `linear-gradient(135deg, ${newSettings.secondary_gradient_start}, ${newSettings.secondary_gradient_end})`
        : (newSettings.secondary_color || DEFAULT_SETTINGS.secondary_color),
      '--nav-bg-color-bg': newSettings.nav_bg_use_gradient
        ? `linear-gradient(135deg, ${newSettings.nav_bg_gradient_start}, ${newSettings.nav_bg_gradient_end})`
        : (newSettings.nav_bg_color || DEFAULT_SETTINGS.nav_bg_color),
      '--highlight-color-bg': newSettings.highlight_use_gradient
        ? `linear-gradient(135deg, ${newSettings.highlight_gradient_start}, ${newSettings.highlight_gradient_end})`
        : (newSettings.highlight_color || DEFAULT_SETTINGS.highlight_color)
    };

    applyColorsInstantly(colors);
  }, []);

  const refreshSettings = useCallback(() => {
    console.log("Refreshing UI settings");
    setTimestamp(Date.now());
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No authenticated user - using default settings');
        // Use default settings for non-authenticated users
        const defaultSettings = { ...DEFAULT_SETTINGS, id: 'default' } as UiSettings;
        setSettings(defaultSettings);
        applyCssVariables(defaultSettings);
        return;
      }

      console.log('🔄 Fetching UI settings for user:', user.id);

      // Add 5-second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Settings fetch timeout')), 5000)
      );

      // Fetch settings for the current user only
      // RLS policies will automatically filter to user's data
      const fetchPromise = supabase
        .from('ui_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: allSettings, error: fetchError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (fetchError) throw fetchError;
      
      let settingsToUse: UiSettings;
      
      if (!allSettings || allSettings.length === 0) {
        console.log("No UI settings found for user, creating defaults");
        const { data: newSettings, error: createError } = await supabase
          .from('ui_settings')
          .insert({
            ...DEFAULT_SETTINGS,
            user_id: user.id  // Associate settings with current user
          })
          .select()
          .single();

        if (createError) throw createError;
        settingsToUse = newSettings as UiSettings;
      } else {
        settingsToUse = allSettings[0] as UiSettings;
      }

      // Ensure all required color settings exist
      settingsToUse = {
        ...DEFAULT_SETTINGS,
        ...settingsToUse
      };

      // Apply CSS variables immediately for instant color change
      applyCssVariables(settingsToUse);
      
      // Update settings state but keep initialized as true
      setSettings(settingsToUse);
      setError(null);
      
      console.log('✅ UI settings fetched successfully');
    } catch (err) {
      console.error('Error fetching UI settings:', err);
      
      // Handle network errors gracefully
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network')) {
        console.warn('🌐 Network error detected, using cached/default settings');
        setError(null); // Don't treat network errors as app errors
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      
      // Try to load from localStorage as fallback
      const savedColors = localStorage.getItem('uiColors');
      if (savedColors) {
        try {
          const colors = JSON.parse(savedColors);
          applyColorsInstantly(colors);
          console.log('📱 Applied colors from localStorage due to network error');
          
          // Create mock settings from localStorage colors
          const mockSettings: UiSettings = {
            ...DEFAULT_SETTINGS,
            id: 'offline-fallback',
            frontend_bg_color: colors['--frontend-bg-color'] || DEFAULT_SETTINGS.frontend_bg_color,
            frontend_accent_color: colors['--frontend-accent-color'] || DEFAULT_SETTINGS.frontend_accent_color,
            frontend_header_bg: colors['--frontend-header-bg'] || DEFAULT_SETTINGS.frontend_header_bg,
            frontend_secondary_accent: colors['--frontend-secondary-accent'] || DEFAULT_SETTINGS.frontend_secondary_accent,
            song_border_color: colors['--song-border-color'] || DEFAULT_SETTINGS.song_border_color,
            primary_color: colors['--neon-pink'] || DEFAULT_SETTINGS.primary_color,
            secondary_color: colors['--neon-purple'] || DEFAULT_SETTINGS.secondary_color
          };
          
          setSettings(mockSettings);
        } catch (e) {
          console.error('Error loading from localStorage:', e);
          // Keep defaults that are already set
        }
      }
      // If no localStorage, keep the default settings that are already initialized
    }
    // No finally block - never set loading to false since we never set it to true
  }, [applyCssVariables]);

  const updateSettings = useCallback(async (newSettings: Partial<UiSettings>) => {
    // Apply colors INSTANTLY before any database operation
    // Check if any color-related settings are being updated
    const hasColorChanges =
      newSettings.frontend_bg_color || newSettings.frontend_bg_use_gradient !== undefined ||
      newSettings.frontend_accent_color || newSettings.frontend_accent_use_gradient !== undefined ||
      newSettings.frontend_header_bg || newSettings.frontend_header_bg_use_gradient !== undefined ||
      newSettings.frontend_secondary_accent || newSettings.frontend_secondary_accent_use_gradient !== undefined ||
      newSettings.song_border_color || newSettings.song_border_use_gradient !== undefined ||
      newSettings.primary_color || newSettings.primary_use_gradient !== undefined ||
      newSettings.secondary_color || newSettings.secondary_use_gradient !== undefined ||
      newSettings.nav_bg_color || newSettings.nav_bg_use_gradient !== undefined ||
      newSettings.highlight_color || newSettings.highlight_use_gradient !== undefined;

    if (hasColorChanges) {
      // Get current settings to merge with new settings
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Settings fetch timeout')), 5000)
      );

      const fetchPromise = supabase
        .from('ui_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: currentSettings } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...(currentSettings && currentSettings.length > 0 ? currentSettings[0] : {}),
        ...newSettings
      } as UiSettings;

      const colors: Record<string, string> = {};

      // Build colors object for instant application with gradient support
      colors['--frontend-bg-color'] = mergedSettings.frontend_bg_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.frontend_bg_gradient_start}, ${mergedSettings.frontend_bg_gradient_end})`
        : mergedSettings.frontend_bg_color;

      colors['--frontend-accent-color'] = mergedSettings.frontend_accent_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.frontend_accent_gradient_start}, ${mergedSettings.frontend_accent_gradient_end})`
        : mergedSettings.frontend_accent_color;

      colors['--frontend-header-bg'] = mergedSettings.frontend_header_bg_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.frontend_header_bg_gradient_start}, ${mergedSettings.frontend_header_bg_gradient_end})`
        : mergedSettings.frontend_header_bg;

      colors['--frontend-secondary-accent'] = mergedSettings.frontend_secondary_accent_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.frontend_secondary_accent_gradient_start}, ${mergedSettings.frontend_secondary_accent_gradient_end})`
        : mergedSettings.frontend_secondary_accent;

      colors['--song-border-color'] = mergedSettings.song_border_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.song_border_gradient_start}, ${mergedSettings.song_border_gradient_end})`
        : mergedSettings.song_border_color;

      colors['--neon-pink'] = mergedSettings.primary_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.primary_gradient_start}, ${mergedSettings.primary_gradient_end})`
        : mergedSettings.primary_color;

      colors['--neon-purple'] = mergedSettings.secondary_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.secondary_gradient_start}, ${mergedSettings.secondary_gradient_end})`
        : mergedSettings.secondary_color;

      colors['--nav-bg-color'] = mergedSettings.nav_bg_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.nav_bg_gradient_start}, ${mergedSettings.nav_bg_gradient_end})`
        : mergedSettings.nav_bg_color;

      colors['--highlight-color'] = mergedSettings.highlight_use_gradient
        ? `linear-gradient(135deg, ${mergedSettings.highlight_gradient_start}, ${mergedSettings.highlight_gradient_end})`
        : mergedSettings.highlight_color;
      
      // Apply instantly BEFORE database update
      applyColorsInstantly(colors);
      console.log('🎨 Colors applied instantly, updating database in background...');
    }

    // Then update the database in the background
    try {
      // Add timeout for database fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Settings fetch timeout')), 5000)
      );

      const fetchPromise = supabase
        .from('ui_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: currentSettings } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (!currentSettings || currentSettings.length === 0) {
        // Add timeout for insert
        const insertTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Settings insert timeout')), 5000)
        );

        const insertPromise = supabase
          .from('ui_settings')
          .insert({
            ...DEFAULT_SETTINGS,
            ...newSettings,
            updated_at: new Date().toISOString()
          });

        const { error: createError } = await Promise.race([
          insertPromise,
          insertTimeoutPromise
        ]) as any;

        if (createError) throw createError;
      } else {
        // Add timeout for update
        const updateTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Settings update timeout')), 5000)
        );

        const updatePromise = supabase
          .from('ui_settings')
          .update({
            ...newSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSettings[0].id);

        const { error: updateError } = await Promise.race([
          updatePromise,
          updateTimeoutPromise
        ]) as any;

        if (updateError) throw updateError;
      }

      console.log('✅ Database updated successfully');
      
      // Force refresh to ensure all components update (but colors already applied)
      await fetchSettings();
      refreshSettings();
    } catch (error) {
      console.error('❌ Error updating UI settings database:', error);
      
      // Check if it's a network error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('network')) {
        console.warn('🌐 Network error during database update, but colors were applied instantly');
        // Don't throw error for network issues since colors are already applied
        return;
      }
      
      // For other errors, still throw
      throw error;
    }
  }, [fetchSettings, refreshSettings]);

  // Single useEffect to handle everything - FIXED ORDER
  useEffect(() => {
    // Apply saved colors immediately before any database fetch
    try {
      const savedColors = localStorage.getItem('uiColors');
      if (savedColors) {
        const colors = JSON.parse(savedColors);
        applyColorsInstantly(colors);
        console.log('🎨 Applied saved colors from localStorage immediately');
        
        // Update settings state with localStorage data immediately
        const mockSettings: UiSettings = {
          ...DEFAULT_SETTINGS,
          id: 'localStorage-initialized',
          frontend_bg_color: colors['--frontend-bg-color'] || DEFAULT_SETTINGS.frontend_bg_color,
          frontend_accent_color: colors['--frontend-accent-color'] || DEFAULT_SETTINGS.frontend_accent_color,
          frontend_header_bg: colors['--frontend-header-bg'] || DEFAULT_SETTINGS.frontend_header_bg,
          frontend_secondary_accent: colors['--frontend-secondary-accent'] || DEFAULT_SETTINGS.frontend_secondary_accent,
          song_border_color: colors['--song-border-color'] || DEFAULT_SETTINGS.song_border_color,
          primary_color: colors['--neon-pink'] || DEFAULT_SETTINGS.primary_color,
          secondary_color: colors['--neon-purple'] || DEFAULT_SETTINGS.secondary_color
        };
        setSettings(mockSettings);
      }
    } catch (e) {
      console.warn('⚠️ Error loading colors from localStorage:', e);
    }

    // Fetch settings from database in the background (no loading states)
    fetchSettings().catch(err => {
      console.error('❌ Error in initial settings fetch:', err);
    });

    // Set up realtime subscription for settings changes (only if online)
    let channel: any = null;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    try {
      channel = supabase.channel('ui_settings_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'ui_settings' },
            () => {
              console.log("🔄 UI settings changed, fetching updates");
              fetchSettings().catch(err => {
                console.error('❌ Error fetching updated settings:', err);
              });
            })
        .subscribe((status) => {
          console.log('📡 UI settings subscription status:', status);
        });
      
      // Set up periodic refresh as a fallback (less frequent to reduce errors)
      refreshInterval = setInterval(() => {
        fetchSettings().catch(err => {
          console.warn('⚠️ Periodic settings refresh failed (this is normal if offline):', err);
        });
      }, 60000); // Reduced to 1 minute instead of 30 seconds
      
    } catch (subscriptionError) {
      console.warn('⚠️ Could not set up realtime subscription (offline mode):', subscriptionError);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('⚠️ Error removing channel:', e);
        }
      }
    };
  }, [fetchSettings]); // Only depend on fetchSettings

  return {
    settings,
    loading,
    error,
    initialized,
    timestamp,
    updateSettings,
    refreshSettings
  };
}