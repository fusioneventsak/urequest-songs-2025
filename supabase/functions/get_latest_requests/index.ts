import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// Supabase client using service role for Edge Function
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const includeRequesters = url.searchParams.get('includeRequesters') === 'true'
    const onlyUnplayed = url.searchParams.get('onlyUnplayed') === 'true'
    const statusParam = url.searchParams.get('status') // e.g. 'pending'

    const limit = Math.max(1, Math.min(100, Number(limitParam ?? '1') || 1))

    // Build base query
    let query = supabase
      .from('requests')
      .select(
        includeRequesters
          ? `*, requesters ( id, name, created_at )`
          : `*`,
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (onlyUnplayed) {
      // @ts-ignore - filtering column present in DB
      query = query.eq('is_played', false)
    }

    if (statusParam === 'pending') {
      // Filter for pending requests (not played and status is pending)
      query = query.eq('is_played', false).eq('status', 'pending')
    } else if (statusParam === 'played') {
      // Filter for played requests (either is_played is true OR status is played)
      query = query.or('is_played.eq.true,status.eq.played')
    }

    const { data, error } = await query

    if (error) throw error

    // If limit=1, return a single object for convenience
    const payload = limit === 1 ? (data?.[0] ?? null) : data

    return new Response(JSON.stringify({ data: payload }), { headers })
  } catch (error) {
    console.error('get_latest_requests error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers },
    )
  }
})
