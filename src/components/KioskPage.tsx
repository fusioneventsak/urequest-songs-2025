import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Music4, ThumbsUp, X, AlertTriangle, Music, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Logo } from './shared/Logo';
import { SongList } from './SongList';
import { UpvoteList } from './UpvoteList';
import { Ticker } from './Ticker';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import { BackToTopButton } from './shared/BackToTopButton';
import { generateDefaultAvatar } from '../utils/photoStorage';
import { supabase } from '../utils/supabase';
import { useUiSettings } from '../hooks/useUiSettings';
import toast from 'react-hot-toast';
import type { Song, SongRequest, RequestFormData, SetList } from '../types';

interface KioskPageProps {
  songs: Song[];
  requests: SongRequest[];
  activeSetList: SetList | null;
  onSubmitRequest: (data: RequestFormData) => Promise<boolean>;
  onVoteRequest: (id: string) => Promise<boolean>;
  logoUrl: string;
}

export function KioskPage({
  songs,
  requests,
  activeSetList,
  onSubmitRequest,
  onVoteRequest,
  logoUrl
}: KioskPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'upvote'>('requests');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Local state for UI feedback only
  const [submittingStates, setSubmittingStates] = useState<Set<string>>(new Set());
  const [votingStates, setVotingStates] = useState<Set<string>>(new Set());
  const [optimisticVotes, setOptimisticVotes] = useState<Map<string, number>>(new Map());

  const mountedRef = useRef(true);
  const { settings } = useUiSettings();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Detect older devices and enable performance mode for kiosk only
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const cores = navigator.hardwareConcurrency || 2;

    // Detect older iPads (iPad Air 2, iPad Mini 2-4, older iOS versions)
    const isOldIpad = /iPad/.test(userAgent) && (
      // iOS 9-12 (older versions)
      /OS ([9]|1[0-2])_/.test(userAgent) ||
      // Low CPU cores (2 or less typically indicates older hardware)
      cores <= 2
    );

    if (isOldIpad) {
      console.log('🚀 Performance mode enabled for older device');
      document.body.classList.add('kiosk-performance-mode');
    }

    return () => {
      document.body.classList.remove('kiosk-performance-mode');
    };
  }, []);

  // Preload first 150 album art images and track progress
  useEffect(() => {
    const imagesToPreload = 150;
    const songsToLoad = songs.slice(0, imagesToPreload);
    let loaded = 0;

    // Check if images are already cached
    const checkCache = async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('album-art-v1');
          const cachedUrls = await Promise.all(
            songsToLoad.map(song =>
              song.albumArtUrl
                ? cache.match(song.albumArtUrl.replace('/default.jpg', '/w_16,h_16,c_fill,q_5/default.jpg'))
                : Promise.resolve(undefined)
            )
          );
          const cachedCount = cachedUrls.filter(Boolean).length;

          if (cachedCount === songsToLoad.length) {
            console.log('✅ All images already cached, skipping preload');
            setImagesLoaded(true);
            setLoadedCount(songsToLoad.length);
            return true;
          }
        } catch (e) {
          console.warn('Cache check failed:', e);
        }
      }
      return false;
    };

    const preloadImages = async () => {
      // Check cache first
      const allCached = await checkCache();
      if (allCached) return;

      console.log(`🎨 Preloading ${songsToLoad.length} album art images...`);

      const promises = songsToLoad.map((song, index) => {
        if (!song.albumArtUrl) {
          loaded++;
          setLoadedCount(loaded);
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          const img = new Image();
          const url = song.albumArtUrl.replace('/default.jpg', '/w_16,h_16,c_fill,q_5/default.jpg');

          img.onload = async () => {
            loaded++;
            setLoadedCount(loaded);

            // Cache the image
            if ('caches' in window) {
              try {
                const cache = await caches.open('album-art-v1');
                const response = await fetch(url);
                await cache.put(url, response);
              } catch (e) {
                console.warn('Failed to cache image:', e);
              }
            }

            resolve();
          };

          img.onerror = () => {
            loaded++;
            setLoadedCount(loaded);
            console.warn(`Failed to load image ${index}:`, url);
            resolve(); // Don't block on errors
          };

          img.src = url;
        });
      });

      await Promise.all(promises);
      setImagesLoaded(true);
      console.log(`✅ Preloaded ${loaded}/${songsToLoad.length} images`);
    };

    preloadImages();
  }, [songs]);

  // Get colors from settings
  const navBgColor = settings?.nav_bg_color || '#0f051d';
  const highlightColor = settings?.highlight_color || '#ff00ff';
  const accentColor = settings?.frontend_accent_color || '#ff00ff';

  // Get the locked request for the ticker
  const lockedRequest = useMemo(() => {
    return requests.find(r => r.isLocked && !r.isPlayed);
  }, [requests]);

  // Find the locked song for ticker
  const lockedSong = useMemo(() => {
    if (!lockedRequest) return null;
    return songs.find(s => s.title === lockedRequest.title);
  }, [lockedRequest, songs]);

  // Get available songs (from set list or all songs)
  const availableSongs = useMemo(() => {
    return activeSetList?.songs || songs;
  }, [activeSetList, songs]);

  // Filter songs based on search - MUST come before useEffect that uses it
  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return availableSongs;

    const searchLower = searchTerm.toLowerCase();
    return availableSongs.filter(song => {
      return (
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower) ||
        (song.genre?.toLowerCase() || '').includes(searchLower)
      );
    });
  }, [availableSongs, searchTerm]);


  // Create merged requests with optimistic votes
  const mergedRequests = useMemo(() => {
    return requests.map(req => ({
      ...req,
      votes: optimisticVotes.get(req.id) ?? req.votes ?? 0
    }));
  }, [requests, optimisticVotes]);

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setIsRequestModalOpen(true);
  };

  // Simplified song request handler
  const handleSubmitRequest = useCallback(async () => {
    if (!selectedSong || !userName.trim()) {
      toast.error('Please select a song and enter your name');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: RequestFormData = {
        title: selectedSong.title,
        artist: selectedSong.artist || '',
        albumArtUrl: selectedSong.albumArtUrl,
        requestedBy: userName.trim(),
        userPhoto: generateDefaultAvatar(userName.trim()),
        message: message.trim()
      };

      const success = await onSubmitRequest(requestData);

      if (success) {
        toast.success(`"${selectedSong.title}" has been added to the queue!`);
        setSelectedSong(null);
        setIsRequestModalOpen(false);
        setUserName('');
        setMessage('');
      }
    } catch (error) {
      console.error('Error requesting song:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSong, userName, message, onSubmitRequest]);

  // Simplified vote handler
  const handleVote = useCallback(async (requestId: string): Promise<boolean> => {
    if (votingStates.has(requestId)) {
      return false; // Already voting
    }

    setVotingStates(prev => new Set([...prev, requestId]));

    // Find current vote count for optimistic update
    const currentRequest = requests.find(r => r.id === requestId);
    const currentVotes = optimisticVotes.get(requestId) ?? currentRequest?.votes ?? 0;

    // INSTANT UI UPDATE - Optimistically increment vote immediately
    setOptimisticVotes(prev => new Map([...prev, [requestId, currentVotes + 1]]));

    try {
      // Generate a unique kiosk user ID
      const kioskUserId = `kiosk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Use the atomic database function for voting
      const { data, error } = await supabase
        .rpc('add_vote', {
          p_request_id: requestId,
          p_user_id: kioskUserId
        });

      if (error) {
        console.error('Error in add_vote RPC:', error);
        // Revert optimistic update on error
        setOptimisticVotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(requestId);
          return newMap;
        });
        toast.error('Failed to vote. Please try again.');
        return false;
      }

      if (data === true) {
        toast.success('Vote added!');
        return true;
      } else {
        // Revert optimistic update if voting failed
        setOptimisticVotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(requestId);
          return newMap;
        });
        toast.error('Unable to vote at this time. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error voting for request:', error);
      // Revert optimistic update on error
      setOptimisticVotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
      toast.error('Failed to vote. Please try again.');
      return false;
    } finally {
      setVotingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  }, [requests, optimisticVotes, votingStates]);

  const remainingChars = 100 - message.length;

  // Show loading screen while images preload
  if (!imagesLoaded) {
    const totalToLoad = Math.min(150, songs.length);
    const progress = totalToLoad > 0 ? (loadedCount / totalToLoad) * 100 : 0;

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: settings?.frontend_bg_use_gradient
            ? `linear-gradient(135deg, ${settings.frontend_bg_gradient_start}, ${settings.frontend_bg_gradient_end})`
            : `var(--frontend-bg-color, ${settings?.frontend_bg_color || '#13091f'})`
        }}
      >
        <div className="flex flex-col items-center gap-6">
          <Logo url={logoUrl} className="w-64" />
          <div className="text-white text-2xl font-bold">Loading Songs...</div>
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundImage: `linear-gradient(90deg, ${accentColor}, ${settings?.frontend_secondary_accent || '#9d00ff'})`
              }}
            />
          </div>
          <div className="text-gray-400 text-lg">
            {loadedCount} / {totalToLoad} images loaded
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="frontend-container min-h-screen"
      style={{
        background: settings?.frontend_bg_use_gradient
          ? `linear-gradient(135deg, ${settings.frontend_bg_gradient_start}, ${settings.frontend_bg_gradient_end})`
          : `var(--frontend-bg-color, ${settings?.frontend_bg_color || '#13091f'})`
      }}
    >
      {/* CSS Variables - Set once at root for performance */}
      <style>{`
        :root {
          --accent-color: ${accentColor};
          --song-card-color: ${settings?.song_card_color || settings?.frontend_accent_color || '#ff00ff'};
          --secondary-color: ${settings?.frontend_secondary_accent || '#9d00ff'};
          --nav-bg-color: ${navBgColor};
          --highlight-color: ${highlightColor};
          /* Pre-calculated opacity variants for performance */
          --accent-color-dd: ${accentColor}dd;
          --accent-color-60: ${accentColor}99;
          --accent-color-40: ${accentColor}66;
          --accent-color-20: ${accentColor}33;
          --accent-color-10: ${accentColor}1a;
          --song-card-color-60: ${settings?.song_card_color || settings?.frontend_accent_color || '#ff00ff'}99;
          --song-card-color-30: ${settings?.song_card_color || settings?.frontend_accent_color || '#ff00ff'}4d;
          --song-card-color-10: ${settings?.song_card_color || settings?.frontend_accent_color || '#ff00ff'}1a;
        }
      `}</style>

      {/* Main header with logo */}
      <header
        className="px-6 pt-10 pb-4 text-center relative border-b border-neon-purple/20"
        style={{
          background: settings?.frontend_header_bg_use_gradient
            ? `linear-gradient(180deg, ${settings.frontend_header_bg_gradient_start}, ${settings.frontend_header_bg_gradient_end})`
            : (settings?.frontend_header_bg || '#13091f')
        }}
      >
        {/* QR Code in top right corner */}
        {settings?.show_qr_code && (
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
            <QRCodeSVG
              value={`${window.location.origin}/frontend`}
              size={120}
              level="M"
              includeMargin={false}
            />
            <p className="text-xs text-gray-600 text-center mt-2 font-medium">
              Scan to request<br />from your phone
            </p>
          </div>
        )}

        <Logo
          url={logoUrl}
          className="mx-auto"
          style={{ height: '103.5px' }}
        />
        <h1
          className="text-3xl font-bold mb-2 -mt-20"
          style={{ color: accentColor, textShadow: `0 0 10px ${accentColor}` }}
        >
          {settings?.band_name || 'Band Request Hub'}
        </h1>

        {activeSetList && (
          <div className="mb-2 inline-flex items-center py-1 px-4 rounded-full"
            style={{
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}30`
            }}
          >
            <span className="text-sm" style={{ color: accentColor }}>
              Now playing songs from: <span className="font-bold">{activeSetList.name}</span>
            </span>
          </div>
        )}
      </header>

      {/* Ticker */}
      <Ticker
        nextSong={lockedRequest ? {
          title: lockedRequest.title,
          artist: lockedRequest.artist,
          albumArtUrl: lockedSong?.albumArtUrl
        } : undefined}
        customMessage={settings?.custom_message}
        isActive={!!settings?.custom_message || !!lockedRequest}
      />

      {/* Main content */}
      <main className="flex-1 px-6 py-4">
        {/* Tab content */}
        <div className="pb-20">
          {activeTab === 'requests' ? (
            <>
              {/* Search bar */}
              <div className="relative mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search songs by title, artist, or genre..."
                  className="w-full pl-4 pr-4 py-3 bg-neon-purple/10 border border-neon-purple/20 rounded-lg placeholder-gray-400 focus:outline-none focus:border-neon-pink"
                  style={{ color: '#1a1a1a' }}
                />
              </div>

              {filteredSongs.length > 0 ? (
                <SongList
                  songs={filteredSongs}
                  requests={requests}
                  onSongSelect={handleSongSelect}
                />
              ) : (
                <div className="text-center py-12">
                  <Music4 className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-lg">
                    {searchTerm.trim()
                      ? `No songs found matching "${searchTerm}"`
                      : 'No songs available'
                    }
                  </p>
                </div>
              )}
            </>
          ) : (
            <UpvoteList
              requests={mergedRequests}
              onVote={handleVote}
              currentUserId={`kiosk_${Date.now()}`}
              votingStates={votingStates}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-opacity-95 backdrop-blur-sm border-t border-neon-purple/20 px-6 py-3"
        style={{ backgroundColor: navBgColor }}
      >
        <div className="flex justify-center space-x-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 max-w-xs flex flex-col items-center py-2 px-4 rounded-lg transition-all ${activeTab === 'requests'
                ? 'bg-neon-purple/20 border border-neon-pink/50'
                : ''
              }`}
          >
            <Music4
              className="w-6 h-6 mb-1"
              style={{ color: activeTab === 'requests' ? accentColor : highlightColor }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: activeTab === 'requests' ? accentColor : highlightColor }}
            >
              Request Songs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upvote')}
            className={`flex-1 max-w-xs flex flex-col items-center py-2 px-4 rounded-lg transition-all ${activeTab === 'upvote'
                ? 'bg-neon-purple/20 border border-neon-pink/50'
                : ''
              }`}
          >
            <ThumbsUp
              className="w-6 h-6 mb-1"
              style={{ color: activeTab === 'upvote' ? accentColor : highlightColor }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: activeTab === 'upvote' ? accentColor : highlightColor }}
            >
              Vote on Requests
            </span>
          </button>
        </div>
      </nav>

      {/* Request Modal */}
      {selectedSong && isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => {
                  setIsRequestModalOpen(false);
                  setSelectedSong(null);
                  setMessage('');
                }}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitRequest(); }} className="px-6 pb-6 space-y-6">
              {/* Main Feature: Song Display */}
              <div className="space-y-4">
                <h3 className="text-center text-xl font-bold text-white">
                  You Are Requesting
                </h3>

                <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex-shrink-0">
                      <AlbumArtDisplay
                        song={selectedSong}
                        size="medium"
                        className="rounded-lg shadow-lg"
                      />
                    </div>
                    <div className="text-center w-full">
                      <h3 className="font-bold text-white text-2xl mb-2">
                        {selectedSong.title}
                      </h3>
                      {selectedSong.artist && (
                        <p className="text-gray-300 text-lg mb-1">by {selectedSong.artist}</p>
                      )}
                      {selectedSong.genre && (
                        <p className="text-gray-400 text-sm">{selectedSong.genre}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Input - Highlighted */}
              <div className="space-y-2">
                <label htmlFor="userName" className="block text-sm font-medium text-white">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2"
                  style={{
                    ['--tw-ring-color' as any]: accentColor,
                    borderColor: accentColor
                  }}
                  maxLength={50}
                  required
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-medium text-gray-300">
                  Optional Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 100) {
                      setMessage(value);
                    }
                  }}
                  placeholder="Add a special message with your request..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    ['--tw-ring-color' as any]: accentColor
                  }}
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Make it personal!</span>
                  <span className={`${remainingChars < 10 ? 'text-red-400' : 'text-gray-500'}`}>
                    {remainingChars} characters remaining
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !userName.trim()}
                className="w-full text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2"
                style={{
                  background: isSubmitting || !userName.trim()
                    ? 'linear-gradient(to right, #4b5563, #4b5563)'
                    : `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
                  opacity: isSubmitting || !userName.trim() ? 0.5 : 1,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5)',
                  boxShadow: isSubmitting || !userName.trim()
                    ? 'none'
                    : `0 0 20px ${accentColor}80`
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' }} />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-5 h-5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' }} />
                    <span>Submit Request</span>
                  </>
                )}
              </button>

              {/* Help Text */}
              <p className="text-center text-gray-500 text-sm">
                Your request will be added to the queue and others can vote for it!
              </p>
            </form>
          </div>
        </div>
      )}

      <BackToTopButton size="large" />
    </div>
  );
}
