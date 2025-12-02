import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { cacheService } from '../utils/cache';
import { RealtimeManager } from '../utils/realtimeManager';
import type { Song } from '../types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

interface UseSongSyncProps {
  songs: Song[];
  setSongs: (songs: Song[]) => void;
  isOnline: boolean;
  userId?: string | null;
}

export function useSongSync({
  songs,
  setSongs,
  isOnline,
  userId
}: UseSongSyncProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to avoid circular dependencies
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchInProgressRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(userId || null);
  const setSongsRef = useRef(setSongs);
  const initializedRef = useRef(false);

  // Keep setSongs ref up to date
  setSongsRef.current = setSongs;

  // Generate user-specific cache key
  const getCacheKey = useCallback((uid: string | null) => {
    return uid ? `songs:user:${uid}` : 'songs:all';
  }, []);

  // Stable fetch function using refs
  const fetchSongs = useCallback(async (bypassCache = false) => {
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;

    try {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setError(null);

      const effectiveUserId = currentUserIdRef.current;
      const cacheKey = getCacheKey(effectiveUserId);

      // Check cache first unless bypassing
      if (!bypassCache) {
        const cachedSongs = cacheService.get<Song[]>(cacheKey);
        if (cachedSongs?.length > 0) {
          if (mountedRef.current) {
            setSongsRef.current(cachedSongs);
            setIsLoading(false);
          }
          fetchInProgressRef.current = false;
          return;
        }
      }

      if (!effectiveUserId) {
        console.log('🎵 useSongSync: No userId, returning empty array');
        const emptyResult: Song[] = [];
        if (mountedRef.current) {
          setSongsRef.current(emptyResult);
          cacheService.set(cacheKey, emptyResult, 60000);
        }
        fetchInProgressRef.current = false;
        return;
      }

      console.log('🎵 useSongSync: Fetching songs for userId:', effectiveUserId);

      // Fetch songs filtered by user_id for multi-tenancy
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          artist,
          genre,
          key,
          notes,
          "albumArtUrl",
          user_id,
          created_at,
          updated_at
        `)
        .eq('user_id', effectiveUserId)
        .order('title');

      if (songsError) throw songsError;

      if (songsData && mountedRef.current) {
        console.log('🎵 useSongSync: Got', songsData.length, 'songs for user');
        cacheService.set(cacheKey, songsData, 300000);
        setSongsRef.current(songsData);
        setRetryCount(0);
      }
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));

        const cacheKey = getCacheKey(currentUserIdRef.current);
        const cachedSongs = cacheService.get<Song[]>(cacheKey);
        if (cachedSongs) {
          setSongsRef.current(cachedSongs);
        }

        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(prev => prev + 1);
              fetchSongs(true);
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

  // Setup subscription - stable function
  const setupSubscription = useCallback(() => {
    // Remove existing subscription
    if (subscriptionRef.current) {
      RealtimeManager.removeSubscription(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const effectiveUserId = currentUserIdRef.current;
    if (!effectiveUserId) return;

    try {
      const channelName = `songs_user_${effectiveUserId}`;

      const subscription = RealtimeManager.createSubscription(
        channelName,
        (payload) => {
          const eventUserId = payload.new?.user_id || payload.old?.user_id;
          if (eventUserId && eventUserId !== currentUserIdRef.current) {
            return;
          }
          fetchSongs(true);
        },
        'songs'
      );

      subscriptionRef.current = subscription;
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  }, [fetchSongs]);

  // SINGLE consolidated effect for initialization and userId changes
  useEffect(() => {
    // Update the ref
    const previousUserId = currentUserIdRef.current;
    currentUserIdRef.current = userId || null;

    console.log('🎵 useSongSync effect:', {
      userId,
      previousUserId,
      isOnline,
      initialized: initializedRef.current
    });

    if (!isOnline) {
      console.log('🎵 useSongSync: Offline, skipping');
      return;
    }

    // Only fetch/subscribe if userId changed or first initialization
    const userIdChanged = previousUserId !== currentUserIdRef.current;
    const needsInit = !initializedRef.current;

    console.log('🎵 useSongSync:', { userIdChanged, needsInit });

    if (userIdChanged || needsInit) {
      initializedRef.current = true;

      // Initialize RealtimeManager
      RealtimeManager.init();

      console.log('🎵 useSongSync: Calling fetchSongs with userId:', currentUserIdRef.current);

      // Fetch data
      fetchSongs(userIdChanged);

      // Setup subscription
      setupSubscription();
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        RealtimeManager.removeSubscription(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId, isOnline, fetchSongs, setupSubscription]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to manually reconnect
  const reconnectSongs = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(subscriptionRef.current);
      } catch (e) {
        // Ignore
      }
      subscriptionRef.current = null;
    }

    if (isOnline) {
      setupSubscription();
      fetchSongs(true);
    }
  }, [isOnline, setupSubscription, fetchSongs]);

  return {
    isLoading,
    error,
    refetch: () => fetchSongs(true),
    reconnectSongs
  };
}
