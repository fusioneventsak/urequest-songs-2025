import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';

interface LatestRequester {
  id?: string;
  name?: string;
  message?: string;
  photo?: string;
  created_at?: string;
}

interface LatestRequestData {
  id: string;
  title: string;
  artist?: string;
  votes?: number;
  is_locked?: boolean;
  is_played?: boolean;
  created_at?: string;
  requesters?: LatestRequester[];
}

const EDGE_FN_URL = 'https://etnepmeyxrznwfzikyqp.supabase.co/functions/v1/get_latest_requests';

export function LatestRequest() {
  const [data, setData] = useState<LatestRequestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLatest = async () => {
      try {
        setLoading(true);
        setError(null);

        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (anonKey) {
          headers['Authorization'] = `Bearer ${anonKey}`;
          headers['apikey'] = anonKey;
        }

        const url = `${EDGE_FN_URL}?limit=1&includeRequesters=true`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`HTTP ${res.status}: ${body}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load latest request');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLatest();

    // Start polling fallback every 10s in case realtime cannot connect
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      if (!cancelled) fetchLatest();
    }, 10000);

    if (subRef.current) {
      subRef.current.unsubscribe();
    }

    // Try realtime subscription; polling remains as a safety net
    subRef.current = supabase
      .channel('latest_requests_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchLatest(), 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requesters' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchLatest(), 400);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_votes' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchLatest(), 400);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime connected; keep polling as low-frequency backup
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Realtime failed; polling fallback already running
        }
      });

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (subRef.current) subRef.current.unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-effect rounded-lg p-4 text-sm text-gray-300">
        Loading latest request...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-effect rounded-lg p-4 text-sm text-red-400">
        Failed to load latest request: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-effect rounded-lg p-4 text-sm text-gray-300">
        No recent unplayed requests.
      </div>
    );
  }

  const requesters = Array.isArray(data.requesters) ? data.requesters : [];

  return (
    <div className="glass-effect rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neon-pink mb-1">Latest Request</div>
          <div className="text-white font-semibold text-base">{decodeURIComponentSafe(data.title)}</div>
          {data.artist && (
            <div className="text-gray-300 text-sm">{data.artist}</div>
          )}
        </div>
        <div className="text-right text-sm text-gray-400">
          <div>Votes: {data.votes ?? 0}</div>
          {data.created_at && (
            <div>{new Date(data.created_at).toLocaleTimeString()}</div>
          )}
        </div>
      </div>

      {requesters.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs text-gray-400">Requesters</div>
          <div className="grid gap-1">
            {requesters.slice(0, 3).map((rq, idx) => (
              <div key={`${data.id}-rq-${idx}`} className="flex items-start justify-between bg-neon-purple/10 rounded p-2">
                <div className="text-sm text-white">
                  <span className="font-medium">{rq.name || 'Anonymous'}</span>
                  {rq.message && <span className="text-gray-300 ml-2">“{rq.message}”</span>}
                </div>
                <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                  {rq.created_at ? new Date(rq.created_at).toLocaleTimeString() : ''}
                </div>
              </div>
            ))}
            {requesters.length > 3 && (
              <div className="text-xs text-gray-400">+{requesters.length - 3} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}
