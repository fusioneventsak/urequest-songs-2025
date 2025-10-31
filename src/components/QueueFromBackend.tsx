import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Users, Lock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../utils/supabase';

interface RequesterRow {
  id?: string;
  name?: string;
  message?: string;
  photo?: string;
  created_at?: string;
}

interface RequestRow {
  id: string;
  title: string;
  artist?: string;
  votes?: number;
  is_locked?: boolean;
  is_played?: boolean;
  status?: string;
  created_at?: string;
  requesters?: RequesterRow[];
}

const EDGE_FN_URL = 'https://etnepmeyxrznwfzikyqp.supabase.co/functions/v1/get_latest_requests';

export function QueueFromBackend() {
  const [data, setData] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [playedCount, setPlayedCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const subRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'pending' | 'played' | 'all'>('pending');

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleLock = async (row: RequestRow) => {
    try {
      const newLocked = !row.is_locked;
      if (newLocked) {
        const { error: unlockAllErr } = await supabase
          .from('requests')
          .update({ is_locked: false })
          .eq('is_locked', true);
        if (unlockAllErr) throw unlockAllErr;

        const { error: lockErr } = await supabase
          .from('requests')
          .update({ is_locked: true })
          .eq('id', row.id);
        if (lockErr) throw lockErr;
      } else {
        const { error } = await supabase
          .from('requests')
          .update({ is_locked: false })
          .eq('id', row.id);
        if (error) throw error;
      }
      toast.success(newLocked ? 'Request locked as next song' : 'Request unlocked');
    } catch (e: any) {
      console.error('Toggle lock failed', e);
      toast.error('Failed to update lock.');
    }
  };

  const handleMarkPlayed = async (row: RequestRow) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ is_played: true, is_locked: false, status: 'played' })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Request marked as played');
    } catch (e: any) {
      console.error('Mark played failed', e);
      toast.error('Failed to mark as played.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchQueue = async () => {
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

        const statusParam = mode === 'pending' ? 'pending' : mode === 'played' ? 'played' : '';
        const url = `${EDGE_FN_URL}?limit=100&includeRequesters=true${statusParam ? `&status=${statusParam}` : ''}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`HTTP ${res.status}: ${body}`);
        }
        const json = await res.json();
        const rows: RequestRow[] = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
        if (!cancelled) {
          setData(rows);
        }

        // Also fetch counts for all tabs (but don't let this block the main data)
        Promise.all([
          fetch(`${EDGE_FN_URL}?limit=100&status=pending`, { headers }),
          fetch(`${EDGE_FN_URL}?limit=100&status=played`, { headers }),
          fetch(`${EDGE_FN_URL}?limit=100`, { headers })
        ]).then(async ([pendingRes, playedRes, allRes]) => {
          const [pendingData, playedData, allData] = await Promise.all([
            pendingRes.json(),
            playedRes.json(),
            allRes.json()
          ]);

          if (!cancelled) {
            setPendingCount(Array.isArray(pendingData.data) ? pendingData.data.length : 0);
            setPlayedCount(Array.isArray(playedData.data) ? playedData.data.length : 0);
            setAllCount(Array.isArray(allData.data) ? allData.data.length : 0);
          }
        }).catch(countError => {
          console.warn('Failed to fetch counts:', countError);
          // Don't fail the whole operation if counts fail
        }).finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load request queue');
          setLoading(false);
        }
      }
    };

    fetchQueue();

    // Always start a gentle polling fallback (every 10s)
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      if (!cancelled) fetchQueue();
    }, 10000);

    if (subRef.current) {
      subRef.current.unsubscribe();
    }

    // Try realtime subscription; if it errors, we still have polling
    subRef.current = supabase
      .channel('backend_queue_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchQueue(), 500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requesters' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchQueue(), 500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_votes' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchQueue(), 500);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime connected; keep polling as a safety net (low frequency)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Realtime failed; polling fallback already active
        }
      });

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (subRef.current) subRef.current.unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [mode]);

  if (loading) {
    return (
      <div className="glass-effect rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start items-start gap-3">
          <div className="text-sm uppercase tracking-wider text-neon-pink font-semibold">Backend Queue Snapshot</div>
          <div className="flex gap-1 bg-neon-purple/10 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setMode('pending')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                mode === 'pending' 
                  ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30 animate-pulse' 
                  : 'text-gray-400 bg-gray-700/30 cursor-not-allowed'
              }`}
              disabled={true}
            >
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pend</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-600/30 text-gray-400">
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setMode('played')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                mode === 'played' 
                  ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30 animate-pulse' 
                  : 'text-gray-400 bg-gray-700/30 cursor-not-allowed'
              }`}
              disabled={true}
            >
              <span className="hidden sm:inline">Played</span>
              <span className="sm:hidden">Play</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-600/30 text-gray-400">
                {playedCount}
              </span>
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                mode === 'all' 
                  ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30 animate-pulse' 
                  : 'text-gray-400 bg-gray-700/30 cursor-not-allowed'
              }`}
              disabled={true}
            >
              All
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-600/30 text-gray-400">
                {allCount}
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-300">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neon-pink"></div>
            <span className="text-sm">Loading request queue...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-effect rounded-lg p-4 text-sm text-red-400">
        Failed to load request queue: {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="glass-effect rounded-lg p-4 text-sm text-gray-300">
        {mode === 'pending' && 'No pending requests in the backend queue.'}
        {mode === 'played' && 'No played requests found.'}
        {mode === 'all' && 'No requests found.'}
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start items-start gap-3">
        <div className="text-sm uppercase tracking-wider text-neon-pink font-semibold animate-pulse">Backend Queue Snapshot</div>
        <div className="flex gap-1 bg-neon-purple/20 rounded-lg p-1 shadow-lg shadow-neon-purple/10">
          <button
            onClick={() => setMode('pending')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
              mode === 'pending' 
                ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
            }`}
          >
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">Pend</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              mode === 'pending' 
                ? 'bg-white/30 text-white ring-1 ring-white/50' 
                : 'bg-neon-purple/30 text-gray-300'
            }`}>
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setMode('played')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
              mode === 'played' 
                ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
            }`}
          >
            <span className="hidden sm:inline">Played</span>
            <span className="sm:hidden">Play</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              mode === 'played' 
                ? 'bg-white/30 text-white ring-1 ring-white/50' 
                : 'bg-neon-purple/30 text-gray-300'
            }`}>
              {playedCount}
            </span>
          </button>
          <button
            onClick={() => setMode('all')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
              mode === 'all' 
                ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
            }`}
          >
            All
            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              mode === 'all' 
                ? 'bg-white/30 text-white ring-1 ring-white/50' 
                : 'bg-neon-purple/30 text-gray-300'
            }`}>
              {allCount}
            </span>
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        {data.map((row) => {
          const requesterCount = Array.isArray(row.requesters) ? row.requesters.length : 0;
          return (
            <div key={row.id} className="bg-neon-purple/10 rounded p-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{decodeURIComponentSafe(row.title)}</div>
                  {row.artist && <div className="text-gray-300 text-xs truncate">{row.artist}</div>}
                  <div className="flex items-center gap-3 text-gray-400 text-xs mt-0.5">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{Math.max(requesterCount, 1)}</span>
                    <span>Votes: {row.votes ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 whitespace-nowrap">
                  <div className="text-right text-xs text-gray-400">
                    {row.created_at ? new Date(row.created_at).toLocaleTimeString() : ''}
                  </div>
                  <button
                    onClick={() => handleToggleLock(row)}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center ${
                      row.is_locked 
                        ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30' 
                        : 'bg-gray-700/50 text-gray-300 hover:bg-neon-pink/30 hover:text-white'
                    }`}
                    title={row.is_locked ? 'Unlock' : 'Lock as Next Song'}
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                  {/* Only show "Mark as Played" button for pending requests */}
                  {(!row.is_played && row.status !== 'played') && (
                    <button
                      onClick={() => handleMarkPlayed(row)}
                      className="p-2 rounded-lg transition-all duration-200 flex items-center bg-green-600 text-white hover:bg-green-700 shadow-lg"
                      style={{
                        boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
                      }}
                      title="Mark as Played"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Show "Played" indicator for played requests */}
                  {(row.is_played || row.status === 'played') && (
                    <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 flex items-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {requesterCount > 0 && (
                    <button
                      onClick={() => toggle(row.id)}
                      className="p-2 text-gray-300 hover:text-white hover:bg-neon-purple/20 rounded-lg transition-all duration-200"
                      title={expanded.has(row.id) ? 'Hide requesters' : 'Show requesters'}
                    >
                      {expanded.has(row.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {expanded.has(row.id) && requesterCount > 0 && (
                <div className="mt-2 space-y-1">
                  {row.requesters!.map((rq, idx) => (
                    <div key={`${row.id}-rq-${idx}`} className="flex items-start justify-between bg-neon-purple/20 rounded p-2">
                      <div className="text-sm text-white truncate">
                        <span className="font-medium">{rq.name || 'Anonymous'}</span>
                        {rq.message && <span className="text-gray-300 ml-2">“{rq.message}”</span>}
                      </div>
                      <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {rq.created_at ? new Date(rq.created_at).toLocaleTimeString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}
