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
  const { settings } = useUiSettings();
  const songCardColor = settings?.song_card_color || settings?.frontend_accent_color || '#ff00ff';
  const songCardGradient = settings?.song_card_use_gradient
    ? `linear-gradient(90deg, ${settings.song_card_gradient_start} 0%, ${settings.song_card_gradient_end} 100%)`
    : null;
  const accentColor = settings?.frontend_accent_color || '#ff00ff';
  const secondaryColor = settings?.frontend_secondary_accent || '#9d00ff';

  // Debug logging - remove after testing
  useEffect(() => {
    console.log('🎨 Song Card Debug:', {
      useGradient: settings?.song_card_use_gradient,
      gradientStart: settings?.song_card_gradient_start,
      gradientEnd: settings?.song_card_gradient_end,
      solidColor: songCardColor,
      finalGradient: songCardGradient,
      settingsObject: settings
    });
  }, [settings, songCardColor, songCardGradient]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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
    <div 
      ref={containerRef}
      className="grid gap-2 w-full relative p-4"
    >
      {songs.map((song) => {
        const songKey = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
        const engagement = songEngagement.get(songKey) || 0;
        const isHot = engagement >= 5;

        return (
          <button
            key={song.id}
            onClick={() => onSongSelect(song)}
            className="w-full text-left relative group"
          >
            <div
              className={`glass-effect rounded-lg p-4 transition-all duration-300 relative overflow-hidden h-[88px] flex items-center ${
                isHot ? 'ring-2 ring-red-400/50' : ''
              }`}
              style={{
                border: songCardGradient && !isHot ? '2px solid transparent' : '1px solid',
                borderColor: !songCardGradient && !isHot ? accentColor : (isHot ? '#EF4444' : undefined),
                backgroundImage: songCardGradient && !isHot
                  ? `linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)), ${songCardGradient}`
                  : `linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)), linear-gradient(to right, ${songCardColor}60, ${songCardColor}10)`,
                backgroundOrigin: songCardGradient && !isHot ? 'border-box' : undefined,
                backgroundClip: songCardGradient && !isHot ? 'padding-box, border-box' : undefined,
                boxShadow: isHot ? `0 0 12px rgba(239, 68, 68, 0.3)` : `0 0 8px ${accentColor}50`,
              }}
            >
            {/* Hot gradient overlay */}
            {isHot && (
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), transparent)'
                }}
              />
            )}

            {/* Full card glassy reflection effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(
                    135deg,
                    transparent 0%,
                    rgba(255, 255, 255, 0.02) 15%,
                    rgba(255, 255, 255, 0.05) 30%,
                    rgba(255, 255, 255, 0.08) 45%,
                    rgba(255, 255, 255, 0.05) 60%,
                    rgba(255, 255, 255, 0.02) 75%,
                    transparent 100%
                  )
                `,
                transform: `translateX(${-50 + scrollProgress}%)`,
                transition: 'transform 1s ease-out',
                opacity: 0.4,
              }}
            />

            <div className="relative flex items-center gap-3 w-full">
              {song.albumArtUrl ? (
                <img
                  src={song.albumArtUrl}
                  alt={`${song.title} album art`}
                  className="w-12 h-12 object-cover rounded-md neon-border flex-shrink-0"
                  style={{ boxShadow: `0 0 10px ${songCardColor}30` }}
                  onError={(e) => {
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
                  <Music4 className="w-6 h-6" style={{ color: accentColor }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white truncate">{song.title}</h3>
                  {isHot && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-300 rounded-full font-bold text-xs flex-shrink-0">
                      <Zap className="w-3 h-3" />
                      <span>Hot</span>
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm truncate">{song.artist}</p>
                {song.genre && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {song.genre.split(',').slice(0, 2).map((genre, index) => (
                      <span
                        key={index}
                        className="px-1.5 py-0.5 text-xs rounded-full truncate"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
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
                  className="px-3 py-1.5 rounded-lg text-white transition-all duration-200 whitespace-nowrap text-sm font-extrabold tracking-wide uppercase transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: accentColor,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.3)',
                    boxShadow: `0 4px 15px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
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