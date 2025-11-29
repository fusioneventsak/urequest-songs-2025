import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { useUiSettings } from '../../hooks/useUiSettings';
import { getOptimizedAlbumArtUrl, type AlbumArtSize } from '../../utils/albumArt';
import type { Song } from '../../types';

interface AlbumArtDisplayProps {
  albumArtUrl?: string;
  title?: string;
  size?: 'xs' | 'sm' | 'medium' | 'lg';
  imageClassName?: string;
  imageStyle?: React.CSSProperties;
  song?: Song;
  className?: string;
}

export function AlbumArtDisplay({
  albumArtUrl,
  title,
  size = 'medium',
  imageClassName = '',
  imageStyle = {},
  song,
  className = ''
}: AlbumArtDisplayProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [optimizedUrl, setOptimizedUrl] = useState<string | undefined>(undefined);
  const { settings } = useUiSettings();
  const accentColor = settings?.frontend_accent_color || '#ff00ff';

  // If song is provided, use its properties
  const rawUrl = song?.albumArtUrl || albumArtUrl;
  const displayTitle = song?.title || title || 'Album Art';

  // Map component sizes to AlbumArtSize
  const sizeMap: Record<string, AlbumArtSize> = {
    xs: 'thumbnail',
    sm: 'small',
    medium: 'medium',
    lg: 'large'
  };

  // Optimize the URL when rawUrl or size changes
  useEffect(() => {
    const optimized = getOptimizedAlbumArtUrl(rawUrl, sizeMap[size]);
    setOptimizedUrl(optimized);
    setImageLoadError(false);
    setImageLoaded(false);
  }, [rawUrl, size]);

  const displayUrl = optimizedUrl;

  // Size configurations
  const sizeClasses = {
    xs: 'w-14 h-14',
    sm: 'w-12 h-12',
    medium: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-6 h-6',
    medium: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('🖼️ Album art failed to load:', {
      url: displayUrl,
      title: displayTitle,
      rawUrl: rawUrl,
      optimizedUrl: optimizedUrl,
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight
    });
    setImageLoadError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show fallback if no URL provided or image failed to load
  if (!displayUrl || imageLoadError) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-md flex items-center justify-center bg-neon-purple/20 flex-shrink-0 ${className}`}
        style={{
          boxShadow: `0 0 10px ${accentColor}30`,
          ...imageStyle
        }}
      >
        <Music 
          className={`${iconSizes[size]}`}
          style={{ color: accentColor }}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Loading skeleton - shown while image loads */}
      {!imageLoaded && (
        <div
          className={`absolute inset-0 rounded-md bg-neon-purple/20 animate-pulse flex items-center justify-center`}
          style={{
            boxShadow: `0 0 10px ${accentColor}30`,
          }}
        >
          <Music
            className={`${iconSizes[size]} opacity-30`}
            style={{ color: accentColor }}
          />
        </div>
      )}

      {/* Actual image with lazy loading */}
      <img
        src={displayUrl}
        alt={`${displayTitle} album art`}
        className={`${sizeClasses[size]} object-cover rounded-md flex-shrink-0 ${imageClassName} ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
        style={{
          boxShadow: `0 0 10px ${accentColor}30`,
          ...imageStyle
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
}