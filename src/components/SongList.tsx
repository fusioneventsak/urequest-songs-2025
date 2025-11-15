import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { useUiSettings } from '../hooks/useUiSettings';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import type { Song, SongRequest } from '../types';
import { Music4, Zap } from 'lucide-react';

// Memoized song card component to prevent unnecessary re-renders
const SongCard = memo(({
  song,
  index,
  isHot,
  preloadEnd,
  onSongSelect
}: {
  song: Song;
  index: number;
  isHot: boolean;
  preloadEnd: number;
  onSongSelect: (song: Song) => void;
}) => {
  const cardBorder = isHot ? '2px solid #EF4444' : '1px solid var(--accent-color)';
  const cardBackground = isHot
    ? 'linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))'
    : 'linear-gradient(to right, var(--song-card-color-60), var(--song-card-color-10))';
  const cardShadow = isHot ? '0 0 8px rgba(239, 68, 68, 0.3)' : '0 0 6px var(--accent-color-40)';

  const loadingStrategy = index < preloadEnd ? 'eager' : 'lazy';
  const decodingStrategy = index < preloadEnd ? 'sync' : 'async';
  const fetchPriority = index < preloadEnd ? 'high' : 'low';

  return (
    <button
      onClick={() => onSongSelect(song)}
      className="w-full text-left relative group mb-1.5"
    >
      <div
        className="glass-effect rounded-lg p-3 relative overflow-hidden flex items-center"
        style={{
          border: cardBorder,
          background: cardBackground,
          boxShadow: cardShadow,
          minHeight: '72px',
          willChange: 'auto',
          contain: 'layout style paint'
        }}
      >
        <div className="relative flex items-center gap-3 w-full">
          {song.albumArtUrl ? (
            <img
              src={song.albumArtUrl.replace('/default.jpg', '/w_16,h_16,c_fill,q_5/default.jpg')}
              alt=""
              loading={loadingStrategy}
              decoding={decodingStrategy}
              fetchPriority={fetchPriority as 'high' | 'low'}
              width="48"
              height="48"
              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
              style={{
                boxShadow: '0 0 8px var(--song-card-color-30)',
                imageRendering: 'auto',
                willChange: 'auto'
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-md flex items-center justify-center bg-neon-purple/20 flex-shrink-0">
              <Music4 className="w-6 h-6" style={{ color: 'var(--accent-color)' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate text-xl">{song.title}</h3>
              {isHot && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-300 rounded-full font-bold text-xs flex-shrink-0">
                  <Zap className="w-3 h-3" />
                  <span>Hot</span>
                </span>
              )}
            </div>
            <p className="text-gray-300 text-lg truncate">{song.artist}</p>
            {song.genre && (
              <div className="flex flex-wrap gap-1 mt-1">
                {song.genre.split(',').slice(0, 2).map((genre, genreIndex) => (
                  <span
                    key={genreIndex}
                    className="px-1.5 py-0.5 text-xs rounded-full truncate"
                    style={{
                      backgroundColor: 'var(--accent-color-20)',
                      color: 'var(--accent-color)',
                    }}
                  >
                    {genre.trim()}
                  </span>
                ))}
                {song.genre.split(',').length > 2 && (
                  <span className="text-xs text-gray-400">+{song.genre.split(',').length - 2}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <div
              className="px-4 py-2 rounded-lg text-white transition-all duration-200 whitespace-nowrap text-base font-extrabold tracking-wide uppercase transform hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--accent-color)',
                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.3)',
                boxShadow: '0 4px 15px var(--accent-color-40), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-color-dd))'
              }}
            >
              REQUEST
            </div>
          </div>
        </div>
      </div>
    </button>
  );
});

interface SongListProps {
  songs: Song[];
  requests?: SongRequest[];
  onSongSelect: (song: Song) => void;
}

export function SongList({ songs, requests = [], onSongSelect }: SongListProps) {
  // Note: Colors now use CSS variables set at root for performance
  const containerRef = useRef<HTMLDivElement>(null);
  const [preloadEnd, setPreloadEnd] = useState(100); // Start with 100, expand as user scrolls

  // Set up aggressive lazy loading with large viewport margin for fast scrolling
  useEffect(() => {
    // Only run on browsers that support loading attribute
    if ('loading' in HTMLImageElement.prototype) {
      // Modern browsers handle this natively, but we can hint with CSS
      const style = document.createElement('style');
      style.textContent = `
        img[loading="lazy"] {
          content-visibility: auto;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Calculate engagement for each song based on active requests
  const songEngagement = useMemo(() => {
    const engagement = new Map<string, number>();

    requests.forEach(request => {
      if (request.isPlayed) return; // Skip played requests

      const songKey = `${request.title.toLowerCase().trim()}|${(request.artist || '').toLowerCase().trim()}`;
      const requesters = Array.isArray(request.requesters) ? request.requesters : [];
      const totalEngagement = (request.votes || 0) + requesters.length;

      const current = engagement.get(songKey) || 0;
      engagement.set(songKey, current + totalEngagement);
    });

    return engagement;
  }, [requests]);

  // Dynamically preload images based on scroll position
  useEffect(() => {
    const preloadLinks: HTMLLinkElement[] = [];

    // Preload images up to preloadEnd with high priority
    songs.slice(0, preloadEnd).forEach((song) => {
      if (song.albumArtUrl) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = song.albumArtUrl.replace('/default.jpg', '/w_16,h_16,c_fill,q_5/default.jpg');
        // High priority hint for browser
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
        preloadLinks.push(link);
      }
    });

    // Cleanup on unmount or when preloadEnd changes
    return () => {
      preloadLinks.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [songs, preloadEnd]);

  // Detect scrolling and expand preload range
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const windowHeight = window.innerHeight;
          const scrollableHeight = document.documentElement.scrollHeight;

          // Calculate scroll percentage for preloading
          const scrollPercent = (scrollTop + windowHeight) / scrollableHeight;

          // When user scrolls past 60%, preload next 50 images
          if (scrollPercent > 0.6 && preloadEnd < songs.length) {
            setPreloadEnd(prev => Math.min(prev + 50, songs.length));
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [songs.length, preloadEnd]);


  return (
    <div ref={containerRef} className="w-full">
      {songs.map((song, index) => {
        const songKey = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
        const engagement = songEngagement.get(songKey) || 0;
        const isHot = engagement >= 5;

        return (
          <SongCard
            key={`${song.title}-${song.artist}-${index}`}
            song={song}
            index={index}
            isHot={isHot}
            preloadEnd={preloadEnd}
            onSongSelect={onSongSelect}
          />
        );
      })}

      {songs.length === 0 && (
        <div className="text-center p-8 text-gray-400">
          No songs available to request
        </div>
      )}
    </div>
  );
}