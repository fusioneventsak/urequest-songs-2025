import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ThumbsUp, Lock, CheckCircle2, ChevronDown, ChevronUp, Users, UserCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useUiSettings } from '../hooks/useUiSettings';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { SongRequest } from '../types';

interface RequesterRow {
  id?: string;
  name?: string;
  message?: string;
  photo?: string;
  created_at?: string;
}

interface BackendRequestRow {
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

interface QueueViewProps {
  requests: SongRequest[];
  onLockRequest: (id: string) => void;
  onMarkPlayed: (id: string) => void;
  onResetQueue?: () => void;
  queueFilter?: 'pending' | 'played' | 'all';
  onQueueFilterChange?: (filter: 'pending' | 'played' | 'all') => void;
}

const decodeTitle = (title: string) => {
  try {
    return decodeURIComponent(title);
  } catch (e) {
    return title;
  }
};

export function QueueView({ requests, onLockRequest, onMarkPlayed, onResetQueue, queueFilter = 'pending', onQueueFilterChange }: QueueViewProps) {
  const [lockingStates, setLockingStates] = useState<Set<string>>(new Set());
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [isResetting, setIsResetting] = useState(false);
  const [optimisticLocks, setOptimisticLocks] = useState<Set<string>>(new Set());
  
  // Backend queue state
  const [backendData, setBackendData] = useState<BackendRequestRow[]>([]);
  const [backendLoading, setBackendLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [playedCount, setPlayedCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [backendExpanded, setBackendExpanded] = useState<Set<string>>(new Set());
  const [backendMode, setBackendMode] = useState<'pending' | 'played' | 'all'>('pending');
  
  // Track if component is mounted
  const mountedRef = useRef(true);
  const backendSubRef = useRef<any>(null);
  const backendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backendPollRef = useRef<number | null>(null);
  
  // Backend queue functionality
  const toggleBackendExpanded = (id: string) => {
    setBackendExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBackendToggleLock = async (row: BackendRequestRow) => {
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

  const handleBackendMarkPlayed = async (row: BackendRequestRow) => {
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

  const fetchBackendQueue = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (anonKey) {
        headers['Authorization'] = `Bearer ${anonKey}`;
        headers['apikey'] = anonKey;
      }

      const statusParam = backendMode === 'pending' ? 'pending' : backendMode === 'played' ? 'played' : '';
      const url = `${EDGE_FN_URL}?limit=100&includeRequesters=true${statusParam ? `&status=${statusParam}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const json = await res.json();
      const rows: BackendRequestRow[] = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
      if (mountedRef.current) {
        setBackendData(rows);
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

        if (mountedRef.current) {
          setPendingCount(Array.isArray(pendingData.data) ? pendingData.data.length : 0);
          setPlayedCount(Array.isArray(playedData.data) ? playedData.data.length : 0);
          setAllCount(Array.isArray(allData.data) ? allData.data.length : 0);
        }
      }).catch(countError => {
        console.warn('Failed to fetch counts:', countError);
      }).finally(() => {
        if (mountedRef.current) {
          setBackendLoading(false);
        }
      });
    } catch (e: any) {
      if (mountedRef.current) {
        setBackendError(e?.message || 'Failed to load request queue');
        setBackendLoading(false);
      }
    }
  };

  // Backend queue effect
  useEffect(() => {
    fetchBackendQueue();

    if (backendSubRef.current) {
      backendSubRef.current.unsubscribe();
    }

    // Ensure a gentle polling fallback every 10s
    if (backendPollRef.current) window.clearInterval(backendPollRef.current);
    backendPollRef.current = window.setInterval(() => {
      if (mountedRef.current) fetchBackendQueue();
    }, 10000);

    backendSubRef.current = supabase
      .channel('backend_queue_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
          backendDebounceRef.current = setTimeout(() => fetchBackendQueue(), 500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requesters' },
        () => {
          if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
          backendDebounceRef.current = setTimeout(() => fetchBackendQueue(), 500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_votes' },
        () => {
          if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
          backendDebounceRef.current = setTimeout(() => fetchBackendQueue(), 500);
        }
      )
      .subscribe((status) => {
        // If realtime fails, polling keeps things fresh
        if (status === 'SUBSCRIBED') {
          // Keep polling as a low-frequency safety net
        }
      });

    return () => {
      if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
      if (backendSubRef.current) backendSubRef.current.unsubscribe();
      if (backendPollRef.current) window.clearInterval(backendPollRef.current);
    };
  }, [backendMode]);
  const handleResetQueue = async () => {
    if (!onResetQueue) return;
    
    if (window.confirm('Are you sure you want to clear all pending requests and votes? This will also reset any rate limits.')) {
      setIsResetting(true);
      try {
        await onResetQueue();
      } finally {
        setIsResetting(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Debug log when requests change
  useEffect(() => {
    console.log('🔄 QueueView requests updated:', requests.length, requests.map(r => r.id));
  }, [requests]);
  
  // Clear optimistic locks when real data arrives
  useEffect(() => {
    // Get the current locked request from the server data
    const serverLockedIds = new Set(requests.filter(r => r.isLocked).map(r => r.id));
    const optimisticLockedIds = new Set(optimisticLocks);
    
    // If server state matches optimistic state, clear optimistic state
    const needsClear = Array.from(optimisticLockedIds).every(id => serverLockedIds.has(id)) &&
                      serverLockedIds.size <= 1; // Should only have 0 or 1 locked request
    
    if (needsClear && optimisticLocks.size > 0) {
      console.log('✅ Clearing optimistic locks - server state matches');
      setOptimisticLocks(new Set());
    }
  }, [requests, optimisticLocks]);
  
  const { settings } = useUiSettings();
  const accentColor = settings?.frontend_accent_color || '#ff00ff';
  
  // Auto-expand requests based on UI settings
  useEffect(() => {
    if (settings?.default_expanded_requesters) {
      const pendingIds = requests
        .filter(r => !r.isPlayed)
        .map(r => r.id);
      setExpandedRequests(new Set(pendingIds));
    }
  }, [requests, settings?.default_expanded_requesters]);

  // Log incoming requests for debugging
  useEffect(() => {
    console.log('QueueView - Received requests:', requests.map(r => ({
      id: r.id,
      title: r.title,
      requesters: r.requesters?.map(rq => ({
        name: rq.name,
        message: rq.message,
        timestamp: rq.timestamp
      }))
    })));
  }, [requests]);

  // Filter requests based on the current filter
  const filteredRequests = useMemo(() => {
    switch (queueFilter) {
      case 'pending':
        return requests.filter(r => !r.isPlayed && r.status !== 'played');
      case 'played':
        return requests.filter(r => r.isPlayed || r.status === 'played');
      case 'all':
      default:
        return requests;
    }
  }, [requests, queueFilter]);

  // Deduplicate requests by song title and combine requesters
  const deduplicatedRequests = useMemo(() => {
    console.log('Deduplicating requests...');
    const requestMap = new Map<string, SongRequest>();

    filteredRequests
      .forEach(request => {
        const key = `${request.title.toLowerCase()}|${(request.artist || '').toLowerCase()}`;
        
        console.log(`Processing request: ${request.title}`, {
          id: request.id,
          hasRequesters: Array.isArray(request.requesters),
          requestersCount: request.requesters?.length || 0,
          firstRequester: request.requesters && request.requesters.length > 0 ? 
            { name: request.requesters[0].name, hasMessage: !!request.requesters[0].message } : null
        });
        
        if (requestMap.has(key)) {
          const existing = requestMap.get(key)!;
          
          // Combine requesters, ensuring we don't have duplicates by name
          let updateRequesters = existing.requesters ? [...existing.requesters] : [];
          
          if (Array.isArray(request.requesters) && request.requesters.length > 0) {
            const existingNames = new Set(updateRequesters.map(r => r.name));
            request.requesters.forEach(requester => {
              if (!existingNames.has(requester.name)) {
                updateRequesters.push(requester);
              } else {
                // If there's a duplicate name but this one has a message, add it anyway
                if (requester.message) {
                  updateRequesters.push(requester);
                }
              }
            });
          }
          
          requestMap.set(key, {
            ...existing,
            requesters: updateRequesters,
            votes: (existing.votes || 0) + (request.votes || 0),
            isLocked: existing.isLocked || request.isLocked
          });

          console.log(`Updated existing request: ${existing.title}`, {
            requestersCount: updateRequesters.length
          });
        } else {
          // Make sure requesters is a defined array
          const requesters = Array.isArray(request.requesters) ? request.requesters : [];
          
          requestMap.set(key, {
            ...request,
            requesters: requesters,
            votes: request.votes || 0
          });

          console.log(`Added new request: ${request.title}`, {
            requestersCount: requesters.length
          });
        }
      });

    const result = Array.from(requestMap.values());
    console.log('Deduplication complete. Results:', result.map(r => ({
      title: r.title,
      requestersCount: r.requesters?.length || 0,
      allHaveMessages: r.requesters?.every(req => !!req.message)
    })));
    
    return result;
  }, [filteredRequests]);

  // Sort deduplicated requests
  const sortedRequests = useMemo(() => {
    // Apply optimistic locks to the requests
    const requestsWithOptimisticLocks = deduplicatedRequests.map(request => ({
      ...request,
      // Use optimistic state if available, otherwise use database state
      isLocked: optimisticLocks.has(request.id) ? true : 
                optimisticLocks.size > 0 ? false : 
                request.isLocked
    }));
    
    return requestsWithOptimisticLocks.sort((a, b) => {
      // Locked requests always go first
      if (a.isLocked) return -1;
      if (b.isLocked) return 1;

      // Calculate priority based on requester count AND votes
      const priorityA = (a.requesters?.length || 0) + (a.votes || 0);
      const priorityB = (b.requesters?.length || 0) + (b.votes || 0);

      // First compare priority (requester count + upvotes)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // If priority is the same, then compare requester count
      const requestersA = a.requesters?.length || 0;
      const requestersB = b.requesters?.length || 0;
      
      if (requestersA !== requestersB) {
        return requestersB - requestersA;
      }
      
      // If requester counts are also the same, sort by timestamp (most recent first)
      const latestA = Math.max(...(a.requesters?.length ? a.requesters.map(r => new Date(r.timestamp).getTime()) : [new Date(a.createdAt).getTime()]));
      const latestB = Math.max(...(b.requesters?.length ? b.requesters.map(r => new Date(r.timestamp).getTime()) : [new Date(b.createdAt).getTime()]));
      return latestB - latestA;
    });
  }, [deduplicatedRequests, optimisticLocks]);

  const handleFilterChange = (filter: 'pending' | 'played' | 'all') => {
    if (onQueueFilterChange) {
      onQueueFilterChange(filter);
    }
  };

  const handleLockRequest = useCallback(async (id: string) => {
    if (!mountedRef.current) return;
    
    setLockingStates(prev => new Set([...prev, id]));
    
    // Get the current request
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    // Toggle the locked status
    const newLockedState = !request.isLocked;
    
    // INSTANT OPTIMISTIC UPDATE - update UI immediately
    setOptimisticLocks(prev => {
      const newSet = new Set();
      if (newLockedState) {
        newSet.add(id); // Only this request is locked
      }
      return newSet;
    });
    
    try {
      // Use the atomic database function for better performance
      if (newLockedState) {
        // Lock this request (and unlock all others)
        const { error } = await supabase.rpc('lock_request', { request_id: id });
        if (error) throw error;
      } else {
        // Just unlock this request
        const { error } = await supabase.rpc('unlock_request', { request_id: id });
        if (error) throw error;
      }
      
      console.log('✅ Lock status updated in database');
      
      // Show success toast
      toast.success(newLockedState ? 'Request locked as next song' : 'Request unlocked');
    } catch (error) {
      console.error('❌ Error updating lock status:', error);
      
      // REVERT optimistic update on error
      setOptimisticLocks(new Set());

      // Show error toast
      if (typeof toast !== 'undefined') {
        toast.error('Failed to update request. Please try again.');
      } else {
        alert('Failed to update request. Please try again.');
      }
    } finally {
      setTimeout(() => {
        setLockingStates(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 300);
    }
  }, [requests, mountedRef]);
  
  // Toggle expanded/collapsed state for a request
  const toggleRequestExpanded = (id: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start items-start gap-3">
        <h2 className="text-xl font-semibold neon-text animate-pulse">Request Queue</h2>
        <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 w-full sm:w-auto">
          {onResetQueue && (
            <button
              onClick={handleResetQueue}
              disabled={isResetting}
              className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors ${
                isResetting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isResetting ? 'Clearing...' : 'Clear Queue'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-1">
        {sortedRequests.map((request) => {
          const isLocking = lockingStates.has(request.id);
          const isOptimisticallyLocked = optimisticLocks.has(request.id);
          const isActuallyLocked = request.isLocked && !optimisticLocks.size;
          const displayLocked = isOptimisticallyLocked || isActuallyLocked;
          
          // Check if requesters is a valid, populated array
          const hasRequesters = Array.isArray(request.requesters) && request.requesters.length > 0;
          // Get actual requester count, ensuring it's at least 1
          const requesterCount = Math.max(hasRequesters ? request.requesters.length : 0, 1);
          // Calculate priority as sum of requesters and votes
          const priority = requesterCount + (request.votes || 0);
          // Check if this request is currently expanded
          const isExpanded = expandedRequests.has(request.id);
          
          return (
            <div
              key={request.id}
              className={`glass-effect rounded-lg p-4 transition-all duration-300 ${
                displayLocked ? 'request-locked' : ''
              }`}
              style={{
                ...(displayLocked && {
                  borderColor: accentColor,
                  borderWidth: '2px',
                  animation: 'glow 2s ease-in-out infinite',
                  boxShadow: `0 0 20px ${accentColor}50`,
                })
              }}
            >
              <div className="flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-white truncate">
                      {decodeTitle(request.title)}
                    </h3>
                    {request.artist && (
                      <p className="text-gray-300 text-sm truncate">{request.artist}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-0.5">
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>{requesterCount}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{request.votes || 0}</span>
                      </div>
                      <div className="text-xs text-neon-pink">
                        Priority: {priority}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleLockRequest(request.id)}
                      disabled={isLocking}
                     className={`p-2 rounded-lg transition-all duration-200 flex items-center ${
                        displayLocked
                         ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30'
                         : 'bg-gray-700/50 text-gray-300 hover:bg-neon-pink/30 hover:text-white'
                     } ${isLocking ? 'animate-pulse' : ''}`}
                      title={displayLocked ? 'Unlock' : 'Lock as Next Song'}
                      style={displayLocked ? {
                       animation: 'pulse 2s ease-in-out infinite'
                      } : undefined}
                    >
                     <Lock className={`w-5 h-5 ${isLocking ? 'animate-spin' : ''}`} />
                      {isOptimisticallyLocked && !isActuallyLocked && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                      )}
                    </button>
                    {/* Only show "Mark as Played" button for pending requests */}
                    {!request.isPlayed && request.status !== 'played' && (
                      <button
                        onClick={() => onMarkPlayed(request.id)}
                        className="p-2 rounded-lg transition-all duration-200 flex items-center bg-green-600 text-white hover:bg-green-700 shadow-lg"
                        style={{
                          boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
                        }}
                        title="Mark as Played"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    {/* Show "Played" indicator for played requests */}
                    {(request.isPlayed || request.status === 'played') && (
                      <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 flex items-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Show requesters preview when collapsed */}
                {hasRequesters && !isExpanded && (
                  <div className="mt-2 flex items-center space-x-1 overflow-hidden">
                    <div className="flex -space-x-2">
                      {request.requesters.slice(0, 3).map((requester, idx) => (
                        <div key={`preview-${request.id}-${idx}`} className="relative">
                          <img 
                            src={requester.photo || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E"} 
                            alt={requester.name} 
                            className="w-7 h-7 rounded-full border"
                            style={{ borderColor: accentColor }}
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {request.requesters.length > 3 && (
                      <div className="bg-neon-purple/20 rounded-full w-7 h-7 flex items-center justify-center text-xs text-white">
                        +{request.requesters.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Show full requester list when expanded */}
                {hasRequesters && isExpanded && (
                  <div className="mt-2 space-y-2 transition-all duration-300 overflow-hidden">
                    {request.requesters.map((requester, index) => (
                      <div
                        key={`${request.id}-requester-${index}-${requester.id}`}
                        className="flex items-center space-x-2 bg-neon-purple/10 rounded-lg p-2.5"
                      >
                        <div className="flex-shrink-0">
                          {requester.photo ? (
                            <img
                              src={requester.photo}
                              alt={requester.name || "Requester"}
                              className="w-8 h-8 rounded-full border-2"
                              style={{ borderColor: accentColor }}
                              title={requester.name || "Requester"}
                              onError={(e) => {
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
                                e.currentTarget.className = "w-8 h-8 rounded-full bg-gray-700 p-0.5 text-white";
                              }}
                            />
                          ) : (
                            <UserCircle className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span className="font-medium text-white text-sm truncate">
                              {requester.name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {requester.timestamp ? format(new Date(requester.timestamp), 'h:mm a') : 'Unknown time'}
                            </span>
                          </div>
                          {requester.message && (
                            <p className="text-xs text-gray-300 italic mt-1 bg-neon-purple/5 p-1.5 rounded">
                              "{requester.message}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )} 

                {/* Show message if no requesters */}
                {!hasRequesters && (
                  <div className="mt-2 px-1 py-2 text-center text-gray-400 text-xs bg-neon-purple/5 rounded-md">
                    This request is in the queue but detailed requester information isn't available.
                  </div>
                )}
                
                {/* Dropdown button at the bottom center */}
                {hasRequesters && (
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => toggleRequestExpanded(request.id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-neon-purple/20 rounded-full transition-colors"
                      title={isExpanded ? "Hide requesters" : "Show requesters"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Backend Queue Section */}
      <div className="glass-effect rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start items-start gap-3">
          <div className="text-sm uppercase tracking-wider text-neon-pink font-semibold animate-pulse">Backend Queue Snapshot</div>
          <div className="flex gap-1 bg-neon-purple/20 rounded-lg p-1 shadow-lg shadow-neon-purple/10">
            <button
              onClick={() => setBackendMode('pending')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
                backendMode === 'pending' 
                  ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                  : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
              }`}
            >
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pend</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                backendMode === 'pending' 
                  ? 'bg-white/30 text-white ring-1 ring-white/50' 
                  : 'bg-neon-purple/30 text-gray-300'
              }`}>
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setBackendMode('played')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
                backendMode === 'played' 
                  ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                  : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
              }`}
            >
              <span className="hidden sm:inline">Played</span>
              <span className="sm:hidden">Play</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                backendMode === 'played' 
                  ? 'bg-white/30 text-white ring-1 ring-white/50' 
                  : 'bg-neon-purple/30 text-gray-300'
              }`}>
                {playedCount}
              </span>
            </button>
            <button
              onClick={() => setBackendMode('all')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 ${
                backendMode === 'all' 
                  ? 'bg-gradient-to-r from-neon-pink to-pink-600 text-white shadow-xl shadow-neon-pink/50 ring-2 ring-neon-pink/50 animate-pulse' 
                  : 'text-gray-200 hover:text-white hover:bg-neon-purple/30 hover:shadow-md'
              }`}
            >
              All
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                backendMode === 'all' 
                  ? 'bg-white/30 text-white ring-1 ring-white/50' 
                  : 'bg-neon-purple/30 text-gray-300'
              }`}>
                {allCount}
              </span>
            </button>
          </div>
        </div>

        {backendLoading && (
          <div className="flex items-center justify-center py-8 text-gray-300">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neon-pink"></div>
              <span className="text-sm">Loading request queue...</span>
            </div>
          </div>
        )}

        {backendError && (
          <div className="glass-effect rounded-lg p-4 text-sm text-red-400">
            Failed to load request queue: {backendError}
          </div>
        )}

        {!backendLoading && !backendError && backendData.length === 0 && (
          <div className="glass-effect rounded-lg p-4 text-sm text-gray-300">
            {backendMode === 'pending' && 'No pending requests in the backend queue.'}
            {backendMode === 'played' && 'No played requests found.'}
            {backendMode === 'all' && 'No requests found.'}
          </div>
        )}

        {!backendLoading && !backendError && backendData.length > 0 && (
          <div className="grid gap-2">
            {backendData.map((row) => {
              const requesterCount = Array.isArray(row.requesters) ? row.requesters.length : 0;
              return (
                <div key={row.id} className="bg-neon-purple/10 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">
                        {row.title}
                      </div>
                      {row.artist && (
                        <div className="text-sm text-gray-300 truncate">
                          {row.artist}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{Math.max(requesterCount, 1)}</span>
                        <span>Votes: {row.votes ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 whitespace-nowrap">
                      <div className="text-right text-xs text-gray-400">
                        {row.created_at ? new Date(row.created_at).toLocaleTimeString() : ''}
                      </div>
                      <button
                        onClick={() => handleBackendToggleLock(row)}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center ${
                          row.is_locked 
                            ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/30' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-neon-pink/30 hover:text-white'
                        }`}
                        title={row.is_locked ? 'Unlock' : 'Lock as Next Song'}
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                      {(!row.is_played && row.status !== 'played') && (
                        <button
                          onClick={() => handleBackendMarkPlayed(row)}
                          className="p-2 rounded-lg transition-all duration-200 flex items-center bg-green-600 text-white hover:bg-green-700 shadow-lg"
                          style={{
                            boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
                          }}
                          title="Mark as Played"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {(row.is_played || row.status === 'played') && (
                        <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 flex items-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {requesterCount > 0 && (
                        <button
                          onClick={() => toggleBackendExpanded(row.id)}
                          className="p-2 text-gray-300 hover:text-white hover:bg-neon-purple/20 rounded-lg transition-all duration-200"
                          title={backendExpanded.has(row.id) ? 'Hide requesters' : 'Show requesters'}
                        >
                          {backendExpanded.has(row.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {backendExpanded.has(row.id) && requesterCount > 0 && (
                    <div className="mt-2 space-y-1">
                      {row.requesters!.map((rq, idx) => (
                        <div key={`${row.id}-rq-${idx}`} className="flex items-start justify-between bg-neon-purple/20 rounded p-2">
                          <div className="text-sm text-white truncate">
                            <span className="font-medium">{rq.name || 'Anonymous'}</span>
                            {rq.message && <span className="text-gray-300 ml-2">"{rq.message}"</span>}
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
        )}
      </div>

      <style jsx>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px ${accentColor}50;
          }
          50% {
            box-shadow: 0 0 30px ${accentColor}80;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        .shadow-glow {
          box-shadow: 0 0 15px ${accentColor}70;
        }
      `}</style>
    </div>
  );
}