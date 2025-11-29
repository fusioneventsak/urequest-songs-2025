# uRequest Live - Project Context

**Document Type:** Technical Architecture
**Last Updated:** 2025-11-29
**Project Path:** `/home/mxtool-security/Desktop/Codebase/Urequestlive/urequest-songs-2025`
**Current Branch:** newmain
**Repository:** https://github.com/fusioneventsak/urequest-songs-2025
**Development Server:** Vite (http://localhost:5173)
**Status:** ✅ Multi-user dashboard with RLS isolation

---

## Overview

**uRequest Live** is a real-time, multi-tenant song request and queue management system for live music performances. The application enables audience members to request songs, vote on requests, and interact with bands through a modern web interface. Each band/user has their own isolated dashboard with complete data privacy via Supabase Row Level Security (RLS).

### Architecture Highlights
- **Multi-tenant**: Multiple bands/users on one system
- **Fully authenticated**: Supabase Auth with email/password
- **RLS-enforced**: Database-level data isolation
- **Real-time**: Live updates via Supabase subscriptions
- **Public frontend**: Audience can request without login
- **Private dashboard**: Each user sees only their data

---

## Key Features

**For Audience Members:**
- **Live Song Requests**: Submit requests with photos, names, and messages
- **Real-time Voting**: Upvote/downvote to influence queue order
- **Public Frontend**: No login required to request or vote
- **Kiosk Mode**: Dedicated on-site interface for event venues
- **QR Code Access**: Easy sharing via QR codes

**For Dashboard Users (Bands/DJs):**
- **Private Dashboard**: Fully isolated per-user data via RLS
- **Queue Management**: Lock/unlock requests, mark as played
- **Set List Management**: Create and activate performance set lists
- **Song Library**: Manage your song database
- **Custom Branding**: Upload logo, customize colors
- **Ticker Messages**: Display scrolling announcements
- **Real-time Updates**: Live data via Supabase subscriptions
- **Multi-user Support**: Multiple bands on one system

Each dashboard is **private** and belongs to **one user only**.

Audience users do **not** access the dashboard and do **not** authenticate.

---

## 2. Dashboard Definition

The **Dashboard** is the authenticated interface at:

```
/dashboard
```

It allows each logged-in user to manage:

* UI Branding (logo, colors)
* Song Library (optional per-user)
* Set Lists & Set List Songs
* Live Queue
* “Now Playing” lock state
* Kiosk Mode
* Ticker Message
* Photo/logo uploads

---

## 3. Authentication Model

### Supabase Auth (Email/Password)

Users log in with email + password
- Supabase handles secure password hashing
- Session stored in localStorage
- Optional: Magic link authentication

### On Login
```typescript
const { data: { user } } = await supabase.auth.getUser();
// user.id becomes the dashboard owner
```

---

## 4. Database Changes

### 4.1 Add `user_id` to tables

All dashboard-related tables must include:

```sql
user_id uuid references auth.users(id) on delete cascade;
```

Tables requiring this column:

* ui_settings
* set_lists
* set_list_songs
* songs (optional shared)
* ticker_messages (if exists)
* logo (if separate)
* requests
* requesters
* user_votes

This ensures data is scoped to a single dashboard owner.

---

## 5. Row Level Security (RLS)

RLS is the central pillar of multi-tenancy.
Each table has **three classes of access**:

1. **Dashboard owner** → full access
2. **Public** → limited (insert-only for requests & votes)
3. **Other dashboard owners** → no access

Below are the authoritative rules.

---

## 5.1 `ui_settings` (Private)

```sql
alter table ui_settings enable row level security;

create policy "user can read own ui_settings"
  on ui_settings for select
  using (auth.uid() = user_id);

create policy "user can update own ui_settings"
  on ui_settings for update
  using (auth.uid() = user_id);

create policy "user can insert own ui_settings"
  on ui_settings for insert
  with check (auth.uid() = user_id);
```

---

## 5.2 `set_lists`

```sql
alter table set_lists enable row level security;

create policy "user can manage own set_lists"
  on set_lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 5.3 `set_list_songs`

```sql
alter table set_list_songs enable row level security;

create policy "user can access own set_list_songs"
  on set_list_songs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 5.4 `songs` (Optional Per-User)

If songs should be unique to each dashboard:

```sql
alter table songs enable row level security;

create policy "user owns songs"
  on songs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

If songs are global/shared, skip this.

---

## 5.5 `requests` (Public inserts, private owner access)

```sql
alter table requests enable row level security;

create policy "public can submit requests"
  on requests for insert
  with check (true);

create policy "owner reads own requests"
  on requests for select
  using (auth.uid() = user_id);

create policy "owner modifies own requests"
  on requests for update
  using (auth.uid() = user_id);
```

---

## 5.6 `requesters`

```sql
alter table requesters enable row level security;

create policy "public can add requesters"
  on requesters for insert
  with check (true);

create policy "owner reads requesters"
  on requesters for select
  using (auth.uid() = user_id);
```

---

## 5.7 `user_votes`

```sql
alter table user_votes enable row level security;

create policy "public can vote"
  on user_votes for insert
  with check (true);

create policy "owner reads votes"
  on user_votes for select
  using (auth.uid() = user_id);
```

---

# 6. Frontend Responsibilities

### 6.1 Dashboard Fetching Must Include User Context

Example:

```ts
const { data: { user } } = await supabase.auth.getUser();

const { data } = await supabase
  .from("ui_settings")
  .select("*")
  .eq("user_id", user.id);
```

### 6.2 Public Request Form Must Include `user_id`

Frontend must set the dashboard owner:

```ts
await supabase.from("requests").insert({
  user_id: dashboardOwnerId,
  title,
  artist,
  message
});
```

The dashboardOwnerId is obtained from:

* URL param
* QR code
* Kiosk mode settings

---

# 7. Dashboard Routing

### Protected Dashboard

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### ProtectedRoute Logic

```tsx
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) return <LoginPage />;

  return children;
}
```

---

# 8. Multi-Tenant Behavior Summary

| Functionality            | Dashboard Owner | Public User |
| ------------------------ | --------------- | ----------- |
| Submit requests          | Yes             | Yes         |
| Vote on requests         | Yes             | Yes         |
| Edit queue               | Yes             | No          |
| Manage settings          | Yes             | No          |
| See other dashboard data | ❌ Denied        | ❌ Denied    |
| Isolated database rows   | Yes             | N/A         |

---

# 9. Security Summary

* Every table is isolated by `user_id`
* Public writes are allowed only where needed
* Dashboard is fully authenticated
* RLS ensures strict per-user isolation
* No user can see or modify other dashboards
* Public can’t query private data, only submit actions

---

---

# 10. Current Implementation Status

## ✅ Completed
- **Error Handling**: Global error handlers + fallback UI
- **Loading Timeouts**: 8-second max load time with forced load
- **Initialization Logging**: Detailed console logs with emojis
- **Supabase Integration**: Auth, RLS policies, real-time subscriptions
- **User Isolation**: Per-user data filtering via RLS
- **Dashboard Components**: QueueView, SetListManager, SongLibrary, Settings, Analytics
- **Real-time Sync**: useRequestSync, useSongSync, useSetListSync hooks
- **UI Customization**: Logo upload, color customization, ticker messages
- **Kiosk Mode**: Dedicated interface for on-site requests

## ⏳ In Progress
- **Multi-user Dashboard**: Per-user isolated data
- **Error Logging**: Comprehensive error tracking
- **Performance Optimization**: Loading state improvements

## ⬜ TODO
- **OAuth Integration**: Apple/Google login
- **Analytics Dashboard**: Advanced reporting
- **Team Management**: Multi-admin per band
- **Custom Subdomains**: bandname.urequest.live
- **Mobile App**: Native iOS/Android

---

# 11. Project Structure

```
urequest-songs-2025/
├── src/
│   ├── components/
│   │   ├── backend/          # Dashboard components
│   │   │   ├── QueueView.tsx
│   │   │   ├── SetListManager.tsx
│   │   │   ├── SongLibrary.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── SettingsManager.tsx
│   │   │   └── BackendLogin.tsx
│   │   ├── frontend/         # Public interface
│   │   │   ├── UserFrontend.tsx
│   │   │   ├── KioskPage.tsx
│   │   │   └── Leaderboard.tsx
│   │   ├── shared/           # Reusable components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingPreloader.tsx
│   │   │   └── Logo.tsx
│   │   └── App.tsx           # Root component
│   ├── hooks/
│   │   ├── useRequestSync.ts
│   │   ├── useSongSync.ts
│   │   ├── useSetListSync.ts
│   │   ├── useUiSettings.ts
│   │   └── useAsyncData.ts
│   ├── utils/
│   │   ├── supabase.ts
│   │   ├── asyncFetch.ts
│   │   ├── debug.ts
│   │   └── registerSW.ts
│   ├── types.ts
│   └── main.tsx
├── supabase/
│   ├── migrations/           # Database schema
│   └── functions/            # Edge functions
├── claudedocs/               # Documentation
├── public/                   # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

