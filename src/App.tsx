import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './utils/supabase';
import type { Song, SongRequest, RequestFormData, SetList, User } from './types';

console.log('🔥🔥🔥 APP.TSX FILE LOADED - FRESH CODE 🔥🔥🔥');
import { LandingPage } from './components/LandingPage';
import { UserFrontend } from './components/UserFrontend';
import { BackendLogin } from './components/BackendLogin'; 
import { SongLibrary } from './components/SongLibrary';
import { SetListManager } from './components/SetListManager';
import { QueueView } from './components/QueueView';
import { TickerManager } from './components/TickerManager';
import { LogoManager } from './components/LogoManager';
import { ColorCustomizer } from './components/ColorCustomizer';
import { SettingsManager } from './components/SettingsManager';
import { BackendTabs } from './components/BackendTabs';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useRequestSync } from './hooks/useRequestSync';
import { useSongSync } from './hooks/useSongSync';
import { useSetListSync } from './hooks/useSetListSync';
import { useUiSettings } from './hooks/useUiSettings';
import { useLogoHandling } from './hooks/useLogoHandling';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { LoadingPreloader } from './components/shared/LoadingPreloader';
import { LogOut } from 'lucide-react';
import { Logo } from './components/shared/Logo';
import { KioskPage } from './components/KioskPage';
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
const BACKEND_PATH = "backend";
const KIOSK_PATH = "kiosk";
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
  // Check initial path immediately to set backend state correctly
  const initialPath = window.location.pathname;
  const [isBackend, setIsBackend] = useState(initialPath.includes(BACKEND_PATH));
  const [isKiosk, setIsKiosk] = useState(initialPath.includes(KIOSK_PATH));

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
      
      if (path.includes(BACKEND_PATH)) {
        setIsBackend(true);
        setIsKiosk(false);
      } else if (path.includes(KIOSK_PATH)) {
        setIsKiosk(true);
        setIsBackend(false);
      } else {
        setIsBackend(false);
        setIsKiosk(false);
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

  // Enforce minimum preloader display time (3 seconds)
  useEffect(() => {
    const MIN_LOAD_TIME = 3000; // 3 seconds
    const timer = setTimeout(() => {
      setMinLoadTimePassed(true);
    }, MIN_LOAD_TIME);

    return () => clearTimeout(timer);
  }, []);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const hasAuth = localStorage.getItem('backendAuth') === 'true';
        setIsAdmin(hasAuth);

        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('currentUser');
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
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

  // Handle navigation to backend
  const navigateToBackend = useCallback(() => {
    window.history.pushState({}, '', `/${BACKEND_PATH}`);
    setIsBackend(true);
    setIsKiosk(false);
  }, []);
  
  // Handle navigation to frontend
  const navigateToFrontend = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsBackend(false);
    setIsKiosk(false);
  }, []);

  // Handle navigation to kiosk mode
  const navigateToKiosk = useCallback(() => {
    window.history.pushState({}, '', `/${KIOSK_PATH}`);
    setIsBackend(false);
    setIsKiosk(true);
  }, []);

  // Handle admin login
  const handleAdminLogin = useCallback(() => {
    localStorage.setItem('backendAuth', 'true');
    setIsAdmin(true);
  }, []);

  // Handle admin logout
  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem('backendAuth');
    localStorage.removeItem('backendUser');
    setIsAdmin(false);
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
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      const { error: requesterError } = await supabase
        .from('requesters')
        .insert([{
          id: generateUUID(),
          request_id: requestId,
          name: requesterName,
          photo: requesterPhoto || '',
          message: data.message || ''
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
      console.log('🗑️ Resetting entire queue...');

      // Delete all user votes
      const { error: votesError } = await supabase
        .from('user_votes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (votesError) throw votesError;

      // Delete all requesters
      const { error: requestersError } = await supabase
        .from('requesters')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (requestersError) throw requestersError;

      // Delete all requests
      const { error: requestsError } = await supabase
        .from('requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (requestsError) throw requestsError;

      toast.success('Queue cleared successfully!');
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
    // Show branded preloader for minimum 3 seconds
    return (
      <LoadingPreloader
        logoUrl={settings?.band_logo_url || DEFAULT_BAND_LOGO}
        accentColor={settings?.frontend_accent_color || '#ff00ff'}
        bandName={settings?.band_name || 'Band Name'}
      />
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

  // Show backend interface if in backend mode
  if (isBackend) {
    if (!isAdmin) {
      return (
        <ErrorBoundary>
          <BackendLogin onLogin={handleAdminLogin} />
        </ErrorBoundary>
      );
    }

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

          {/* Content */}
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
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show frontend interface
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
        onBackendAccess={navigateToBackend}
        isAdmin={isAdmin}
        isOnline={isOnline}
        logoUrl={settings?.band_logo_url || DEFAULT_BAND_LOGO}
      />
    </ErrorBoundary>
  );
}

export default App;