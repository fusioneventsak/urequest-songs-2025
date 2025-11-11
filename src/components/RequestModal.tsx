import React, { useState, useCallback, useRef } from 'react';
import { X, AlertTriangle, Music, User } from 'lucide-react';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import type { Song, User as UserType } from '../types';
import { usePhotoStorage } from '../hooks/usePhotoStorage';
import { useUiSettings } from '../hooks/useUiSettings';
import toast from 'react-hot-toast';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  onSubmit: (data: any) => Promise<boolean>;
  currentUser: UserType;
}

export function RequestModal({
  isOpen,
  onClose,
  song,
  onSubmit,
  currentUser
}: RequestModalProps) {
  const { getDefaultAvatar } = usePhotoStorage();
  const { settings } = useUiSettings();
  const accentColor = settings?.frontend_accent_color || '#ff00ff';
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submitAttemptRef = useRef<boolean>(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setMessage('');
      setError(null);
      setIsSubmitting(false);
      submitAttemptRef.current = false;
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submissions
    if (isSubmitting || submitAttemptRef.current) {
      return;
    }

    submitAttemptRef.current = true;
    setIsSubmitting(true);
    setError(null);

    // Set a timeout to prevent hanging requests
    submitTimeoutRef.current = setTimeout(() => {
      if (isSubmitting) {
        setError('Request is taking too long. Please try again.');
        setIsSubmitting(false);
        submitAttemptRef.current = false;
      }
    }, 10000); // 10 second timeout

    try {
      // Validate user data
      if (!currentUser?.name?.trim()) {
        throw new Error('User name is required');
      }
      
      // Validate and clean message
      const cleanMessage = message.trim();
      if (cleanMessage.length > 100) {
        throw new Error('Message must be 100 characters or less');
      }
      
      const requestData = {
        title: song.title.trim(),
        artist: song.artist?.trim() || '',
        albumArtUrl: song.albumArtUrl,
        requestedBy: currentUser.name.trim(),
        userPhoto: currentUser.photo || getDefaultAvatar(currentUser.name),
        message: cleanMessage,
        userId: currentUser.id || currentUser.name
      };

      console.log("Submitting request:", { title: requestData.title, artist: requestData.artist });
      
      const success = await onSubmit(requestData);

      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }

      if (success) {
        toast.success('Request submitted successfully!');
        setMessage('');
        onClose();
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error in request modal:', error);
      
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      
      let errorMessage = 'Failed to submit request. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'Too many requests. Please try again in a moment.';
        } else if (error.message.includes('duplicate') || error.message.includes('already requested')) {
          errorMessage = 'This song has already been requested. Your vote has been added!';
        } else if (error.message.includes('User name is required')) {
          errorMessage = 'Please provide your name before submitting a request.';
        } else if (error.message.includes('100 characters')) {
          errorMessage = 'Message must be 100 characters or less.';
        } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      submitAttemptRef.current = false;
    }
  }, [song, currentUser, message, onSubmit, onClose, getDefaultAvatar, isSubmitting]);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return; // Don't allow closing while submitting
    }
    setMessage('');
    setError(null);
    onClose();
  }, [isSubmitting, onClose]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setMessage(value);
      if (error) setError(null);
    }
  }, [error]);

  if (!isOpen) return null;

  const remainingChars = 100 - message.length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* User Info - Small at Top */}
          <div className="flex items-center space-x-2 text-sm">
            {currentUser.photo ? (
              <img
                src={currentUser.photo}
                alt={`${currentUser.name}'s photo`}
                className="w-8 h-8 rounded-full object-cover border-2"
                style={{ borderColor: accentColor }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                style={{
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                  opacity: 0.8
                }}
              >
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Requesting as</span>
              <span className="text-white font-medium">{currentUser.name}</span>
            </div>
          </div>

          {/* Main Feature: Song Display */}
          <div className="space-y-4">
            <h3 className="text-center text-xl font-bold text-white">
              You Are Requesting
            </h3>

            <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex-shrink-0">
                  <AlbumArtDisplay
                    song={song}
                    size="medium"
                    className="rounded-lg shadow-lg"
                  />
                </div>
                <div className="text-center w-full">
                  <h3 className="font-bold text-white text-2xl mb-2">
                    {song.title}
                  </h3>
                  {song.artist && (
                    <p className="text-gray-300 text-lg mb-1">by {song.artist}</p>
                  )}
                  {song.genre && (
                    <p className="text-gray-400 text-sm">{song.genre}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium text-gray-300">
              Optional Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={handleMessageChange}
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

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium text-sm">Error</h4>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !currentUser?.name?.trim()}
            className="w-full text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2"
            style={{
              background: isSubmitting || !currentUser?.name?.trim()
                ? 'linear-gradient(to right, #4b5563, #4b5563)'
                : `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
              opacity: isSubmitting || !currentUser?.name?.trim() ? 0.5 : 1,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5)',
              boxShadow: isSubmitting || !currentUser?.name?.trim()
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
  );
}