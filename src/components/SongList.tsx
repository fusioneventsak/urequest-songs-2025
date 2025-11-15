import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUiSettings } from '../hooks/useUiSettings';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import type { Song, SongRequest } from '../types';
import { Music4, Zap } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  requests?: SongRequest[];
  onSongSelect: (song: Song) => void;
}

export function SongList({ songs, requests = [], onSongSelect }: SongListProps) {
  // Note: Colors now use CSS variables set at root for performance
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const currentScroll = window.scrollY;
            const progress = (currentScroll / maxScroll) * 100;
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {songs.map((song, index) => {
        const songKey = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
        const engagement = songEngagement.get(songKey) || 0;
        const isHot = engagement >= 5;

        // Simplified styles for older iPad compatibility - using CSS variables for performance
        const cardBorder = isHot ? '2px solid #EF4444' : '1px solid var(--accent-color)';
        const cardBackground = isHot
          ? 'linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))'
          : 'linear-gradient(to right, var(--song-card-color-60), var(--song-card-color-10))';
        const cardShadow = isHot ? '0 0 8px rgba(239, 68, 68, 0.3)' : '0 0 6px var(--accent-color-40)';

        // Eager load first 10 images (optimized for older devices), lazy load the rest
        const loadingStrategy = index < 10 ? 'eager' : 'lazy';
        // Sync decoding for eager images (decode immediately), async for lazy (decode on-demand)
        const decodingStrategy = index < 10 ? 'sync' : 'async';

        return (
          <button
            key={index}
            onClick={() => onSongSelect(song)}
            className="w-full text-left relative group mb-1.5 px-3"
          >
          <div
            className="glass-effect rounded-lg p-3 relative overflow-hidden flex items-center"
            style={{
              border: cardBorder,
              background: cardBackground,
              boxShadow: cardShadow,
              minHeight: '72px'
            }}
          >

            <div className="relative flex items-center gap-3 w-full">
              {song.albumArtUrl ? (
                <img
                  src={song.albumArtUrl.replace('/default.jpg', '/w_48,h_48,c_fill,q_50/default.jpg')}
                  alt=""
                  loading={loadingStrategy}
                  decoding={decodingStrategy}
                  width="48"
                  height="48"
                  className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  style={{
                    boxShadow: '0 0 8px var(--song-card-color-30)',
                    imageRendering: 'auto',
                    willChange: 'auto'
                  }}
                  onError={(e) => {
                    // If thumbnail fails, try original URL
                    if (e.currentTarget.src.includes('w_48')) {
                      e.currentTarget.src = song.albumArtUrl;
                      return;
                    }
                    // Otherwise show fallback icon
                    e.currentTarget.style.display = 'none';
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      const fallback = document.createElement('div');
                      fallback.className = "w-12 h-12 rounded-md flex items-center justify-center bg-neon-purple/20 flex-shrink-0";
                      fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
                      container.prepend(fallback);
                    }
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
                    {song.genre.split(',').slice(0, 2).map((genre, index) => (
                      <span
                        key={index}
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
      })}

      {songs.length === 0 && (
        <div className="text-center p-8 text-gray-400">
          No songs available to request
        </div>
      )}
    </div>
  );
}