import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Music4, ThumbsUp, UserCircle, Users, Crown, Zap, Music } from 'lucide-react';
import { useUiSettings } from '../hooks/useUiSettings';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import type { SongRequest } from '../types';
import toast from 'react-hot-toast';

interface UpvoteListProps {
  requests: SongRequest[];
  onVote: (id: string) => Promise<boolean>;
  currentUserId?: string;
  votingStates?: Set<string>;
}

export function UpvoteList({ requests, onVote, currentUserId, votingStates = new Set<string>() }: UpvoteListProps) {
  const { settings } = useUiSettings();
  const songBorderColor = settings?.song_border_color || settings?.frontend_accent_color || '#ff00ff';
  const accentColor = settings?.frontend_accent_color || '#ff00ff';

  // Deduplicate and merge requests for the same song
  const activeRequests = useMemo(() => {
    if (!requests || !Array.isArray(requests)) {
      console.log('No requests array provided to UpvoteList');
      return [];
    }

    // Filter out played requests
    const filtered = requests.filter(request => request && !request.isPlayed);

    // Group requests by song (title + artist)
    const songGroups = new Map<string, SongRequest>();

    filtered.forEach(request => {
      const songKey = `${request.title.toLowerCase().trim()}|${(request.artist || '').toLowerCase().trim()}`;

      const existing = songGroups.get(songKey);

      if (existing) {
        // Merge this request into the existing one
        const allRequesters = Array.isArray(existing.requesters) ? existing.requesters : [];
        const newRequesters = Array.isArray(request.requesters) ? request.requesters : [];

        // Combine requesters, avoiding duplicates by user ID
        const requesterMap = new Map();
        [...allRequesters, ...newRequesters].forEach(req => {
          if (!requesterMap.has(req.id)) {
            requesterMap.set(req.id, req);
          }
        });

        existing.requesters = Array.from(requesterMap.values());
        existing.votes = (existing.votes || 0) + (request.votes || 0);

        // Keep the locked state if any version is locked
        if (request.isLocked) {
          existing.isLocked = true;
        }

        // Use the earliest creation time
        const existingTime = new Date(existing.createdAt).getTime();
        const requestTime = new Date(request.createdAt).getTime();
        if (requestTime < existingTime) {
          existing.createdAt = request.createdAt;
        }
      } else {
        // First time seeing this song, add it
        songGroups.set(songKey, { ...request });
      }
    });

    // Convert map to array and sort by priority
    return Array.from(songGroups.values()).sort((a, b) => {
      // Locked requests go first
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;

      // Then by total engagement (votes + requester count)
      const requestersA = Array.isArray(a.requesters) ? a.requesters : [];
      const requestersB = Array.isArray(b.requesters) ? b.requesters : [];

      const engagementA = (a.votes || 0) + requestersA.length;
      const engagementB = (b.votes || 0) + requestersB.length;

      if (engagementA !== engagementB) {
        return engagementB - engagementA;
      }

      // If engagement is equal, sort by creation time (oldest first for deduplicated songs)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [requests]);

  const handleVote = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();

    if (!currentUserId || votingStates.has(id)) {
      // FIXED: Allow voting with just a name, don't require complete profile
      console.log('Cannot vote: missing user ID or already voting');
      return;
    }

    try {
      const success = await onVote(id);
      
      if (success) {
        console.log('Vote successful');
      }
    } catch (error) {
      console.error('Vote failed:', error);
      toast.error('Failed to vote. Please try again.');
    }
  };

  if (activeRequests.length === 0) {
    return (
      <div className="text-center py-16">
        <Music4 className="mx-auto h-16 w-16 text-gray-500 mb-6" />
        <p className="text-gray-400 text-xl mb-2">No active requests to vote on</p>
        <p className="text-gray-500 text-lg">Be the first to request a song!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold neon-text mb-2">Vote for Your Favorites</h2>
        <p className="text-gray-400">Help decide what gets played next!</p>
      </div>

      <div className="space-y-3">
        {activeRequests.map((request, index) => {
          const isVoting = votingStates.has(request.id);
          const requesters = Array.isArray(request.requesters) ? request.requesters : [];
          const mainRequester = requesters[0];
          const additionalCount = Math.max(0, requesters.length - 1);
          const votes = request.votes || 0;
          const totalEngagement = votes + requesters.length;

          // Determine if this is a highly requested song
          const isHotTrack = totalEngagement >= 5;
          const isTopRequest = index === 0 && !request.isLocked;

          return (
            <div
              key={request.id}
              className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
                request.isLocked
                ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20'
                : isHotTrack
                ? 'ring-2 ring-red-400/50 shadow-lg shadow-red-400/10'
                : isTopRequest
                ? 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/10'
                : 'border'
              }`}
              style={{
                borderColor: request.isLocked ? '#FBBF24' : isHotTrack ? '#EF4444' : isTopRequest ? '#10B981' : songBorderColor,
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {/* Gradient overlay for locked/hot tracks */}
              {(request.isLocked || isHotTrack || isTopRequest) && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    background: request.isLocked
                      ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), transparent)'
                      : isHotTrack
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), transparent)'
                      : 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), transparent)'
                  }}
                />
              )}

              <div className="relative p-4 flex items-center gap-3">
                {/* Album Art */}
                <AlbumArtDisplay
                  albumArtUrl={request.albumArtUrl}
                  title={request.title}
                  size="sm"
                  imageStyle={{
                    boxShadow: `0 0 10px ${songBorderColor}30`,
                    border: `2px solid ${songBorderColor}40`
                  }}
                />

                {/* Song Info and Stats */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">{request.title}</h3>
                  {request.artist && (
                    <p className="text-gray-300 text-sm truncate mb-2">{request.artist}</p>
                  )}

                  {/* Compact Stats Row */}
                  <div className="flex items-center gap-4 text-xs">
                    {/* Status Badge */}
                    {request.isLocked ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 text-yellow-300 rounded-full font-bold">
                        <Crown className="w-3 h-3" />
                        <span>Next Up</span>
                      </div>
                    ) : isHotTrack ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-300 rounded-full font-bold">
                        <Zap className="w-3 h-3" />
                        <span>Hot</span>
                      </div>
                    ) : isTopRequest ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600/20 text-green-300 rounded-full font-bold">
                        <Crown className="w-3 h-3" />
                        <span>Top</span>
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded-full font-medium">
                        #{index + 1}
                      </div>
                    )}

                    {/* Requesters */}
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="w-3 h-3" />
                      <span>{requesters.length}</span>
                    </div>

                    {/* Votes */}
                    <div className="flex items-center gap-1 text-gray-400">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{votes}</span>
                    </div>

                    {/* Main Requester */}
                    {mainRequester && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        {mainRequester.photo ? (
                          <img
                            src={mainRequester.photo}
                            alt={mainRequester.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-4 h-4" />
                        )}
                        <span className="truncate max-w-[100px]">{mainRequester.name}</span>
                        {additionalCount > 0 && (
                          <span>+{additionalCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vote Button - Compact Design */}
                <div className="flex-shrink-0">
                  {request.id.startsWith('temp_') ? (
                    <div className="px-4 py-2 rounded-lg bg-gray-700/50 text-gray-400 flex items-center gap-2 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      <span>Processing</span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleVote(request.id, e)}
                      disabled={isVoting || request.isLocked}
                      className={`px-4 py-2 rounded-lg font-extrabold tracking-wide uppercase text-sm transition-all transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center gap-2 whitespace-nowrap ${
                        request.isLocked || isVoting
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'text-white shadow-lg'
                      }`}
                      style={
                        !request.isLocked && !isVoting
                          ? {
                              backgroundColor: accentColor,
                              textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.3)',
                              boxShadow: `0 4px 15px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                              border: `1px solid rgba(255,255,255,0.1)`,
                              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
                            }
                          : {}
                      }
                    >
                      {isVoting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Voting</span>
                        </>
                      ) : request.isLocked ? (
                        <>
                          <Crown className="w-4 h-4" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-4 h-4" />
                          <span>Vote</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}