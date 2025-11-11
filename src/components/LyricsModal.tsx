import React, { useEffect, useState, useRef } from 'react';
import { X, Music2, Loader2, AlertCircle, Plus, Minus, Play, Pause } from 'lucide-react';
import { searchLyrics, type LRCLIBLyrics } from '../services/lyricsService';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackName: string;
  artistName: string;
}

export function LyricsModal({ isOpen, onClose, trackName, artistName }: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<LRCLIBLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18); // Default font size
  const [scrollSpeed, setScrollSpeed] = useState(30); // Pixels per second (10-100 range, adjustable for singers)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollSpeedRef = useRef(scrollSpeed); // Ref to avoid animation restarts on speed changes
  const scrollAccumulatorRef = useRef(0); // Accumulate fractional pixels for smooth slow scrolling

  // Sync scrollSpeed state to ref (doesn't cause animation restarts)
  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  // Fetch lyrics when modal opens
  useEffect(() => {
    if (isOpen && trackName && artistName) {
      fetchLyrics();
    }
  }, [isOpen, trackName, artistName]);

  const fetchLyrics = async () => {
    setLoading(true);
    setError(null);
    setLyrics(null);

    try {
      const result = await searchLyrics(trackName, artistName);

      if (result) {
        setLyrics(result);

        // Check if it's instrumental or has no lyrics
        if (result.instrumental) {
          setError('This is an instrumental track (no lyrics available)');
        } else if (!result.plainLyrics && !result.syncedLyrics) {
          setError('Lyrics not found for this song');
        }
      } else {
        setError('Lyrics not found for this song');
      }
    } catch (err) {
      console.error('Error fetching lyrics:', err);
      setError('Failed to fetch lyrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scrolling effect using requestAnimationFrame for smooth, reliable scrolling
  useEffect(() => {
    if (!isAutoScrolling || !lyricsContainerRef.current) {
      // Cancel any ongoing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const container = lyricsContainerRef.current;
    scrollAccumulatorRef.current = 0; // Reset accumulator when starting
    lastScrollTimeRef.current = performance.now();

    const scroll = (currentTime: number) => {
      if (!lyricsContainerRef.current || !isAutoScrolling) {
        return;
      }

      const deltaTime = currentTime - lastScrollTimeRef.current;

      // Only update if enough time has passed (at least 16ms for ~60fps)
      if (deltaTime < 16) {
        animationFrameRef.current = requestAnimationFrame(scroll);
        return;
      }

      // Dynamic scroll speed based on user setting (using ref to avoid restarts)
      // scrollSpeedRef.current is pixels per second, convert to pixels per frame
      const currentSpeed = scrollSpeedRef.current;
      const scrollAmount = (deltaTime * currentSpeed) / 1000;

      // Accumulate fractional pixels for smooth slow scrolling
      scrollAccumulatorRef.current += scrollAmount;

      const container = lyricsContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      // Check if we've reached the bottom (within 10 pixels)
      if (scrollTop >= maxScroll - 10) {
        // Reset to top instantly
        container.scrollTop = 0;
        scrollAccumulatorRef.current = 0; // Reset accumulator
        lastScrollTimeRef.current = currentTime;
      } else {
        // Only scroll when we have at least 0.5 pixels accumulated for smooth rendering
        if (scrollAccumulatorRef.current >= 0.5) {
          const pixelsToScroll = Math.round(scrollAccumulatorRef.current);
          container.scrollTop += pixelsToScroll;
          scrollAccumulatorRef.current -= pixelsToScroll; // Keep fractional remainder
        }
        lastScrollTimeRef.current = currentTime;
      }

      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(scroll);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isAutoScrolling]); // Only isAutoScrolling - speed changes via ref don't restart animation

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      // Animation cleanup is handled by the auto-scroll useEffect
      // Don't setIsAutoScrolling(false) here - it causes spurious stops
    };
  }, [isOpen, onClose]);

  // Font size controls
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 32)); // Max 32px
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12)); // Min 12px
  };

  const toggleAutoScroll = () => {
    setIsAutoScrolling(prev => !prev);
  };

  const increaseScrollSpeed = () => {
    setScrollSpeed(prev => Math.min(prev + 5, 100));
  };

  const decreaseScrollSpeed = () => {
    setScrollSpeed(prev => Math.max(prev - 5, 10));
  };

  if (!isOpen) return null;

  // Use plain lyrics, fallback to synced lyrics without timestamps
  const displayLyrics = lyrics?.plainLyrics || lyrics?.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '').trim();

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex flex-col bg-gradient-to-br from-purple-900/95 to-pink-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-purple-900 to-pink-900 border-b border-neon-pink/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Music2 className="w-8 h-8 text-neon-pink flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-bold text-white truncate">
                  {trackName}
                </h2>
                <p className="text-xl text-gray-300 truncate">
                  {artistName}
                </p>
              </div>
            </div>

            {/* Controls on the right */}
            <div className="flex items-center gap-3 ml-6">
              {/* Font Size Controls */}
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                <button
                  onClick={decreaseFontSize}
                  className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded transition-all text-white"
                  title="Decrease Text Size"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-white text-sm font-medium w-8 text-center">{fontSize}</span>
                <button
                  onClick={increaseFontSize}
                  className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded transition-all text-white"
                  title="Increase Text Size"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Scroll Speed Controls */}
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                <button
                  onClick={decreaseScrollSpeed}
                  className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded transition-all text-white disabled:opacity-50"
                  title="Decrease Scroll Speed"
                  disabled={scrollSpeed <= 10}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-white text-xs font-medium w-10 text-center">
                  {scrollSpeed}px/s
                </span>
                <button
                  onClick={increaseScrollSpeed}
                  className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded transition-all text-white disabled:opacity-50"
                  title="Increase Scroll Speed"
                  disabled={scrollSpeed >= 100}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Auto-Scroll Toggle */}
              <button
                onClick={toggleAutoScroll}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isAutoScrolling
                    ? 'bg-neon-pink text-white shadow-glow'
                    : 'bg-black/30 text-white hover:bg-black/50'
                }`}
                title={isAutoScrolling ? 'Stop Auto-Scroll' : 'Start Auto-Scroll'}
              >
                {isAutoScrolling ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span className="text-sm font-medium">Scrolling</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span className="text-sm font-medium">Auto-Scroll</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto p-8"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-white">
              <Loader2 className="w-12 h-12 animate-spin text-neon-pink mb-4" />
              <p className="text-lg">Fetching lyrics...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-400 mb-4" />
              <p className="text-lg text-white mb-2">{error}</p>
              <p className="text-sm text-gray-400">
                Lyrics are provided by LRCLIB, a community-driven database.
              </p>
            </div>
          )}

          {displayLyrics && !loading && !error && (
            <div className="bg-black/20 rounded-lg p-8 border border-neon-purple/10 max-w-4xl mx-auto">
              <pre
                className="text-white leading-relaxed whitespace-pre-wrap font-sans text-center"
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
              >
                {displayLyrics}
              </pre>
            </div>
          )}

          {/* Album info if available */}
          {lyrics && lyrics.albumName && !loading && (
            <div className="mt-8 pt-6 border-t border-neon-purple/20 max-w-4xl mx-auto">
              <p className="text-lg text-gray-400 text-center">
                Album: <span className="text-white font-medium">{lyrics.albumName}</span>
              </p>
            </div>
          )}

          {/* Attribution */}
          {lyrics && !loading && (
            <div className="mt-8 pt-6 border-t border-neon-purple/20 max-w-4xl mx-auto">
              <p className="text-sm text-gray-500 text-center">
                Lyrics provided by <a href="https://lrclib.net" target="_blank" rel="noopener noreferrer" className="text-neon-pink hover:underline">LRCLIB</a>
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button - Large floating button for easy tapping */}
        <button
          onClick={onClose}
          className="fixed bottom-6 right-6 md:hidden p-4 bg-neon-pink hover:bg-pink-600 rounded-full transition-all text-white shadow-glow z-50"
          aria-label="Close Lyrics"
        >
          <X className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
