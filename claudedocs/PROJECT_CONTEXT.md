# uRequest Live - Project Context

**Last Updated:** 2025-11-10
**Project Path:** `C:\Users\arthu\claude-workspace\github repos\Songrequest-DEVServer`
**Current Branch:** main
**Development Server:** Vite (running on http://localhost:5175)

## Project Overview

**uRequest Live** is a real-time song request and queue management system for live music performances. The application enables audience members to request songs, vote on requests, and interact with the band in real-time through a modern, responsive web interface.

### Key Features
- **Live Song Requests**: Audience can request songs with photos and messages
- **Real-time Voting**: Upvote/downvote system for request prioritization
- **Queue Management**: Admin interface for managing, locking, and playing requests
- **Set List Management**: Create and manage performance set lists
- **Song Library**: Comprehensive song database with iTunes integration
- **Custom Branding**: Band logo upload and color customization
- **Kiosk Mode**: Dedicated interface for on-site request kiosks
- **QR Code Generation**: Easy access links for audience members
- **Ticker Messages**: Scrolling announcements on frontend

## Technology Stack

### Frontend
- **React 18.2** with TypeScript
- **Vite 5.0** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first styling
- **Lucide React** - Icon library
- **React Hot Toast** - Notification system
- **QRCode.react** - QR code generation

### Backend/Database
- **Supabase** (PostgreSQL + Realtime)
- **@supabase/supabase-js 2.38.0**
- Row Level Security (RLS) enabled
- Real-time subscriptions for live updates

### Utilities
- **date-fns** - Date manipulation
- **uuid** - Unique identifier generation
- **CompressorJS** - Image compression
- **lz-string** - Data compression
- **p-limit** - Concurrency control
- **exponential-backoff** - Retry logic

## Project Structure

```
Songrequest-DEVServer/
├── src/
│   ├── components/
│   │   ├── shared/          # Reusable UI components
│   │   │   ├── AlbumArtDisplay.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Logo.tsx
│   │   ├── App.tsx          # Legacy root component
│   │   ├── BackendLogin.tsx # Admin authentication
│   │   ├── BackendTabs.tsx  # Admin navigation
│   │   ├── ColorCustomizer.tsx
│   │   ├── ConnectionStatus.tsx
│   │   ├── HeaderWrapper.tsx
│   │   ├── KioskPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LogoManager.tsx
│   │   ├── QueueView.tsx    # Admin queue interface
│   │   ├── RequestForm.tsx
│   │   ├── RequestList.tsx
│   │   ├── RequestModal.tsx
│   │   ├── SetListManager.tsx
│   │   ├── SettingsManager.tsx
│   │   ├── SongEditorModal.tsx
│   │   ├── SongLibrary.tsx
│   │   ├── SongList.tsx
│   │   ├── Ticker.tsx
│   │   ├── TickerManager.tsx
│   │   ├── UpvoteList.tsx
│   │   └── UserFrontend.tsx
│   ├── hooks/
│   │   ├── useConnectionHealth.ts
│   │   ├── useLogoHandling.ts
│   │   ├── usePhotoStorage.ts
│   │   ├── useQueueManager.ts
│   │   ├── useRealtimeConnection.ts
│   │   ├── useRealtimeSubscription.ts
│   │   ├── useRequestSync.ts
│   │   ├── useRequestSyncWithHeartbeat.ts
│   │   ├── useScrollBehavior.ts
│   │   ├── useSetListSync.ts
│   │   ├── useSongSync.ts
│   │   ├── useStickyHeader.ts
│   │   ├── useSupabaseRealtime.ts
│   │   └── useUiSettings.ts
│   ├── utils/
│   │   ├── cache.ts
│   │   ├── circuitBreaker.ts
│   │   ├── imageUtils.ts
│   │   ├── itunes.ts
│   │   ├── photoStorage.ts
│   │   ├── queueManager.ts
│   │   ├── rateLimiter.ts
│   │   ├── realtimeManager.ts
│   │   ├── requestQueue.ts
│   │   ├── requestValidation.ts
│   │   ├── supabase.ts
│   │   ├── uploadLogo.ts
│   │   └── urlUtils.ts
│   ├── App.tsx              # Current root component
│   ├── main.tsx             # Application entry point
│   ├── types.ts             # TypeScript type definitions
│   └── vite-env.d.ts
├── supabase/
│   ├── functions/           # Edge functions
│   └── migrations/          # Database migrations
│       ├── 20250619142351_empty_shrine.sql     # Initial schema
│       ├── 20250619142538_light_smoke.sql      # Realtime logs
│       ├── 20250619190908_quiet_stream.sql
│       └── 20250619191144_delicate_reef.sql
├── public/                  # Static assets
├── claudedocs/              # Claude-specific documentation
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Database Schema

### Core Tables

#### `songs`
- Song library with metadata
- Fields: id, title, artist, genre, key, notes, albumArtUrl
- Indexes on title/artist for search
- Auto-updated timestamps

#### `requests`
- Active song requests from audience
- Fields: id, title, artist, votes, is_locked, is_played
- Indexes for priority sorting (votes DESC, created_at)
- Atomic lock/unlock operations via stored procedures

#### `requesters`
- Multiple requesters per song (co-requesters)
- Links: request_id → requests(id) CASCADE
- Fields: name, photo (base64), message (max 100 chars)
- Constraint: message_length_check

#### `user_votes`
- Vote tracking per user per request
- Unique constraint: (request_id, user_id)
- Prevents duplicate voting
- Atomic vote operations via `add_vote()` function

#### `set_lists`
- Performance set lists
- Fields: name, date, notes, is_active
- Only one active set list at a time (trigger enforced)

#### `set_list_songs`
- Songs within set lists
- Links: set_list_id → set_lists(id), song_id → songs(id)
- Position field for ordering

#### `ui_settings`
- Band branding and customization
- Fields: band_name, band_logo_url, color scheme
- Frontend/backend color customization
- Ticker configuration

#### `realtime_connection_logs`
- Connection health monitoring
- Fields: status, client_id, error_message
- Indexed on client_id and created_at

### Stored Procedures

#### `lock_request(request_id UUID)`
- Atomically locks a request (unlocking all others first)
- Used for "Now Playing" feature

#### `unlock_request(request_id UUID)`
- Unlocks a specific request

#### `add_vote(p_request_id UUID, p_user_id TEXT) → BOOLEAN`
- Atomically adds vote and increments counter
- Returns FALSE if already voted
- Handles race conditions

#### `handle_set_list_activation()`
- Trigger function ensuring only one active set list

## Current State & Modifications

### Modified Files (Uncommitted)
- `src/App.tsx` - Main application logic
- `src/components/QueueView.tsx` - Queue management interface
- `src/hooks/useRequestSync.ts` - Request synchronization
- `src/hooks/useSetListSync.ts` - Set list synchronization
- `src/types.ts` - TypeScript definitions

### Known Issues
1. **Duplicate Import**: `src/App.tsx` line 1-2 has duplicate useState imports
   - Line 1: `import React, { useState, useEffect, useCallback } from 'react';`
   - Line 2: `import { useState, useEffect, useCallback, useRef, useMemo } from 'react';`
   - **Fix Required**: Remove duplicate imports

2. **Browserslist Warning**: `caniuse-lite` outdated
   - Run: `npx update-browserslist-db@latest`

3. **File Artifact**: `nul` file in root directory
   - Should be removed

### Active Development Servers
- Port 5173: (killed)
- Port 5174: (killed)
- Port 5175: **ACTIVE** (http://localhost:5175)

## Key Application Flows

### Request Creation Flow
1. User accesses frontend (landing page or kiosk)
2. Takes photo (webcam or upload)
3. Fills request form (song title, artist, message)
4. Photo compressed (max 250KB)
5. Request inserted into `requests` table
6. Requester added to `requesters` table
7. Real-time update broadcasts to all clients

### Voting Flow
1. User clicks upvote/downvote
2. `add_vote()` stored procedure called
3. Checks for existing vote (user_id, request_id)
4. Atomically inserts vote + increments/decrements counter
5. Real-time update triggers re-sort of queue

### Queue Management Flow
1. Admin views QueueView component
2. Real-time subscription to `requests` table
3. Displays pending/approved requests sorted by votes
4. Lock/unlock requests for "Now Playing"
5. Mark as played to remove from active queue

### Set List Management Flow
1. Admin creates set list
2. Adds songs from song library
3. Activates set list (deactivates others via trigger)
4. Songs displayed on frontend in order

## Real-time Architecture

### Supabase Realtime Channels
- **requests**: Live request updates
- **requesters**: Co-requester additions
- **songs**: Song library changes
- **set_lists**: Set list modifications
- **ui_settings**: Branding/color updates

### Connection Management
- Circuit breaker pattern for failed connections
- Exponential backoff retry logic
- Connection health monitoring
- Heartbeat checks
- Automatic reconnection

### Sync Strategies
- **Optimistic Updates**: Immediate UI feedback
- **Background Sync**: Periodic full sync
- **Conflict Resolution**: Last-write-wins with timestamp
- **Rate Limiting**: Prevents flooding during connection issues

## Development Workflow

### Starting Development
```bash
cd "C:\Users\arthu\claude-workspace\github repos\Songrequest-DEVServer"
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Linting
```bash
npm run lint
```

## Authentication

### Admin Access
- Simple password authentication
- No user management (single admin)
- Session stored in localStorage
- Backend path: `/backend`
- Kiosk path: `/kiosk`

## Environment Variables

Required `.env` file (not in repo):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Next Steps / TODO

1. **Fix Duplicate Imports**: Remove duplicate React imports in App.tsx
2. **Update Dependencies**: Run browserslist update
3. **Clean Workspace**: Remove `nul` file
4. **Session Management**: Consider implementing proper session handling
5. **Error Handling**: Enhance error boundaries throughout app
6. **Testing**: Add unit tests for critical paths
7. **Documentation**: Add JSDoc comments to complex functions

## Important Notes

### Performance Considerations
- Image compression crucial for database storage
- Real-time subscriptions have connection limits
- Queue sorting happens client-side (consider server-side pagination for large queues)
- Album art fetching from iTunes throttled

### Security Considerations
- RLS policies allow public access (intentional for user frontend)
- Admin auth is basic (suitable for trusted environments)
- Photo data stored as base64 in database (consider Supabase Storage migration)
- Message length constraint prevents spam

### Scalability Considerations
- Current architecture supports ~100 concurrent users
- Real-time subscriptions scale with Supabase plan
- Consider caching strategies for high-traffic events
- Monitor connection logs for health metrics

---

**For questions or issues, refer to this document first. Update as project evolves.**
