import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { cacheService } from '../utils/cache';
import { RealtimeManager } from '../utils/realtimeManager';
import type { SetList } from '../types';

const SET_LISTS_CACHE_KEY = 'set_lists:all';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second base delay

interface UseSetListSyncProps {
  setLists: SetList[];
  setSetLists: (setLists: SetList[]) => void;
  isOnline: boolean;
}

export function useSetListSync({
  setLists,
  setSetLists,
  isOnline
}: UseSetListSyncProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const setListsSubscriptionRef = useRef<string | null>(null);
  const setListSongsSubscriptionRef = useRef<string | null>(null); 
  const setListActivationSubscriptionRef = useRef<string | null>(null); 
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchInProgressRef = useRef(false);

  // Fetch set lists with simple error handling
  const fetchSetLists = useCallback(async (bypassCache = false) => {
    // Don't allow concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Debounce frequent calls (but allow bypass for critical updates)
    const now = Date.now();
    if (!bypassCache && now - lastFetchTimeRef.current < 300) { // 300ms debounce
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Set a new timeout to fetch after debounce period
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

      // Check cache first unless bypassing
      if (!bypassCache) {
        const cachedSetLists = cacheService.get<SetList[]>(SET_LISTS_CACHE_KEY);
        if (cachedSetLists?.length > 0) {
          if (mountedRef.current && setSetLists) {
            setSetLists(cachedSetLists);
            setIsLoading(false);
          }
          return;
        }
      }

      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No authenticated user - returning empty setlists');
        const emptyResult: SetList[] = [];
        if (mountedRef.current) {
          setSetLists(emptyResult);
          cacheService.set(SET_LISTS_CACHE_KEY, emptyResult);
        }
        return;
      }

      // Fetch set lists for the current user only
      // RLS policies will automatically filter to user's data
      console.log('🔄 Fetching setlists for user:', user.id);
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
        .order('created_at', { ascending: false });

      if (setListsError) throw setListsError;

      if (setListsData && mountedRef.current) {
        // Format the data to match our SetList type
        const formattedSetLists = setListsData.map(setList => ({
          id: setList.id,
          name: setList.name,
          date: setList.date,
          isActive: setList.is_active || false,
          notes: setList.notes || '',
          createdAt: setList.created_at || '',
          songs: (setList.set_list_songs || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((sls: any) => {
              const song = sls.songs;
              return {
                ...song,
                // Use the standardized albumArtUrl field
                albumArtUrl: song.albumArtUrl || null,
                position: sls.position,
                setListSongId: sls.id
              };
            })
        }));
        
        cacheService.setSetLists(SET_LISTS_CACHE_KEY, formattedSetLists);
        setSetLists(formattedSetLists);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      console.error('Error fetching set lists:', error);
      
      if (mountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));
        
        // Use cached data if available
        const cachedSetLists = cacheService.get<SetList[]>(SET_LISTS_CACHE_KEY);
        if (cachedSetLists) {
          setSetLists(cachedSetLists);
        }

        // Retry with exponential backoff
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
  }, [setSetLists, retryCount]);

  // Setup subscriptions function (defined at component level for reuse)
  const setupSubscriptions = useCallback(() => {
    if (!isOnline) return;

    try {
      // Subscribe to set_lists table
      const setListsSub = RealtimeManager.createSubscription(
        'set_lists',
        (payload) => {
          fetchSetLists(true);
        }
      );

      // Subscribe to set_list_songs table
      const setListSongsSub = RealtimeManager.createSubscription(
        'set_list_songs',
        (payload) => {
          fetchSetLists(true);
        }
      );
      // Subscribe specifically to set list activation changes
      const setListActivationSub = RealtimeManager.createSubscription(
        'set_lists',
        (payload) => {
          // If this is an update and is_active changed, fetch immediately with high priority
          if (payload.eventType === 'UPDATE' &&
              payload.new && payload.old &&
              payload.new.is_active !== payload.old.is_active) {
            // Clear cache and fetch fresh data
            cacheService.del(SET_LISTS_CACHE_KEY);
            fetchSetLists(true);
          }
        },
        { event: 'UPDATE', schema: 'public', table: 'set_lists', filter: `is_active=eq.true` }
      );

      setListsSubscriptionRef.current = setListsSub;
      setListSongsSubscriptionRef.current = setListSongsSub;
      setListActivationSubscriptionRef.current = setListActivationSub;
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  }, [isOnline, fetchSetLists]);

  // Setup realtime subscriptions
  useEffect(() => {
    mountedRef.current = true;

    // Initialize RealtimeManager
    RealtimeManager.init();
    
    // Initial fetch and subscription setup
    if (isOnline) {
      fetchSetLists();
      setupSubscriptions(); 
    }
    
    // REMOVED: Periodic polling interval setup
    // No more setInterval for polling every 5 minutes
    // Add a polling interval as a fallback for production environments
    // where realtime might be less reliable
    const pollingInterval = setInterval(() => {
      if (isOnline) fetchSetLists(true);
    }, 10000); // Poll every 10 seconds
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      
      // Clear any pending timeouts
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Clear polling interval
      clearInterval(pollingInterval);
      
      // Remove subscriptions
      if (setListsSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListsSubscriptionRef.current);
      }
      
      if (setListSongsSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListSongsSubscriptionRef.current);
      }
      if (setListActivationSubscriptionRef.current) {
        RealtimeManager.removeSubscription(setListActivationSubscriptionRef.current);
      }
    };
  }, [fetchSetLists, setupSubscriptions, isOnline]);

  // Function to manually reconnect
  const reconnectSetLists = useCallback(() => {
    // Clean up existing subscriptions
    if (setListsSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListsSubscriptionRef.current);
      } catch (e) {
        console.warn('Error removing subscription:', e);
      }
    }
    
    if (setListSongsSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListSongsSubscriptionRef.current);
      } catch (e) {
        console.warn('Error removing subscription:', e);
      }
    }
    
    if (setListActivationSubscriptionRef.current) {
      try {
        RealtimeManager.removeSubscription(setListActivationSubscriptionRef.current);
      } catch (e) {
        console.warn('Error removing subscription:', e);
      }
    }

    // Set up new subscriptions
    if (isOnline) {
      setupSubscriptions();
      
      // Force a fresh fetch
      fetchSetLists(true);
    }
  }, [fetchSetLists, isOnline]);

  return { 
    isLoading, 
    error, 
    refetch: () => fetchSetLists(true),
    reconnectSetLists
  };
}