import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { useUiSettings } from '../../hooks/useUiSettings';
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
  const [triedFallback, setTriedFallback] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const { settings } = useUiSettings();
  const accentColor = settings?.frontend_accent_color || '#ff00ff';

  // If song is provided, use its properties
  const rawUrl = song?.albumArtUrl || albumArtUrl;
  const displayTitle = song?.title || title || 'Album Art';

  // Set URL when rawUrl changes - use as-is without transformation
  useEffect(() => {
    // Don't transform URL - use as-is to avoid CORS/availability issues with different sizes
    // iTunes URLs are stored with a specific size and that size should work
    setCurrentUrl(rawUrl);
    setImageLoadError(false);
    setImageLoaded(false);
    setTriedFallback(false);
  }, [rawUrl]);

  const displayUrl = currentUrl;

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
    // If we haven't tried fallback yet and it's an iTunes URL, try different size
    if (!triedFallback && rawUrl && rawUrl.includes('mzstatic.com')) {
      // Try different sizes as fallback: 300x300 -> 200x200 -> 100x100
      const currentSize = rawUrl.match(/\/(\d+)x\d+bb\.jpg$/)?.[1];
      let fallbackUrl = rawUrl;

      if (currentSize === '600' || currentSize === '300') {
        fallbackUrl = rawUrl.replace(/\/\d+x\d+bb\.jpg$/, '/200x200bb.jpg');
      } else if (currentSize === '200') {
        fallbackUrl = rawUrl.replace(/\/\d+x\d+bb\.jpg$/, '/100x100bb.jpg');
      }

      if (fallbackUrl !== rawUrl) {
        setTriedFallback(true);
        setCurrentUrl(fallbackUrl);
        return; // Don't set error yet, try fallback first
      }
    }

    // Only log at debug level to reduce console noise
    console.debug('Album art unavailable:', displayTitle);
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
        referrerPolicy="no-referrer"
      />
    </div>
  );
}