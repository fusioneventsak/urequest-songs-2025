import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { cacheService } from '../utils/cache';
import { RealtimeManager } from '../utils/realtimeManager';
import type { SetList } from '../types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

interface UseSetListSyncProps {
  setLists: SetList[];
  setSetLists: (setLists: SetList[]) => void;
  isOnline: boolean;
  userId?: string | null;
}

export function useSetListSync({
  setLists,
  setSetLists,
  isOnline,
  userId
}: UseSetListSyncProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to avoid circular dependencies
  const mountedRef = useRef(true);
  const setListsSubscriptionRef = useRef<string | null>(null);
  const setListSongsSubscriptionRef = useRef<string | null>(null);
  const setListActivationSubscriptionRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchInProgressRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(userId || null);
  const setSetListsRef = useRef(setSetLists);
  const initializedRef = useRef(false);

  // Keep setSetLists ref up to date
  setSetListsRef.current = setSetLists;

  // Generate user-specific cache key
  const getCacheKey = useCallback((uid: string | null) => {
    return uid ? `set_lists:user:${uid}` : 'set_lists:all';
  }, []);

  // Stable fetch function using refs
  const fetchSetLists = useCallback(async (bypassCache = false) => {
    if (fetchInProgressRef.current) {
      return;
    }

    // Debounce frequent calls
    const now = Date.now();
    if (!bypassCache && now - lastFetchTimeRef.current < 300) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSetLists(bypassCache);
      }, 300);
      return;
    }

    lastFetchTimeRef.current = now;
    fetchInProgressRef.current = true;

    try {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setError(null);

      const effectiveUserId = currentUserIdRef.current;
      const cacheKey = getCacheKey(effectiveUserId);

      // Check cache first unless bypassing
      if (!bypassCache) {
        const cachedSetLists = cacheService.get<SetList[]>(cacheKey);
        if (cachedSetLists?.length > 0) {
          if (mountedRef.current) {
            setSetListsRef.current(cachedSetLists);
            setIsLoading(false);
          }
          fetchInProgressRef.current = false;
          return;
        }
      }

      if (!effectiveUserId) {
        const emptyResult: SetList[] = [];
        if (mountedRef.current) {
          setSetListsRef.current(emptyResult);
          cacheService.set(cacheKey, emptyResult, 60000);
        }
        fetchInProgressRef.current = false;
        return;
      }

      // Fetch set lists filtered by user_id for multi-tenancy
      const { data: setListsData, error: setListsError } = await supabase
        .from('set_lists')
        .select(`
          id,
          name,
          date,
          notes,
          is_active,
          user_id,
          created_at,
          set_list_songs (
            id,
            position,
            songs (
              id,
              title,
              artist,
              genre,
              key,
              notes,
              "albumArtUrl",
              user_id
            )
          )
        `)
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (setListsError) throw setListsError;

      if (setListsData && mountedRef.current) {
        const formattedSetLists = setListsData.map(setList => ({
          id: setList.id,
          name: setList.name,
          date: setList.date,
          isActive: setList.is_active || false,
          notes: setList.notes || '',
          user_id: setList.user_id,
          createdAt: setList.created_at || '',
          songs: (setList.set_list_songs || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((sls: any) => {
              const song = sls.songs;
              return {
                ...song,
                albumArtUrl: song.albumArtUrl || null,
                position: sls.position,
                setListSongId: sls.id
              };
            })
        }));

        cacheService.set(cacheKey, formattedSetLists, 300000);
        setSetListsRef.current(formattedSetLists);
        setRetryCount(0);
      }
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));

        const cacheKey = getCacheKey(currentUserIdRef.current);
        const cachedSetLists = cacheService.get<SetList[]>(cacheKey);
        if (cachedSetLists) {
          setSetListsRef.current(cachedSetLists);
        }

        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(prev => prev + 1);
              fetchSetLists(true);
            }
          }, delay);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, [getCacheKey, retryCount]);

  // Setup subscriptions - stable function
  const setupSubscriptions = useCallback(() => {
    // Clean up existing subscriptions
    if (setListsSubscriptionRef.current) {
      RealtimeManager.removeSubscription(setListsSubscriptionRef.current);
      setListsSubscriptionRef.current = null;
    }
    if (setListSongsSubscriptionRef.current) {
      RealtimeManager.removeSubscription(setListSongsSubscriptionRef.current);
      setListSongsSubscriptionRef.current = null;
    }
    if (setListActivationSubscriptionRef.current) {
      RealtimeManager.removeSubscription(setListActivationSubscriptionRef.current);
      setListActivationSubscriptionRef.current = null;
    }

    const effectiveUserId = currentUserIdRef.current;
    if (!effectiveUserId) return;

    try {
      const channelPrefix = `user_${effectiveUserId}`;

      // Subscribe to set_lists table
      const setListsSub = RealtimeManager.createSubscription(
        `${channelPrefix}_set_lists`,
        (payload) => {
          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          if (eventUserId && eventUserId !== currentUserIdRef.current) {
            return;
          }
          fetchSetLists(true);
        },
        'set_lists'
      );

      // Subscribe to set_list_songs table
      const setListSongsSub = RealtimeManager.createSubscription(
        `${channelPrefix}_set_list_songs`,
        (payload) => {
          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          if (eventUserId && eventUserId !== currentUserIdRef.current) {
            return;
          }
          fetchSetLists(true);
        },
        'set_list_songs'
      );

      // Subscribe to activation changes
      const setListActivationSub = RealtimeManager.createSubscription(
        `${channelPrefix}_set_lists_activation`,
        (payload) => {
          if (payload.eventType === 'UPDATE' &&
              payload.new && payload.old &&
              payload.new.is_active !== payload.old.is_active) {
            const eventUserId = payload.new?.user_id || payload.old?.user_id;
            if (eventUserId && eventUserId !== currentUserIdRef.current) {
              return;
            }
            const cacheKey = getCacheKey(currentUserIdRef.current);
            cacheService.del(cacheKey);
            fetchSetLists(true);
          }
        },
        'set_lists'
      );

      setListsSubscriptionRef.current = setListsSub;
      setListSongsSubscriptionRef.current = setListSongsSub;
      setListActivationSubscriptionRef.current = setListActivationSub;
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  }, [fetchSetLists, getCacheKey]);

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
      initializedRef.current = true;

      // Initialize RealtimeManager
      RealtimeManager.init();

      // Fetch data
      fetchSetLists(userIdChanged);

      // Setup subscriptions
      setupSubscriptions();
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (setListsSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListsSubscriptionRef.current);
        setListsSubscriptionRef.current = null;
      }
      if (setListSongsSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListSongsSubscriptionRef.current);
        setListSongsSubscriptionRef.current = null;
      }
      if (setListActivationSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListActivationSubscriptionRef.current);
        setListActivationSubscriptionRef.current = null;
      }
    };
  }, [userId, isOnline, fetchSetLists, setupSubscriptions]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to manually reconnect
  const reconnectSetLists = useCallback(() => {
    if (setListsSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListsSubscriptionRef.current);
      } catch (e) { /* ignore */ }
      setListsSubscriptionRef.current = null;
    }
    if (setListSongsSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListSongsSubscriptionRef.current);
      } catch (e) { /* ignore */ }
      setListSongsSubscriptionRef.current = null;
    }
    if (setListActivationSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListActivationSubscriptionRef.current);
      } catch (e) { /* ignore */ }
      setListActivationSubscriptionRef.current = null;
    }

    if (isOnline) {
      setupSubscriptions();
      fetchSetLists(true);
    }
  }, [isOnline, setupSubscriptions, fetchSetLists]);

  return {
    isLoading,
    error,
    refetch: () => fetchSetLists(true),
    reconnectSetLists
  };
}
