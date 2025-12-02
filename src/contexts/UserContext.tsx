import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { getCurrentRoute, getUserIdFromSlug as lookupUserFromSlug } from '../utils/urlRouting';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Profile type for extended user data
export interface UserProfile {
  id: string;
  slug: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

// Context value type
export interface UserContextValue {
  // Supabase auth user
  user: SupabaseUser | null;
  // User profile with slug
  profile: UserProfile | null;
  // Session
  session: Session | null;
  // Loading state
  isLoading: boolean;
  // Auth state
  isAuthenticated: boolean;
  // User ID shorthand
  userId: string | null;
  // Functions
  refreshProfile: () => Promise<void>;
  updateSlug: (slug: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// Context for viewing another user's data (public frontend)
export interface ViewingContextValue {
  // The user ID we're viewing (for public pages like /request/bandname)
  viewingUserId: string | null;
  // The slug we're viewing
  viewingSlug: string | null;
  // Set the viewing context
  setViewingUser: (userId: string | null, slug: string | null) => void;
  // Clear viewing context
  clearViewingUser: () => void;
  // Is viewing another user's data
  isViewingOther: boolean;
  // Is slug being resolved (loading state)
  isResolvingSlug: boolean;
  // Error if slug resolution failed
  slugError: string | null;
  // Is this a public page (no auth required)
  isPublicPage: boolean;
}

// Create contexts
const UserContext = createContext<UserContextValue | null>(null);
const ViewingContext = createContext<ViewingContextValue | null>(null);

// Hook to use user context
export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

// Hook to use viewing context
export function useViewingContext(): ViewingContextValue {
  const context = useContext(ViewingContext);
  if (!context) {
    throw new Error('useViewingContext must be used within a UserProvider');
  }
  return context;
}

// Hook to get the effective user ID (either authenticated user or viewed user)
export function useEffectiveUserId(): string | null {
  const { userId } = useUserContext();
  const { viewingUserId } = useViewingContext();

  // If viewing another user's data, use their ID
  // Otherwise use the authenticated user's ID
  return viewingUserId || userId;
}

// Provider props
interface UserProviderProps {
  children: ReactNode;
}

// Provider component
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Viewing context state
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingSlug, setViewingSlug] = useState<string | null>(null);
  const [isResolvingSlug, setIsResolvingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isPublicPage, setIsPublicPage] = useState(false);

  // Track failed profile creation attempts to prevent infinite loops
  const profileCreationAttempts = React.useRef<Set<string>>(new Set());

