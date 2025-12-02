import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { SongRequest } from '../types';

const CACHE_DURATION = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

interface CachedData {
  data: SongRequest[];
  timestamp: number;
}

interface UseRequestSyncProps {
  requests: SongRequest[];
  setRequests: (requests: SongRequest[]) => void;
  isOnline: boolean;
  currentUser: any;
  userId?: string | null; // Optional user ID for multi-tenant filtering
}

export function useRequestSync({
  requests,
  setRequests,
  isOnline,
  currentUser,
  userId
}: UseRequestSyncProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to avoid circular dependencies
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<any | null>(null);
  const fetchInProgressRef = useRef<boolean>(false);
  const cacheRef = useRef<CachedData | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentUserIdRef = useRef<string | null>(userId || null);
  const setRequestsRef = useRef(setRequests);
  const initializedRef = useRef(false);

  // Keep setRequests ref up to date
  setRequestsRef.current = setRequests;

  // Stable fetch function using refs to avoid dependency issues
  const fetchRequests = useCallback(async (bypassCache = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Get effective user ID from ref (updated by effect)
    const effectiveUserId = currentUserIdRef.current;

    // Check cache if not bypassing
    if (!bypassCache && cacheRef.current) {
      const { data, timestamp } = cacheRef.current;
      if (data) {
        const age = Date.now() - timestamp;
        if (age < CACHE_DURATION && data.length > 0) {
          if (mountedRef.current) {
            setRequestsRef.current(data);
            setIsLoading(false);
          }
          return;
        }
      }
    }

    fetchInProgressRef.current = true;

    try {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setError(null);

      if (!effectiveUserId) {
        const emptyResult: SongRequest[] = [];
        if (mountedRef.current) {
          setRequestsRef.current(emptyResult);
          cacheRef.current = { data: emptyResult, timestamp: Date.now() };
        }
        return;
      }

      // Fetch requests filtered by user_id for multi-tenancy
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          requesters (
            id,
            name,
            photo,
            message,
            source,
            created_at
          )
        `)
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData) {
        const emptyResult: SongRequest[] = [];
        if (mountedRef.current) {
          setRequestsRef.current(emptyResult);
          cacheRef.current = { data: emptyResult, timestamp: Date.now() };
        }
        return;
      }

      console.log('📡 [useRequestSync] Fetched', requestsData.length, 'requests from database');

      // Transform to SongRequest format
      const transformedRequests: SongRequest[] = requestsData.map(request => ({
        id: request.id,
        title: request.title,
        artist: request.artist || '',
        albumArtUrl: request.album_art_url || undefined,
        user_id: request.user_id,
        requesters: (request.requesters || []).map((requester: any) => ({
          id: requester.id,
          name: requester.name || 'Anonymous',
          photo: requester.photo || '',
          message: requester.message || '',
          source: requester.source,
          timestamp: requester.created_at
        })),
        votes: request.votes || 0,
        status: request.status as any,
        isLocked: request.is_locked || false,
        isPlayed: request.is_played || false,
        createdAt: new Date(request.created_at)
      }));

      if (mountedRef.current) {
        const playedCount = transformedRequests.filter(r => r.isPlayed).length;
        const activeCount = transformedRequests.filter(r => !r.isPlayed).length;
        console.log('📡 [useRequestSync] Setting requests - Active:', activeCount, 'Played:', playedCount);

        setRequestsRef.current(transformedRequests);
        cacheRef.current = { data: transformedRequests, timestamp: Date.now() };
        lastUpdateRef.current = Date.now();
        setRetryCount(0);
      }
    } catch (error) {
      const cachedRequests = cacheRef.current?.data;
      if (cachedRequests) {
        setRequestsRef.current(cachedRequests);
      }
      if (mountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));
        setIsLoading(false);
      }
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []); // No dependencies - uses refs

  // Setup subscription - stable function, no dependencies on fetch
  const setupSubscription = useCallback(() => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // Ignore cleanup errors
      }
      subscriptionRef.current = null;
    }

    const effectiveUserId = currentUserIdRef.current;
    if (!effectiveUserId) {
      console.log('📡 [useRequestSync] No userId, skipping subscription setup');
      return;
    }

    // Create unique channel name for user isolation
    // Include route info for debugging
    const route = window.location.pathname;
    const channelName = `requests_user_${effectiveUserId}_${Date.now()}`;
    console.log(`📡 [useRequestSync] Setting up subscription on ${route} - channel: ${channelName}`);

    let debounceTimer: NodeJS.Timeout | null = null;

    // Subscribe to requests changes
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          const currentRoute = window.location.pathname;
          console.log(`📡 [useRequestSync:${currentRoute}] Received requests change event:`, payload.eventType, payload.new?.id || payload.old?.id);

          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          if (eventUserId && eventUserId !== currentUserIdRef.current) {
            console.log(`📡 [useRequestSync:${currentRoute}] Ignoring event for different user:`, eventUserId, 'vs', currentUserIdRef.current);
            return;
          }

          // Immediate fetch for played/locked status changes, debounce for other changes
          const isStatusChange = payload.eventType === 'UPDATE' &&
            (payload.new?.is_played !== payload.old?.is_played ||
             payload.new?.is_locked !== payload.old?.is_locked);

          if (debounceTimer) clearTimeout(debounceTimer);

          if (isStatusChange) {
            // Immediate fetch for status changes (mark as played, lock/unlock)
            console.log(`📡 [useRequestSync:${currentRoute}] Status change detected (is_played: ${payload.old?.is_played} → ${payload.new?.is_played}), fetching immediately`);
            fetchRequests(true);
          } else {
            // Debounce other changes
            debounceTimer = setTimeout(() => {
              fetchRequests(true);
            }, 300);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requesters' },
        (payload) => {
          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          if (eventUserId && eventUserId !== currentUserIdRef.current) {
            return;
          }

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchRequests(true);
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_votes' },
        (payload) => {
          const eventOwnerId = payload.new?.owner_id || payload.old?.owner_id;
          if (eventOwnerId && eventOwnerId !== currentUserIdRef.current) {
            return;
          }

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchRequests(true);
          }, 200);
        }
      )
      .subscribe((status, err) => {
        const currentRoute = window.location.pathname;
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [useRequestSync:${currentRoute}] Successfully subscribed to channel ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [useRequestSync:${currentRoute}] Channel error on ${channelName}:`, err);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ [useRequestSync:${currentRoute}] Subscription timed out for ${channelName}`);
        } else if (status === 'CLOSED') {
          console.log(`🔒 [useRequestSync:${currentRoute}] Channel ${channelName} closed`);
        } else {
          console.log(`📡 [useRequestSync:${currentRoute}] Subscription status: ${status}`);
        }
      });

    subscriptionRef.current = subscription;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchRequests]);

  // SINGLE consolidated effect for initialization and userId changes
  useEffect(() => {
    // Update the ref
    const previousUserId = currentUserIdRef.current;
    currentUserIdRef.current = userId || null;

    if (!isOnline) return;

    // Only fetch/subscribe if userId changed or first initialization
    const userIdChanged = previousUserId !== currentUserIdRef.current;
    const needsInit = !initializedRef.current;

    if (userIdChanged || needsInit) {
      // Clear cache on user change
      if (userIdChanged) {
        cacheRef.current = null;
      }

      initializedRef.current = true;

      // Fetch data
      fetchRequests(userIdChanged);

      // Setup subscription
      setupSubscription();
    }

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
        } catch (e) {
          // Ignore cleanup errors
        }
        subscriptionRef.current = null;
      }
    };
  }, [userId, isOnline, fetchRequests, setupSubscription]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to manually reconnect and refresh data
  const reconnectRequests = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // Ignore
      }
      subscriptionRef.current = null;
    }

    if (isOnline) {
      setupSubscription();
      fetchRequests(true);
    }
  }, [isOnline, setupSubscription, fetchRequests]);

  // Manual refresh function
  const refresh = useCallback(() => {
    cacheRef.current = null;
    fetchRequests(true);
  }, [fetchRequests]);

  return {
    isLoading,
    error,
    refresh,
    reconnectRequests
  };
}
