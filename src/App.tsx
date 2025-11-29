import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './utils/supabase';
import type { Song, SongRequest, RequestFormData, SetList, User } from './types';

console.log('🔥🔥🔥 APP.TSX FILE LOADED - FRESH CODE 🔥🔥🔥');
import { LandingPage } from './components/frontend/LandingPage';
import { UserFrontend } from './components/frontend/UserFrontend';
import { BackendLogin } from './components/backend/BackendLogin'; 
import { SongLibrary } from './components/backend/SongLibrary';
import { SetListManager } from './components/backend/SetListManager';
import { QueueView } from './components/backend/QueueView';
import { TickerManager } from './components/backend/TickerManager';
import { LogoManager } from './components/backend/LogoManager';
import { ColorCustomizer } from './components/backend/ColorCustomizer';
import { SettingsManager } from './components/backend/SettingsManager';
import { BackendTabs } from './components/backend/BackendTabs';
import { Analytics } from './components/backend/Analytics';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useRequestSync } from './hooks/useRequestSync'; // Debug transform source field
import { useSongSync } from './hooks/useSongSync';
import { useSetListSync } from './hooks/useSetListSync';
import { useUiSettings } from './hooks/useUiSettings';
import { useLogoHandling } from './hooks/useLogoHandling';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { LoadingPreloader } from './components/shared/LoadingPreloader';
import { LogOut } from 'lucide-react';
import { Logo } from './components/shared/Logo';
import { KioskPage } from './components/frontend/KioskPage';
import { Leaderboard } from './components/frontend/Leaderboard';
import toast from 'react-hot-toast';

const DEFAULT_BAND_LOGO = "https://www.fusion-events.ca/wp-content/uploads/2025/03/ulr-wordmark.png";

