/**
 * URL Routing Utilities for Multi-Tenancy
 *
 * Handles URL parsing, slug extraction, and route detection for public pages.
 *
 * URL Structure:
 * - /request/{slug}     - Public request page for a specific band
 * - /kiosk/{slug}       - Kiosk display for a specific band
 * - /vote/{slug}        - Voting page for a specific band (alias for request)
 * - /leaderboard/{slug} - Leaderboard for a specific band
 * - /dashboard          - Band's admin dashboard (requires login)
 * - /                   - Landing page or authenticated user's frontend
 */

import { supabase } from './supabase';

// Route types
export type PublicRouteType = 'request' | 'kiosk' | 'vote' | 'leaderboard';
export type AuthRouteType = 'dashboard';
export type RouteType = PublicRouteType | AuthRouteType | 'landing' | 'frontend';

// Route info returned by parseUrl
export interface RouteInfo {
  type: RouteType;
  slug: string | null;
  isPublicPage: boolean;
  requiresAuth: boolean;
}

// Reserved slugs that cannot be used
const RESERVED_SLUGS = new Set([
  'dashboard',
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'settings',
  'profile',
  'account',
  'help',
  'support',
  'about',
  'contact',
  'terms',
  'privacy',
  'kiosk',
  'request',
  'vote',
  'leaderboard',
  'public',
  'static',
  'assets',
  'images',
  'css',
  'js',
]);

/**
 * Parse the current URL and extract route information
 */
export function parseUrl(pathname: string = window.location.pathname): RouteInfo {
  // Normalize path: remove trailing slash, lowercase
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);

  // Dashboard route (auth required)
  if (segments[0] === 'dashboard') {
    return {
      type: 'dashboard',
      slug: null,
      isPublicPage: false,
      requiresAuth: true,
    };
  }

  // Public routes with slug: /request/{slug}, /kiosk/{slug}, /vote/{slug}, /leaderboard/{slug}
  if (segments.length >= 2) {
    const routeType = segments[0] as PublicRouteType;
    const slug = segments[1];

    if (['request', 'kiosk', 'vote', 'leaderboard'].includes(routeType)) {
      return {
        type: routeType === 'vote' ? 'request' : routeType, // 'vote' is alias for 'request'
        slug: slug,
        isPublicPage: true,
        requiresAuth: false,
      };
    }
  }

  // Legacy routes without slug (for backwards compatibility)
  // These require authentication
  if (segments.length === 1) {
    if (segments[0] === 'kiosk') {
      return {
        type: 'kiosk',
        slug: null,
        isPublicPage: false, // Legacy kiosk requires auth
        requiresAuth: true,
      };
    }
    if (segments[0] === 'leaderboard') {
      return {
        type: 'leaderboard',
        slug: null,
        isPublicPage: false,
        requiresAuth: true,
      };
    }
  }

  // Root path
  if (normalizedPath === '/' || segments.length === 0) {
    return {
      type: 'landing',
      slug: null,
      isPublicPage: true,
      requiresAuth: false,
    };
  }

  // Default to frontend view
  return {
    type: 'frontend',
    slug: null,
    isPublicPage: false,
    requiresAuth: false,
  };
}

/**
 * Get the current route info
 */
export function getCurrentRoute(): RouteInfo {
  return parseUrl(window.location.pathname);
}

/**
 * Check if current route is a public page with a slug
 */
export function isPublicSlugRoute(): boolean {
  const route = getCurrentRoute();
  return route.isPublicPage && route.slug !== null;
}

/**
 * Get the slug from the current URL (if present)
 */
export function getSlugFromUrl(): string | null {
  return getCurrentRoute().slug;
}

/**
 * Validate a slug format
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  // Check length
  if (slug.length < 3) {
    return { valid: false, error: 'URL must be at least 3 characters' };
  }
  if (slug.length > 30) {
    return { valid: false, error: 'URL must be 30 characters or less' };
  }

  // Check format: lowercase letters, numbers, and hyphens only
  const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'URL can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'
    };
  }

  // Check for consecutive hyphens
  if (slug.includes('--')) {
    return { valid: false, error: 'URL cannot contain consecutive hyphens' };
  }

  // Check reserved slugs
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: 'This URL is reserved. Please choose another.' };
  }

  return { valid: true };
}

/**
 * Generate URL for a specific route and slug
 */
export function generatePublicUrl(routeType: PublicRouteType, slug: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/${routeType}/${slug}`;
}

/**
 * Look up user ID from a slug
 */
export async function getUserIdFromSlug(slug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (error) {
      console.error('Error looking up user from slug:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error('Error in getUserIdFromSlug:', error);
    return null;
  }
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  // First validate format
  const validation = validateSlug(slug);
  if (!validation.valid) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    // If no data found, slug is available
    if (error && error.code === 'PGRST116') {
      return true;
    }

    // If we got data, slug is taken
    return !data;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }
}

/**
 * Navigate to a route (updates browser history)
 */
export function navigateTo(path: string, replace: boolean = false): void {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  // Dispatch popstate to trigger route detection
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Navigate to dashboard
 */
export function navigateToDashboard(): void {
  navigateTo('/dashboard');
}

/**
 * Navigate to public request page
 */
export function navigateToPublicRequest(slug: string): void {
  navigateTo(`/request/${slug}`);
}

/**
 * Navigate to public kiosk page
 */
export function navigateToPublicKiosk(slug: string): void {
  navigateTo(`/kiosk/${slug}`);
}

/**
 * Navigate to home/landing
 */
export function navigateToHome(): void {
  navigateTo('/');
}