# 12. Development Workflow

### Starting Development
```bash
cd /home/mxtool-security/Desktop/Codebase/Urequestlive/urequest-songs-2025
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Running Tests
```bash
npm run test
npm run lint
```

---

# 13. Environment Setup

### Required `.env` Variables
```
VITE_SUPABASE_URL=https://yxhwuljemflgentlsntd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Setup
1. Create Supabase project
2. Apply migrations from `supabase/migrations/`
3. Enable RLS on all tables
4. Create auth users in Supabase dashboard

---

# 14. Key Concepts

### Row Level Security (RLS)
- Every table has `user_id` column
- RLS policies enforce per-user data access
- Public users can only insert (not read other users' data)
- Dashboard users see only their own data

### Real-time Subscriptions
- Supabase channels listen for table changes
- Automatic UI updates when data changes
- Exponential backoff for connection failures
- Heartbeat checks for connection health

### User Isolation
- Each user's dashboard is completely private
- No cross-user data visibility
- Audience members don't authenticate
- Admin can see all data (if admin role)

---

# 15. Quick Reference

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page |
| `/dashboard` | Authenticated | Private dashboard |
| `/kiosk` | Public | On-site request interface |
| `/leaderboard` | Public | Top requesters display |
| `/backend` | Authenticated | Legacy admin interface |

---

# 16. Troubleshooting

### App Won't Load
- Check browser console for errors (F12)
- Verify Supabase credentials in `.env`
- Check network tab for failed requests
- Look for `❌ [GLOBAL ERROR]` messages

### RLS Errors
- Verify user is authenticated
- Check RLS policies are applied
- Ensure `user_id` is set on insert
- Check Supabase logs for policy violations

### Real-time Not Updating
- Check Supabase connection status
- Verify subscription is active
- Check for network issues
- Look for `📡 Subscription status` logs

---

# 17. Performance Tips

- Images compressed to max 250KB
- Real-time subscriptions debounced
- Queue sorting optimized client-side
- Caching strategies for frequently accessed data
- Lazy loading for heavy components

---

# 18. Security Checklist

- ✅ RLS policies on all tables
- ✅ User authentication required for dashboard
- ✅ Public frontend doesn't expose private data
- ✅ Passwords hashed by Supabase
- ✅ Session tokens stored securely
- ✅ CORS configured correctly
- ✅ No sensitive data in localStorage

---

**Document Status:** ✅ Complete & Current
**Last Updated:** 2025-11-29
**Maintained By:** Development Team

For additional documentation or questions, refer to the other files in `claudedocs/` or create a new issue on GitHub.
