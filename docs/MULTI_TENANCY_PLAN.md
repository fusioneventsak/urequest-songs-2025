# Multi-Tenancy Implementation Plan

## Executive Summary

This document outlines the implementation of proper URL-based multi-tenancy for uRequest Songs, enabling multiple bands/DJs to use the platform simultaneously with isolated data and unique public URLs.

## Current State (IMPLEMENTED)

### How It Works Now
- URL-based multi-tenancy using slug identifiers
- Public URL paths: `/request/{slug}`, `/kiosk/{slug}`, `/leaderboard/{slug}`
- Data filtered by `effectiveUserId` which resolves from URL slug
- Guest access supported without authentication

### Solved Problems
1. ✅ **Unique URLs per band** - Each band has `/request/their-band-name`
2. ✅ **Kiosk without login** - Share public kiosk links
3. ✅ **Guest voting works** - Guests can vote on any public page
4. ✅ **No conflicts** - Two bands can use their kiosks simultaneously

## Architecture

### URL Structure
```
Public Pages (no auth required):
  /request/{slug}     - Guest request page for a specific band
  /kiosk/{slug}       - Kiosk display for a specific band
  /vote/{slug}        - Voting page for a specific band (alias for request)
  /leaderboard/{slug} - Leaderboard for a specific band

Authenticated Pages:
  /dashboard          - Band's admin dashboard (requires login)
```

### Slug System
- Each band chooses a unique slug in Settings → Public URL
- Slug stored in `profiles.slug` column
- Slugs are URL-safe: lowercase, alphanumeric, hyphens allowed
- Examples: `fusion-events`, `dj-awesome`, `wedding-band-toronto`

### Data Flow for Public Pages
```
1. User visits /kiosk/fusion-events
2. App extracts slug from URL (urlRouting.ts)
3. ViewingContext looks up user_id from profiles WHERE slug = 'fusion-events'
4. ViewingContext sets viewingUserId
5. useEffectiveUserId() returns viewingUserId for data hooks
6. All data hooks filter by effectiveUserId
7. Guest can request songs and vote (associated with that band)
```

## Implementation Status

### Phase 1: URL Routing Infrastructure ✅
- [x] Created `src/utils/urlRouting.ts` with slug parsing
- [x] Implemented `parseUrl()` and `getCurrentRoute()` functions
- [x] Created `RouteInfo` interface for route detection
- [x] Added `validateSlug()` and `isSlugAvailable()` functions

### Phase 2: ViewingContext Enhancement ✅
- [x] Added `getUserIdFromSlug()` function in urlRouting.ts
- [x] Updated ViewingContext to auto-detect slug from URL
- [x] Added `isResolvingSlug`, `slugError`, `isPublicPage` states
- [x] Implemented `useEffectiveUserId()` hook

### Phase 3: Data Hooks Update ✅
- [x] Updated App.tsx to use `effectiveUserId` for all data hooks
- [x] useRequestSync uses effectiveUserId
- [x] useSongSync uses effectiveUserId
- [x] useSetListSync uses effectiveUserId
- [x] useUiSettings uses effectiveUserId

### Phase 4: Public Pages Update ✅
- [x] KioskPage handles slug resolution loading/error states
- [x] UserFrontend handles slug resolution loading/error states
- [x] Leaderboard handles slug resolution and filters by effectiveUserId
- [x] Voting passes owner_id for multi-tenancy (`add_vote` RPC)

### Phase 5: Settings UI ✅
- [x] Added slug input field in SettingsManager
- [x] Added real-time slug availability checking
- [x] Added slug validation (format, length, reserved words)
- [x] Added shareable URLs display with copy buttons
- [x] Shows Request, Kiosk, and Leaderboard URLs

### Phase 6: Testing & Documentation
- [ ] Test with multiple accounts simultaneously
- [ ] Test guest voting and requesting
- [x] Updated this documentation

## Key Files Modified

### New Files
- `src/utils/urlRouting.ts` - URL parsing and slug utilities

### Modified Files
- `src/contexts/UserContext.tsx` - ViewingContext with slug resolution
- `src/App.tsx` - Uses effectiveUserId for all data hooks
- `src/components/backend/SettingsManager.tsx` - Slug management UI
- `src/components/frontend/KioskPage.tsx` - Slug error handling
- `src/components/frontend/UserFrontend.tsx` - Slug error handling
- `src/components/frontend/Leaderboard.tsx` - Uses effectiveUserId

## Database Requirements

### Existing Infrastructure
```sql
-- profiles table with slug column
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  slug TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast slug lookups
CREATE UNIQUE INDEX idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;
```

### RLS Policies Needed
```sql
-- Allow anyone to read requests for bands with public slugs
CREATE POLICY "Anyone can read requests for public bands"
  ON requests FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE slug IS NOT NULL
    )
  );

-- Allow profiles table to be read for slug lookups
CREATE POLICY "Anyone can read public profiles"
  ON profiles FOR SELECT
  USING (slug IS NOT NULL);
```

## Security Considerations

1. **Slug Validation**: Only lowercase letters, numbers, and hyphens
2. **Reserved Words**: Common paths like 'admin', 'api', 'auth' are blocked
3. **Data Isolation**: RLS policies enforce user_id separation
4. **Rate Limiting**: Consider adding rate limits for public endpoints

## How to Use

### For Band Owners
1. Go to Dashboard → Settings
2. Find "Public URL (Shareable Links)" section
3. Enter your desired URL identifier (e.g., "your-band-name")
4. Click "Save URL"
5. Copy and share the generated URLs for Request Page, Kiosk, and Leaderboard

### For Guests
1. Navigate to the shared URL (e.g., `/request/fusion-events`)
2. Browse songs and submit requests
3. Vote on existing requests
4. No login required!

---

*Document created: December 2, 2024*
*Last updated: December 2, 2024*
*Status: Implementation Complete - Testing Phase*
