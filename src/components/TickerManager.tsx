import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Type, Music } from 'lucide-react';
import { useUiSettings } from '../hooks/useUiSettings';

interface TickerManagerProps {
  nextSong?: {
    title: string;
    artist?: string;
  };
  isActive: boolean;
  customMessage: string;
  onUpdateMessage: (message: string) => void;
  onToggleActive: () => void;
}

export function TickerManager({ 
  nextSong, 
  isActive, 
  customMessage, 
  onUpdateMessage, 
  onToggleActive 
}: TickerManagerProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localMessage, setLocalMessage] = useState(customMessage);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { updateSettings } = useUiSettings();

  // Sync localMessage when customMessage prop changes from external sources
  useEffect(() => {
    setLocalMessage(customMessage);
  }, [customMessage]);

  // Handle input changes - LOCAL ONLY, no auto-saving
  const handleInputChange = (newValue: string) => {
    // Only update local state - no database updates
    setLocalMessage(newValue);
  };

  const handleToggleActive = async () => {
    try {
      setIsUpdating(true);
      
      if (isActive) {
        // STOPPING: Clear everything
        setLocalMessage('');
        onUpdateMessage('');
        onToggleActive();
        
        // Clear in database
        await updateSettings({
          custom_message: '',
          ticker_active: false,
          updated_at: new Date().toISOString()
        });
      } else {
        // STARTING: Send the message and activate
        if (localMessage.trim()) {
          // Update parent state with the current message
          onUpdateMessage(localMessage);
          onToggleActive();
          
          // Send to database
          await updateSettings({
            custom_message: localMessage,
            ticker_active: true,
            updated_at: new Date().toISOString()
          });
        } else {
          console.warn('Cannot activate ticker without a custom message');
        }
      }
    } catch (error) {
      console.error('Error toggling custom message:', error);
      // Revert on error
      setLocalMessage(customMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const clearMessage = async () => {
    try {
      setIsUpdating(true);
      
      // Clear everything immediately
      setLocalMessage('');
      onUpdateMessage('');
      if (isActive) {
        onToggleActive();
      }
      
      // Clear in database
      await updateSettings({
        custom_message: '',
        ticker_active: false,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing message:', error);
      // Revert on error
      setLocalMessage(customMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold neon-text">Ticker Management</h2>
        <div className="flex items-center space-x-2">
          {/* Clear Message Button */}
          {(localMessage.trim() || isActive) && (
            <button
              onClick={clearMessage}
              disabled={isUpdating}
              className="neon-button bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-3 py-1 text-sm"
            >
              {isUpdating ? 'Clearing...' : 'Clear Message'}
            </button>
          )}
          
          {/* Start/Stop Button */}
          <button
            onClick={handleToggleActive}
            disabled={isUpdating || (!isActive && !localMessage.trim())}
            className={`neon-button flex items-center disabled:opacity-50 px-3 py-1 text-sm ${
              isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isUpdating ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : isActive ? (
              <>
                <Pause className="w-3 h-3 mr-2" />
                Stop Custom Message
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-2" />
                Start Custom Message
              </>
            )}
          </button>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-3 space-y-4">
        <div>
          <h3 className="text-base font-medium text-white mb-2">Current Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <div className="flex items-center space-x-2 mb-1">
                <Music className="w-4 h-4 text-neon-pink" />
                <span className="font-medium text-white text-sm">Next Song</span>
              </div>
              {nextSong ? (
                <p className="text-gray-300 text-sm">
                  {nextSong.title}
                  {nextSong.artist && <span className="text-gray-400"> by {nextSong.artist}</span>}
                </p>
              ) : (
                <p className="text-gray-400 italic text-sm">No song locked</p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <div className="flex items-center space-x-2 mb-1">
                <Type className="w-4 h-4 text-neon-pink" />
                <span className="font-medium text-white text-sm">Custom Message</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                <p className={`${isActive ? 'text-green-400' : 'text-gray-400'} text-sm`}>
                  {isActive ? 'Active' : 'Inactive'}
                </p>
                {isUpdating && (
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Custom Message
          </label>
          <div className="space-y-1.5">
            <textarea
              value={localMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter a custom message to display in the ticker..."
              className="w-full px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-pink disabled:opacity-50 text-sm"
              rows={2}
              disabled={isUpdating}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Type your message, then click "Start Custom Message" to send it live
              </p>
              <p className="text-[11px] text-gray-500">
                {localMessage.length} characters
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-neon-pink hover:text-white transition-colors text-sm"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          
          {showPreview && (
            <div className="mt-2 p-3 rounded-lg bg-darker-purple border border-neon-purple/20">
              <p className="text-white text-sm mb-1">
                <strong>Ticker will display:</strong>
              </p>
              <p className="text-white" style={{
                fontSize: `${localMessage.length > 60 ? '12px' : localMessage.length > 30 ? '14px' : '16px'}`,
                fontStyle: (!isActive || !localMessage) ? 'italic' : 'normal',
                color: (!isActive || !localMessage) ? '#9ca3af' : 'white'
              }}>
                {isActive && customMessage ? customMessage : (localMessage && !isActive ? 
                  `Preview: ${localMessage}` : (nextSong
                  ? `🎵 Coming Up Next: ${nextSong.title}${nextSong.artist ? ` by ${nextSong.artist}` : ''} 🎵`
                  : 'No content to display')
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}