// Polyfill for crypto.randomUUID() for older Safari/iOS versions
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers (Safari < 15.4, iOS < 15.4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const DASHBOARD_PATH = "dashboard";
const KIOSK_PATH = "kiosk";
const LEADERBOARD_PATH = "leaderboard";
const MAX_PHOTO_SIZE = 250 * 1024; // 250KB limit for database storage
const MAX_REQUEST_RETRIES = 3;

function App() {
  // Check localStorage immediately before any state initialization
  const hasSeenWelcomeStored = localStorage.getItem('hasSeenWelcome');
  const savedUser = localStorage.getItem('currentUser');
  const isFirstTimeUser = hasSeenWelcomeStored !== 'true' && !savedUser;

  // Authentication state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!isFirstTimeUser); // Skip initialization for first-time users
  // Check initial path immediately to set dashboard state correctly
  const initialPath = window.location.pathname;
  const [isDashboard, setIsDashboard] = useState(initialPath.includes(DASHBOARD_PATH));
  const [isKiosk, setIsKiosk] = useState(initialPath.includes(KIOSK_PATH));
  const [isLeaderboard, setIsLeaderboard] = useState(initialPath.includes(LEADERBOARD_PATH));

  // Minimum preloader display time
  const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);
  const loadStartTimeRef = useRef(Date.now());
  
  // Backend tab state
  const [activeBackendTab, setActiveBackendTab] = useState<'requests' | 'setlists' | 'songs' | 'settings'>('requests');
  
  // App data state
  const [songs, setSongs] = useState<Song[]>([]);
  const [requests, setRequests] = useState<SongRequest[]>([]);

  console.log('🔧 App.tsx: setRequests function reference:', setRequests.toString().substring(0, 50));
  console.log('🔧 App.tsx: Current requests count:', requests.length);

  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [activeSetList, setActiveSetList] = useState<SetList | null>(null);

  // Voting states
  const [votingStates, setVotingStates] = useState<Set<string>>(new Set());

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Online state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Request processing state
  const requestInProgressRef = useRef(false);
  const requestRetriesRef = useRef(0);
  const mountedRef = useRef(true);

  // Optimistic updates state
  const [optimisticVotes, setOptimisticVotes] = useState<Map<string, number>>(new Map());

  // Use custom hooks for data syncing
  console.log('🔗 App.tsx: Passing setRequests to useRequestSync');
  const { reconnectRequests, refresh: refreshRequests } = useRequestSync({
    requests,
    setRequests,
    isOnline,
    currentUser
  });

  // Debug: Log requests state changes
  useEffect(() => {
    console.log('🎯 App.tsx requests state changed:', {
      count: requests.length,
      requests: requests.map(r => ({ id: r.id, title: r.title, requesters: r.requesters?.length || 0 }))
    });
  }, [requests]);

  const { reconnectSongs } = useSongSync({
    songs,
    setSongs,
    isOnline
  });

  const { reconnectSetLists } = useSetListSync({
    setLists,
    setSetLists,
    isOnline
  });

  const { settings, loading: settingsLoading, updateSettings } = useUiSettings();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('📶 Connection restored');
      toast.success('Connection restored');
      
      // Reconnect all sync hooks
      reconnectRequests();
      reconnectSongs();
      reconnectSetLists();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📵 Connection lost');
      toast.error('Connection lost. Working in offline mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconnectRequests, reconnectSongs, reconnectSetLists]);

  // Handle browser navigation
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;

      if (path.includes(DASHBOARD_PATH)) {
        setIsDashboard(true);
        setIsKiosk(false);
        setIsLeaderboard(false);
      } else if (path.includes(KIOSK_PATH)) {
        setIsKiosk(true);
        setIsDashboard(false);
        setIsLeaderboard(false);
      } else if (path.includes(LEADERBOARD_PATH)) {
        setIsLeaderboard(true);
        setIsDashboard(false);
        setIsKiosk(false);
      } else {
        setIsDashboard(false);
        setIsKiosk(false);
        setIsLeaderboard(false);
      }
    };

    checkPath();

    const checkPathSpecialCases = () => {
      checkPath();
    };

    window.addEventListener('popstate', checkPathSpecialCases);

    return () => {
      window.removeEventListener('popstate', checkPathSpecialCases);
    };
  }, []);

  // Enforce minimum preloader display time (3 seconds) with aggressive fallback timeouts
  useEffect(() => {
    const MIN_LOAD_TIME = 3000; // 3 seconds
    const MAX_LOAD_TIME = 8000; // 8 seconds fallback - force show app even if loading
    
    const minTimer = setTimeout(() => {
      setMinLoadTimePassed(true);
      console.log('✅ Minimum load time passed');
    }, MIN_LOAD_TIME);

    // Fallback: force show app after 8 seconds regardless of loading state
    const maxTimer = setTimeout(() => {
      console.warn('⚠️ Forcing app to load after 8 seconds (possible Supabase connection issue)');
      setMinLoadTimePassed(true);
      setIsInitializing(false);
    }, MAX_LOAD_TIME);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  // Check auth state using Supabase session only
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 [Auth] Checking Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ [Auth] Valid Supabase session found');
          setIsAdmin(true);
          
          // Get user from Supabase auth
          const user = session.user;
          let userEmail = user.email || '';
          let userName = user.user_metadata?.full_name || '';
          let userPhoto = user.user_metadata?.avatar_url || '';
          
          // Fetch additional profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role, is_active')
            .eq('id', user.id)
            .single();
          
          // Use profile data if available
          if (profileData && !profileError) {
            userEmail = profileData.email || userEmail;
            userName = profileData.full_name || userName;
            userPhoto = profileData.avatar_url || userPhoto;
            
            // Check if user is active
            if (!profileData.is_active) {
              console.warn('⚠️ [Auth] User account is deactivated');
              await supabase.auth.signOut();
              setIsAdmin(false);
              setCurrentUser(null);
              return;
            }
          }
          
          // Fallback for name if still empty
          if (!userName) {
            userName = userEmail.split('@')[0] || 'User';
          }
          
          setCurrentUser({
            id: user.id,
            name: userName,
            photo: userPhoto,
            email: userEmail
          });
          
          console.log('✅ [Auth] User authenticated:', userName, 'Email:', userEmail);
        } else {
          console.log('❌ [Auth] No valid session found');
          setIsAdmin(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ [Auth] Error checking session:', error);
        setIsAdmin(false);
        setCurrentUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [Auth] State changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ [Auth] User signed in');
          await checkAuth();
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 [Auth] User signed out');
          setIsAdmin(false);
          setCurrentUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update active set list when set lists change
  useEffect(() => {
    const active = setLists?.find(sl => sl?.isActive);
    
    if (active) {
      console.log(`Active set list updated in App: ${active.name} (${active.id})`);
    } else if (setLists?.length > 0) {
      console.log('No active set list found among', setLists.length, 'set lists');
    }
    
    setActiveSetList(active || null);
  }, [setLists]);

  // Handle navigation to dashboard
  const navigateToDashboard = useCallback(() => {
    window.history.pushState({}, '', `/${DASHBOARD_PATH}`);
    setIsDashboard(true);
    setIsKiosk(false);
  }, []);
  
  // Handle navigation to frontend
  const navigateToFrontend = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsDashboard(false);
    setIsKiosk(false);
  }, []);
  // Handle navigation to kiosk mode
  const navigateToKiosk = useCallback(() => {
    window.history.pushState({}, '', `/${KIOSK_PATH}`);
    setIsDashboard(false);
    setIsKiosk(true);
    setIsAdmin(true);
  }, []);

  // Handle admin login - called after successful Supabase auth
  const handleAdminLogin = useCallback(async () => {
    console.log('🔐 [Login] Admin login callback triggered');
    
    // Auth state will be updated by the onAuthStateChange listener
    // Just show success message
    toast.success('✅ Logged in successfully! Loading dashboard...');
  }, []);

  // Handle admin logout
  const handleAdminLogout = useCallback(async () => {
    console.log('👋 [Logout] Signing out...');
    await supabase.auth.signOut();
    setIsAdmin(false);
    setCurrentUser(null);
    navigateToFrontend();
    toast.success('Logged out successfully');
  }, [navigateToFrontend]);
  
  // Handle user update
  const handleUserUpdate = useCallback((user: User) => {
    try {
      setCurrentUser(user);
      
      try {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } catch (e) {
        console.error('Error saving user to localStorage:', e);
        toast.warning('Profile updated but could not be saved locally');
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  }, []);

  // Enhanced request submission with retry logic and optimistic updates
  const handleSubmitRequest = useCallback(async (data: RequestFormData): Promise<boolean> => {
    if (!isOnline) {
      toast.error('Cannot submit requests while offline. Please check your internet connection.');
      return false;
    }

    if (requestInProgressRef.current) {
      console.log('Request already in progress, skipping...');
      return false;
    }

    requestInProgressRef.current = true;

    try {
      // In kiosk mode, use data.requestedBy and data.userPhoto
      // In user mode, use currentUser if available, otherwise use data
      const requesterName = data.requestedBy || currentUser?.name;
      const requesterPhoto = data.userPhoto || currentUser?.photo;

      if (!requesterName) {
        throw new Error('Please enter your name to submit a request');
      }

      const requestId = generateUUID();

      const newRequest = {
        id: requestId,
        title: data.title,
        artist: data.artist,
        votes: 0,
        isLocked: false,
        isPlayed: false,
        createdAt: new Date().toISOString(),
        requesters: [{
          id: generateUUID(),
          requestId: requestId,
          name: requesterName,
          photo: requesterPhoto || '',
          message: data.message || '',
          timestamp: new Date().toISOString()
        }]
      };

      const { error } = await supabase
        .from('requests')
        .insert([{
          id: requestId,
          title: data.title,
          artist: data.artist,
          album_art_url: data.albumArtUrl || null,
          votes: 0,
          is_locked: false,
          is_played: false,
          is_active: true,  // New requests are active (visible in queue)
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      console.log('🔍 DEBUG INSERT - data.source:', data.source, 'final source:', data.source || 'web');
      const { error: requesterError } = await supabase
        .from('requesters')
        .insert([{
          id: generateUUID(),
          request_id: requestId,
          name: requesterName,
          photo: requesterPhoto || '',
          message: data.message || '',
          source: data.source || 'web' // Track request source (kiosk or web)
          // created_at is automatically set by the database
        }]);

      if (requesterError) throw requesterError;

      requestRetriesRef.current = 0;
      console.log('✅ Request submitted successfully');

      // Immediately refresh requests to show the new submission
      refreshRequests();

      return true;
    } catch (error) {
      console.error('Error submitting request:', error);
      
      // Handle retries for network errors
      if (error instanceof Error && 
          (error.message.includes('channel') || 
           error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError'))) {
        
        reconnectRequests();
        
        if (requestRetriesRef.current < MAX_REQUEST_RETRIES) {
          requestRetriesRef.current++;
          
          const delay = Math.pow(2, requestRetriesRef.current) * 1000;
          console.log(`Automatically retrying request in ${delay/1000} seconds (attempt ${requestRetriesRef.current}/${MAX_REQUEST_RETRIES})...`);
          
          setTimeout(() => {
            if (mountedRef.current) {
              requestInProgressRef.current = false;
              handleSubmitRequest(data).catch(console.error);
            }
          }, delay);
          
          return false;
        }
      }
      
      if (error instanceof Error) {
        const errorMsg = error.message.includes('rate limit') 
          ? 'Too many requests. Please try again later.'
          : error.message || 'Failed to submit request. Please try again.';
        toast.error(errorMsg);
      } else {
        toast.error('Failed to submit request. Please try again.');
      }
      
      requestRetriesRef.current = 0;
      return false;
    } finally {
      requestInProgressRef.current = false;
    }
  }, [reconnectRequests, refreshRequests, currentUser, isOnline]);

  // Enhanced vote handler with atomic database function and optimistic updates
  const handleVoteRequest = useCallback(async (id: string): Promise<boolean> => {
    if (!isOnline) {
      toast.error('Cannot vote while offline. Please check your internet connection.');
      return false;
    }
    
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to vote');
      }

      // Don't allow voting on temporary requests
      if (id.startsWith('temp_')) {
        toast.error('Please wait for the request to be processed before voting');
        return false;
      }

      // INSTANT UI UPDATE - Optimistically increment vote
      const currentRequest = requests.find(r => r.id === id);
      const currentVotes = optimisticVotes.get(id) ?? currentRequest?.votes ?? 0;
      setOptimisticVotes(prev => new Map([...prev, [id, currentVotes + 1]]));
      console.log(`📊 Optimistically incremented vote for request ${id}: ${currentVotes} -> ${currentVotes + 1}`);

      // Use the atomic database function for voting
      const { data, error } = await supabase.rpc('add_vote', {
        p_request_id: id,
        p_user_id: currentUser.name // Use name instead of id since user object doesn't have id
      });

      if (error) throw error;

      if (data === true) {
        toast.success('Vote added!');
        
        // Keep optimistic vote for a moment, then let real data take over
        setTimeout(() => {
          if (mountedRef.current) {
            setOptimisticVotes(prev => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
          }
        }, 1500);
        
        return true;
      } else {
        // Revert optimistic update if voting failed
        setOptimisticVotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
        
        toast.error('You have already voted for this request');
        return false;
      }
    } catch (error) {
      console.error('Error voting for request:', error);
      
      // Revert optimistic update on error
      setOptimisticVotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      if (error instanceof Error && error.message.includes('already voted')) {
        toast.error(error.message);
      } else if (error instanceof Error && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('network'))
      ) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to vote for this request. Please try again.');
      }
      
      return false;
    }
  }, [currentUser, isOnline, requests, optimisticVotes]);

  // Handle locking a request (marking it as next)
  const handleLockRequest = useCallback(async (requestId: string) => {
    if (!isOnline) {
      toast.error('Cannot update requests while offline. Please check your internet connection.');
      return false;
    }

    try {
      console.log(`🔒 Locking request: ${requestId}`);
      
      const { error } = await supabase.rpc('lock_request', { request_id: requestId });

      if (error) throw error;

      toast.success('Request locked as next!');
      return true;
    } catch (error) {
      console.error('Error locking request:', error);
      toast.error('Failed to lock request. Please try again.');
      return false;
    }
  }, [isOnline]);

  // Handle unlocking a request
  const handleUnlockRequest = useCallback(async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot update requests while offline. Please check your internet connection.');
      return false;
    }

    try {
      console.log(`🔓 Unlocking request: ${id}`);
      
      const { error } = await supabase.rpc('unlock_request', { request_id: id });

      if (error) throw error;

      toast.success('Request unlocked!');
      return true;
    } catch (error) {
      console.error('Error unlocking request:', error);
      toast.error('Failed to unlock request. Please try again.');
      return false;
    }
  }, [isOnline]);

  // Handle marking a request as played
  const handleMarkAsPlayed = useCallback(async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot update requests while offline. Please check your internet connection.');
      return false;
    }

    try {
      console.log(`✅ Marking request as played: ${id}`);
      
      const { error } = await supabase
        .from('requests')
        .update({ 
          is_played: true,
          is_locked: false
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Request marked as played!');
      return true;
    } catch (error) {
      console.error('Error marking request as played:', error);
      toast.error('Failed to mark request as played. Please try again.');
      return false;
    }
  }, [isOnline]);

  // Handle removing a request
  const handleRemoveRequest = useCallback(async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot remove requests while offline. Please check your internet connection.');
      return false;
    }

    try {
      console.log(`🗑️ Removing request: ${id}`);
      
      // Delete requesters first (foreign key constraint)
      const { error: requestersError } = await supabase
        .from('requesters')
        .delete()
        .eq('request_id', id);

      if (requestersError) throw requestersError;

      // Delete user votes
      const { error: votesError } = await supabase
        .from('user_votes')
        .delete()
        .eq('request_id', id);

      if (votesError) throw votesError;

      // Delete the request
      const { error: requestError } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (requestError) throw requestError;

      toast.success('Request removed!');
      return true;
    } catch (error) {
      console.error('Error removing request:', error);
      toast.error('Failed to remove request. Please try again.');
      return false;
    }
  }, [isOnline]);

  // Handle resetting the entire queue
  const handleResetQueue = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot reset queue while offline. Please check your internet connection.');
      return;
    }

    try {
      console.log('🗑️ Clearing active queue (preserving analytics data)...');

      // Mark all active requests as inactive instead of deleting
      // This preserves historical data for analytics
      const { error: requestsError } = await supabase
        .from('requests')
        .update({ is_active: false })
        .eq('is_active', true);

      if (requestsError) throw requestsError;

      // Note: We keep requesters and votes in the database for analytics
      // They are filtered out via the requests.is_active flag

      toast.success('Queue cleared successfully! Analytics data preserved.');
      console.log('✅ Queue cleared - all requests marked as inactive');
    } catch (error) {
      console.error('Error resetting queue:', error);
      toast.error('Failed to clear queue. Please try again.');
    }
  }, [isOnline]);

  // Handle creating a new set list
  const handleCreateSetList = useCallback(async (setList: Omit<SetList, 'id'>) => {
    if (!isOnline) {
      toast.error('Cannot create set lists while offline.');
      return;
    }

    try {
      console.log('📝 Creating new set list:', setList.name);
      const setListId = generateUUID();

      // Insert set list
      const { error: setListError } = await supabase
        .from('set_lists')
        .insert([{
          id: setListId,
          name: setList.name,
          date: setList.date,
          notes: setList.notes,
          is_active: false
        }]);

      if (setListError) throw setListError;

      // Insert songs with positions
      if (setList.songs && setList.songs.length > 0) {
        const setListSongs = setList.songs.map((song, index) => ({
          set_list_id: setListId,
          song_id: song.id,
          position: index
        }));

        const { error: songsError } = await supabase
          .from('set_list_songs')
          .insert(setListSongs);

        if (songsError) throw songsError;
      }

      // Immediately update local state with the new set list
      const newSetList: SetList = {
        id: setListId,
        name: setList.name,
        date: setList.date,
        notes: setList.notes || '',
        isActive: false,
        songs: setList.songs || [],
        createdAt: new Date().toISOString()
      };

      setSetLists(prev => [newSetList, ...prev]);

      toast.success('Set list created successfully!');
    } catch (error) {
      console.error('Error creating set list:', error);
      toast.error('Failed to create set list.');
    }
  }, [isOnline]);

  // Handle updating an existing set list
  const handleUpdateSetList = useCallback(async (setList: SetList) => {
    if (!isOnline) {
      toast.error('Cannot update set lists while offline.');
      return;
    }

    try {
      console.log('✏️ Updating set list:', setList.id);

      // Update set list metadata
      const { error: updateError } = await supabase
        .from('set_lists')
        .update({
          name: setList.name,
          date: setList.date,
          notes: setList.notes
        })
        .eq('id', setList.id);

      if (updateError) throw updateError;

      // Delete existing songs
      const { error: deleteError } = await supabase
        .from('set_list_songs')
        .delete()
        .eq('set_list_id', setList.id);

      if (deleteError) throw deleteError;

      // Insert updated songs with positions
      if (setList.songs && setList.songs.length > 0) {
        const setListSongs = setList.songs.map((song, index) => ({
          set_list_id: setList.id,
          song_id: song.id,
          position: index
        }));

        const { error: insertError } = await supabase
          .from('set_list_songs')
          .insert(setListSongs);

        if (insertError) throw insertError;
      }

      toast.success('Set list updated successfully!');
    } catch (error) {
      console.error('Error updating set list:', error);
      toast.error('Failed to update set list.');
    }
  }, [isOnline]);

  // Handle deleting a set list
  const handleDeleteSetList = useCallback(async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot delete set lists while offline.');
      return;
    }

    try {
      console.log('🗑️ Deleting set list:', id);

      // Delete set list (cascade will delete set_list_songs)
      const { error } = await supabase
        .from('set_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Set list deleted successfully!');
    } catch (error) {
      console.error('Error deleting set list:', error);
      toast.error('Failed to delete set list.');
    }
  }, [isOnline]);

  // Handle setting a set list as active
  const handleSetActive = useCallback(async (id: string) => {
    if (!isOnline) {
      toast.error('Cannot change set list status while offline.');
      return;
    }

    try {
      console.log('🎯 Setting active set list:', id);

      // Get current active status
      const { data: currentSetList, error: fetchError } = await supabase
        .from('set_lists')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newActiveStatus = !currentSetList.is_active;

      // Update active status (database trigger ensures only one is active)
      const { error: updateError } = await supabase
        .from('set_lists')
        .update({ is_active: newActiveStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success(newActiveStatus ? 'Set list activated!' : 'Set list deactivated!');
    } catch (error) {
      console.error('Error setting active set list:', error);
      toast.error('Failed to change set list status.');
    }
  }, [isOnline]);

  // Create merged requests with optimistic updates
  const mergedRequests = useMemo(() => {
    console.log('🔄 mergedRequests useMemo recalculating...');
    console.log('🔄 Input requests count:', requests.length);
    console.log('🔄 Input optimisticVotes size:', optimisticVotes.size);

    const merged = requests.map(req => ({
      ...req,
      votes: optimisticVotes.get(req.id) ?? req.votes ?? 0
    }));

    // DEBUG: Check if source field exists in merged data
    if (merged.length > 0 && merged[0].requesters && merged[0].requesters.length > 0) {
      console.log('🔍 MERGED CHECK - First request title:', merged[0].title);
      console.log('🔍 MERGED CHECK - First requester full object:', merged[0].requesters[0]);
      console.log('🔍 MERGED CHECK - First requester source field:', merged[0].requesters[0].source);
      console.log('🔍 MERGED CHECK - Source type:', typeof merged[0].requesters[0].source);
    }

    console.log('🔄 Output merged requests count:', merged.length);
    console.log('🔄 First 3 merged:', merged.slice(0, 3).map(r => ({
      id: r.id,
      title: r.title,
      votes: r.votes,
      requesters: r.requesters?.length || 0
    })));

    return merged;
  }, [requests, optimisticVotes]);

  // Show loading screen - enforce minimum display time
  const shouldShowLoader = isInitializing || settingsLoading || !minLoadTimePassed;

  if (shouldShowLoader) {
    // Debug logging
    if (isInitializing || settingsLoading) {
      console.log('⏳ Still loading:', { isInitializing, settingsLoading, minLoadTimePassed });
    }
    
    // Show branded preloader for minimum 3 seconds
    return (
      <LoadingPreloader
        logoUrl={settings?.band_logo_url || DEFAULT_BAND_LOGO}
        accentColor={settings?.frontend_accent_color || '#ff00ff'}
        bandName={settings?.band_name || 'Band Name'}
      />
    );
  }

  // Show leaderboard mode
  if (isLeaderboard) {
    return (
      <ErrorBoundary>
        <Leaderboard />
      </ErrorBoundary>
    );
  }

  // Show kiosk mode
  if (isKiosk) {
    return (
      <KioskPage
        songs={songs}
        requests={mergedRequests}
        activeSetList={activeSetList}
        onSubmitRequest={handleSubmitRequest}
        onVoteRequest={handleVoteRequest}
        logoUrl={settings?.band_logo_url || DEFAULT_BAND_LOGO}
      />
    );
  }

  // Show dashboard interface
  if (isDashboard) {
    console.log('🔐 [App] Showing dashboard interface, isAdmin:', isAdmin, 'currentUser:', currentUser?.name);
    if (!isAdmin || !currentUser) {
      console.log('🔑 [App] Showing BackendLogin (not authenticated)');
      return (
        <ErrorBoundary>
          <BackendLogin onLogin={handleAdminLogin} />
        </ErrorBoundary>
      );
    }
    console.log('✅ [App] Showing dashboard (authenticated) - User:', currentUser.name, 'Email:', currentUser.email);

    // Show loading state if data is still being fetched
    const isLoadingData = songs.length === 0 && requests.length === 0 && setLists.length === 0;

    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <Logo 
                  url={settings?.band_logo_url || DEFAULT_BAND_LOGO} 
                  className="h-8" 
                />
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* User Info */}
                <div className="text-right text-sm">
                  <div className="text-gray-300">
                    {currentUser?.name || 'User'}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {currentUser?.email || 'No email'}
                  </div>
                </div>
                
                <button
                  onClick={navigateToFrontend}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                >
                  View Frontend
                </button>
                <button
                  onClick={navigateToKiosk}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Kiosk Mode
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <BackendTabs 
            activeTab={activeBackendTab} 
            onTabChange={setActiveBackendTab} 
          />

          {/* Loading State */}
          {isLoadingData && (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="inline-block">
                  <div className="w-12 h-12 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                </div>
                <p className="text-gray-400">Loading dashboard data...</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoadingData && (
          <div className="p-6">
            {activeBackendTab === 'requests' && (
              <QueueView
                requests={mergedRequests}
                onLockRequest={handleLockRequest}
                onUnlockRequest={handleUnlockRequest}
                onMarkAsPlayed={handleMarkAsPlayed}
                onRemoveRequest={handleRemoveRequest}
                onResetQueue={handleResetQueue}
                isOnline={isOnline}
              />
            )}
            {activeBackendTab === 'setlists' && (
              <SetListManager
                setLists={setLists}
                songs={songs}
                onCreateSetList={handleCreateSetList}
                onUpdateSetList={handleUpdateSetList}
                onDeleteSetList={handleDeleteSetList}
                onSetActive={handleSetActive}
              />
            )}
            {activeBackendTab === 'songs' && (
              <SongLibrary
                songs={songs}
                onSongsChange={setSongs}
                isOnline={isOnline}
              />
            )}
            {activeBackendTab === 'settings' && (
              <div className="space-y-8">
                <SettingsManager />
                <LogoManager />
                <ColorCustomizer />
                <TickerManager
                  isAdmin={true}
                  nextSong={requests.find(r => r.isLocked && !r.isPlayed) ? {
                    title: requests.find(r => r.isLocked && !r.isPlayed)!.title,
                    artist: requests.find(r => r.isLocked && !r.isPlayed)!.artist
                  } : undefined}
                  isActive={!!settings?.ticker_active}
                  customMessage={settings?.custom_message || ''}
                  onUpdateMessage={(message) => {
                    // This will be handled by the TickerManager through updateSettings
                  }}
                  onToggleActive={() => {
                    // This will be handled by the TickerManager through updateSettings
                  }}
                />
              </div>
            )}
            {activeBackendTab === 'analytics' && (
              <Analytics />
            )}
          </div>
        )}
        </div>
      </ErrorBoundary>
    );
  }

  // Show frontend interface
  console.log('🎵 [App] Showing frontend interface');
  console.log('📊 [App] Data loaded - songs:', songs.length, 'requests:', mergedRequests.length, 'setLists:', setLists.length);
  return (
    <ErrorBoundary>
      <UserFrontend 
        currentUser={currentUser}
        songs={songs}
        requests={mergedRequests}
        activeSetList={activeSetList}
        onUpdateUser={handleUserUpdate}
        onSubmitRequest={handleSubmitRequest}
        onVoteRequest={handleVoteRequest}
        onBackendAccess={navigateToDashboard}
        isAdmin={isAdmin}
        isOnline={isOnline}
        logoUrl={settings?.band_logo_url || DEFAULT_BAND_LOGO}
      />
    </ErrorBoundary>
  );
}

export default App;