  // Fetch user profile with timeout and graceful fallback
  // NOTE: Profile fetching is currently disabled due to RLS issues
  // The app works fine without profiles - just using auth userId
  const fetchProfile = useCallback(async (userId: string, userData?: { email?: string; full_name?: string }) => {
    // TEMPORARILY DISABLED - profiles table has RLS/schema issues
    // The app works fine using just the auth userId
    console.log('Profile fetch disabled - using auth userId directly:', userId);
    profileCreationAttempts.current.add(userId); // Mark as "handled"
    return;

    /* Original code disabled until migration is properly run:
    // Early exit if we've already tried and failed for this user
    if (profileCreationAttempts.current.has(userId)) {
      console.log('Profile fetch skipped - already attempted for user:', userId);
      return;
    }

    const PROFILE_TIMEOUT = 5000; // 5 second timeout

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        profileCreationAttempts.current.add(userId);
        console.warn('Profile fetch failed, continuing without:', error.message);
        return;
      }

      setProfile(data);
    } catch (error) {
      profileCreationAttempts.current.add(userId);
      console.warn('Error in fetchProfile (continuing without profile):', error);
    }
    */
  }, []); // No dependencies - userData is passed as parameter

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, {
        email: user.email,
        full_name: user.user_metadata?.full_name
      });
    }
  }, [user, fetchProfile]);

  // Update user slug
  const updateSlug = useCallback(async (slug: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    if (slug.length < 3) {
      return { success: false, error: 'Slug must be at least 3 characters' };
    }

    if (slug.length > 30) {
      return { success: false, error: 'Slug must be 30 characters or less' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          slug,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') { // Unique violation
          return { success: false, error: 'This URL is already taken. Please choose another.' };
        }
        throw error;
      }

      // Refresh profile to get updated data
      await refreshProfile();
      return { success: true };
    } catch (error) {
      console.error('Error updating slug:', error);
      return { success: false, error: 'Failed to update URL. Please try again.' };
    }
  }, [user, refreshProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    localStorage.removeItem('backendAuth');
    localStorage.removeItem('backendUser');
  }, []);

  // Set viewing context
  const setViewingUser = useCallback((userId: string | null, slug: string | null) => {
    setViewingUserId(userId);
    setViewingSlug(slug);
  }, []);

  // Clear viewing context
  const clearViewingUser = useCallback(() => {
    setViewingUserId(null);
    setViewingSlug(null);
    setSlugError(null);
    setIsPublicPage(false);
  }, []);

  // Auto-detect and resolve slug from URL
  useEffect(() => {
    let mounted = true;

    const resolveSlugFromUrl = async () => {
      const route = getCurrentRoute();

      console.log('🔗 [ViewingContext] Route detected:', route);

      // Update public page state
      setIsPublicPage(route.isPublicPage);

      // If there's a slug in the URL, resolve it to a user ID
      if (route.slug && route.isPublicPage) {
        setIsResolvingSlug(true);
        setSlugError(null);
        setViewingSlug(route.slug);

        try {
          console.log('🔍 [ViewingContext] Looking up user ID for slug:', route.slug);
          const userId = await lookupUserFromSlug(route.slug);

          if (!mounted) return;

          if (userId) {
            console.log('✅ [ViewingContext] Found user ID:', userId, 'for slug:', route.slug);
            setViewingUserId(userId);
            setSlugError(null);
          } else {
            console.error('❌ [ViewingContext] No user found for slug:', route.slug);
            setViewingUserId(null);
            setSlugError(`Band "${route.slug}" not found. Please check the URL.`);
          }
        } catch (error) {
          console.error('Error resolving slug:', error);
          if (mounted) {
            setViewingUserId(null);
            setSlugError('Error loading band data. Please try again.');
          }
        } finally {
          if (mounted) {
            setIsResolvingSlug(false);
          }
        }
      } else if (!route.slug) {
        // No slug in URL - clear viewing context
        setViewingUserId(null);
        setViewingSlug(null);
        setSlugError(null);
        setIsResolvingSlug(false);
      }
    };

    resolveSlugFromUrl();

    // Listen for URL changes (popstate events)
    const handleUrlChange = () => {
      resolveSlugFromUrl();
    };

    window.addEventListener('popstate', handleUrlChange);

    return () => {
      mounted = false;
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []); // Run once on mount and listen for URL changes

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    const AUTH_INIT_TIMEOUT = 8000; // 8 second max timeout for entire auth init

    const initAuth = async () => {
      // Set a maximum timeout for auth initialization
      const timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn('Auth initialization timed out, proceeding without auth');
          setIsLoading(false);
        }
      }, AUTH_INIT_TIMEOUT);

      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            // Profile fetch is non-blocking (has its own timeout)
            await fetchProfile(initialSession.user.id, {
              email: initialSession.user.email,
              full_name: initialSession.user.user_metadata?.full_name
            });
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('Auth state changed:', event);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id, {
          email: newSession.user.email,
          full_name: newSession.user.user_metadata?.full_name
        });
      } else {
        setProfile(null);
      }

      // Handle specific events
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('backendAuth');
        localStorage.removeItem('backendUser');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // User context value
  const userContextValue: UserContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    refreshProfile,
    updateSlug,
    signOut
  };

  // Viewing context value
  const viewingContextValue: ViewingContextValue = {
    viewingUserId,
    viewingSlug,
    setViewingUser,
    clearViewingUser,
    isViewingOther: !!viewingUserId && viewingUserId !== user?.id,
    isResolvingSlug,
    slugError,
    isPublicPage
  };

  return (
    <UserContext.Provider value={userContextValue}>
      <ViewingContext.Provider value={viewingContextValue}>
        {children}
      </ViewingContext.Provider>
    </UserContext.Provider>
  );
}

// Utility function to get user ID from slug (for public pages)
export async function getUserIdFromSlug(slug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_id_from_slug', { p_slug: slug });

    if (error) {
      console.error('Error getting user ID from slug:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserIdFromSlug:', error);
    return null;
  }
}

// Alternative: Direct query (if RPC not available)
export async function getUserIdFromSlugDirect(slug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error getting user ID from slug:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error('Error in getUserIdFromSlugDirect:', error);
    return null;
  }
}
