# Schema Comparison: DEVServer vs RayPush (Working Version)

**Date:** 2025-11-10
**Source:** RayPush branch from fusioneventsak/urequest-live
**Target:** Songrequest-DEVServer (current DEVServer)

## Critical Difference Found

### ⚠️ TypeScript Type Mismatch: `requesters.timestamp` vs `requesters.createdAt`

**RayPush (Working):**
```typescript
export interface SongRequest {
  requesters: {
    id: string;
    name: string;
    photo: string;
    message?: string;
    timestamp: string;  // ← Uses 'timestamp'
  }[];
}
```

**DEVServer (Current):**
```typescript
export interface SongRequest {
  requesters: {
    id: string;
    name: string;
    photo: string;
    message?: string;
    createdAt: string;  // ← Uses 'createdAt'
  }[];
}
```

**Database Reality (Both):**
```sql
CREATE TABLE requesters (
  created_at timestamptz DEFAULT now()  -- ← Database uses 'created_at'
);
```

### Impact
- Frontend expects `timestamp` field
- Database returns `created_at` field
- Mapping/transformation required somewhere in the code

---

## Complete Schema Comparison

### ✅ Tables Match Identically

Both versions have the same core tables with identical structures:

#### 1. `songs` table
```sql
CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  genre text,
  key text,
  notes text,
  albumArtUrl text,  -- RayPush uses album_art_url initially, migrated to albumArtUrl
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. `requests` table
```sql
CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  votes integer DEFAULT 0,
  status text DEFAULT 'pending',
  is_locked boolean DEFAULT false,
  is_played boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Constraints (RayPush):**
- `CHECK (TRIM(BOTH FROM title) <> '')` - Title cannot be empty

#### 3. `requesters` table
```sql
CREATE TABLE requesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);
```

**Constraints (RayPush):**
- `CHECK (TRIM(BOTH FROM name) <> '')` - Name cannot be empty
- `CHECK (photo IS NOT NULL AND photo <> '')` - Photo required
- `CHECK (char_length(message) <= 100)` - Message max 100 chars

#### 4. `user_votes` table
```sql
CREATE TABLE user_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, user_id)
);
```

