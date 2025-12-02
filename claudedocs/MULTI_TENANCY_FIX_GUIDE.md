# Multi-Tenancy Fix Guide

## Root Cause Analysis

**Problem**: Songs not loading for authenticated users
**Root Cause**: The `user_id` column in the `songs` table contains NULL values

### Evidence from Console Logs:
```
🎵 useSongSync: Fetching songs for userId: 6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9
🎵 useSongSync: Got 0 songs for user
```

### Why This Happens:
The RLS policy checks:
```sql
USING (auth.uid() = user_id)
```

When `user_id` is NULL:
```sql
'6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' = NULL  -- Always FALSE (NULL comparison)
```

This means songs with NULL `user_id` are invisible to ALL authenticated users.

---

## Solution: Run the Complete Fix Migration

### Step 1: Open Supabase SQL Editor
Navigate to: https://supabase.com/dashboard/project/yxhwuljemflgentlsntd/sql/new

### Step 2: Copy the Migration Script
The complete script is at:
```
supabase/migrations/20251202_COMPLETE_FIX_multi_tenancy.sql
```

### Step 3: Paste and Run
1. Paste the entire script into the SQL Editor
2. Click "Run" (or press Ctrl+Enter)
3. Wait for all phases to complete

### Step 4: Verify Output
You should see:
- BEFORE: Songs with NULL user_id: X (some number > 0)
- AFTER: Songs by user_id showing counts for both accounts
- RLS policies on songs showing 4 policies created

### Step 5: Refresh the App
- Go to http://localhost:5176
- Log out and log back in
- Songs should now appear

---

## What the Migration Does

### Phase 1: Diagnostic
Shows current database state

### Phase 2: Schema
Ensures `user_id` columns exist on all tables

### Phase 3: Data Assignment
- Assigns all NULL user_id records to `urequestlive@gmail.com`
- This is the default user for existing data

### Phase 4: Backup Restore
- If `songs_duplicates_backup` table exists
- Restores songs for `info@fusion-events.ca`

### Phase 5: RLS Policies
Creates proper RLS policies with:
- `TO authenticated` for owner operations
- `TO anon, authenticated` for public read access

### Phase 6: Trigger Update
Makes duplicate check trigger user-aware

### Phase 7: Verification
Shows final state and confirms success

---

## User Account Mapping

| Email | UUID | Expected Songs |
|-------|------|----------------|
| info@fusion-events.ca | 6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9 | From backup (~172) |
| urequestlive@gmail.com | 7254d394-9e8a-4701-a39b-7ee56e517213 | Existing (119) |

---

## Troubleshooting

### Songs still not loading after migration?

1. Check browser console for errors
2. Verify you're authenticated (see auth logs)
3. Run this diagnostic query in SQL Editor:
```sql
SELECT user_id, COUNT(*) as count
FROM songs
GROUP BY user_id;
```

### RLS blocking access?
Check RLS policies:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'songs';
```

### Profile errors?
Profile fetching is disabled. The app works without profiles.

---

## Files Modified

- `src/hooks/useSongSync.ts` - User-filtered queries
- `src/hooks/useSetListSync.ts` - User-filtered queries
- `src/hooks/useRequestSync.ts` - User-filtered queries
- `src/contexts/UserContext.tsx` - Profile fetch disabled
- `src/App.tsx` - Profile fetch disabled

## Files Created

- `supabase/migrations/20251202_COMPLETE_FIX_multi_tenancy.sql`
- `supabase/migrations/20251202_DIAGNOSTIC_check_database_state.sql`
- `claudedocs/MULTI_TENANCY_FIX_GUIDE.md`

---

## Expected Behavior After Fix

1. **Login as urequestlive@gmail.com**
   - See 119 songs
   - See existing setlists
   - Cannot see info@fusion-events.ca's songs

2. **Login as info@fusion-events.ca**
   - See ~172 songs (from backup)
   - Have empty setlists (new account)
   - Cannot see urequestlive@gmail.com's songs

3. **Create new songs**
   - Automatically assigned to logged-in user
   - Isolated from other users

4. **Public request page**
   - Still works with user_id parameter
   - Shows only that user's active setlist songs