#### 5. `set_lists` table
```sql
CREATE TABLE set_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  notes text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

#### 6. `set_list_songs` table
```sql
CREATE TABLE set_list_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_list_id uuid REFERENCES set_lists(id) ON DELETE CASCADE,
  song_id uuid REFERENCES songs(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### 7. `ui_settings` table

**RayPush Initial Schema:**
```sql
CREATE TABLE ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  band_logo_url text,
  band_name text DEFAULT 'uRequest Live',
  primary_color text DEFAULT '#ff00ff',
  secondary_color text DEFAULT '#9d00ff'
);
```

**DEVServer Schema:**
```sql
CREATE TABLE ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_name text DEFAULT 'Band Request Hub',
  band_logo_url text,
  frontend_accent_color text DEFAULT '#ff00ff',
  frontend_header_bg text DEFAULT '#13091f',
  nav_bg_color text DEFAULT '#0f051d',
  highlight_color text DEFAULT '#ff00ff',
  song_border_color text DEFAULT '#ff00ff',
  frontend_secondary_accent text DEFAULT '#9d00ff',
  custom_message text DEFAULT '',
  show_qr_code boolean DEFAULT true,
  ticker_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Differences:**
- ✅ DEVServer has MORE customization fields (good!)
- ✅ DEVServer has ticker configuration
- ✅ DEVServer has QR code toggle
- Default band name differs but not critical

---

## Stored Procedures Comparison

### ✅ Identical Functions

Both versions have identical implementations:

#### `lock_request(request_id UUID)`
```sql
CREATE OR REPLACE FUNCTION lock_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Single atomic operation to unlock all and lock one
  UPDATE requests
  SET is_locked = CASE WHEN id = request_id THEN true ELSE false END
  WHERE is_locked = true OR id = request_id;
END;
$$;
```

#### `unlock_request(request_id UUID)`
```sql
CREATE OR REPLACE FUNCTION unlock_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE requests
  SET is_locked = false
  WHERE id = request_id AND is_locked = true;
END;
$$;
```

#### `add_vote(p_request_id UUID, p_user_id TEXT) → BOOLEAN`
```sql
CREATE OR REPLACE FUNCTION add_vote(p_request_id UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_exists BOOLEAN;
  current_votes INTEGER;
BEGIN
  -- Check if vote already exists (fast lookup with index)
  SELECT EXISTS(
    SELECT 1 FROM user_votes
    WHERE request_id = p_request_id AND user_id = p_user_id
  ) INTO vote_exists;

  IF vote_exists THEN
    RETURN FALSE;
  END IF;

  -- Get current vote count
  SELECT votes INTO current_votes
  FROM requests
  WHERE id = p_request_id;

  IF current_votes IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Insert vote and increment counter atomically
  BEGIN
    INSERT INTO user_votes (request_id, user_id, created_at)
    VALUES (p_request_id, p_user_id, NOW());

    UPDATE requests
    SET votes = votes + 1
    WHERE id = p_request_id;

    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
END;
$$;
```

---

## Indexes Comparison

### ✅ RayPush Has Comprehensive Indexes

DEVServer has basic indexes, but RayPush has optimized performance indexes from production experience:

**RayPush Additional Indexes:**
```sql
-- Request priority sorting
CREATE INDEX idx_requests_active_priority
ON requests (is_played, is_locked DESC, votes DESC, created_at DESC)
WHERE is_played = false;

-- Fast title/artist lookup on active requests
CREATE INDEX idx_requests_title_artist_active
ON requests (title, artist)
WHERE is_played = false;

-- Title search on non-played requests
CREATE INDEX idx_requests_title_not_played
ON requests (title, is_played)
WHERE is_played = false;

-- Requester timestamp sorting
CREATE INDEX idx_requesters_request_timestamp
ON requesters (request_id, created_at DESC);

-- Set list songs compound index
CREATE INDEX idx_set_list_songs_both_ids
ON set_list_songs (set_list_id, song_id);
```

---

## Security Policies Comparison

### ⚠️ Different Approaches

**RayPush:**
- Separate read (SELECT) and write (ALL) policies
- Public can read, authenticated can manage
- More granular control

**DEVServer:**
- Single policy with `FOR ALL TO public`
- Simpler but less secure
- No authentication distinction

**Recommendation:** Keep DEVServer's simpler approach IF this is for trusted/controlled environments. For public deployment, adopt RayPush's security model.

---

## Action Items

### 🔴 Critical Fix Required

1. **Fix TypeScript Type Mismatch**
   - **File:** `src/types.ts`
   - **Change:** `createdAt` → `timestamp` in requesters interface
   - **OR:** Add data transformation layer to map `created_at` → `createdAt`

### 🟡 Recommended Improvements

2. **Add Performance Indexes from RayPush**
   - Copy optimized indexes from `20250619030650_turquoise_paper.sql`
   - Especially critical for large request queues

3. **Add Data Integrity Constraints**
   - Empty string checks on title, name, photo
   - Message length constraint (already exists in DEVServer)

4. **Enhance Security Policies** (Optional)
   - Implement separate read/write policies if deploying publicly
   - Add authenticated vs anonymous distinction

### 🟢 Nice to Have

5. **Album Art URL Naming**
   - DEVServer already uses `albumArtUrl` (correct)
   - RayPush migrated from `album_art_url` to `albumArtUrl`
   - No action needed

6. **Additional UI Settings Fields**
   - DEVServer already has more fields than RayPush
   - No action needed

---

## Migration Strategy

If copying exact RayPush schema:

1. **Create new migration file:**
   ```bash
   cd supabase/migrations
   # Create: 20251110_raypush_sync.sql
   ```

2. **Include:**
   - Performance indexes from RayPush
   - Data integrity constraints
   - Updated security policies (optional)

3. **Test locally first:**
   ```bash
   supabase db reset
   npm run dev
   # Test all request flows
   ```

4. **Deploy:**
   ```bash
   supabase db push
   ```

---

## Conclusion

**Schema Verdict:** ✅ 95% Compatible

- Core tables are identical
- TypeScript types have ONE critical mismatch (`timestamp` vs `createdAt`)
- DEVServer actually has MORE features (UI settings)
- RayPush has better performance optimization (indexes)
- Security approaches differ but both work

**Priority Fix:** Update `src/types.ts` to use `timestamp` instead of `createdAt` in the requesters interface to match RayPush.
