import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface EnlargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'photo' | 'message';
  content: string;
  userName?: string;
}

export function EnlargeModal({ isOpen, onClose, type, content, userName }: EnlargeModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] overflow-auto bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-2xl shadow-2xl border border-neon-pink/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {type === 'photo' ? (
          <div className="p-6">
            {userName && (
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                {userName}'s Photo
              </h3>
            )}
            <div className="flex items-center justify-center">
              <img
                src={content}
                alt={userName ? `${userName}'s photo` : 'User photo'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                style={{
                  boxShadow: '0 0 40px rgba(255, 0, 255, 0.3)'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-8">
            {userName && (
              <h3 className="text-2xl font-bold text-white mb-4">
                Message from {userName}
              </h3>
            )}
            <div className="bg-black/30 rounded-lg p-6 border border-neon-purple/20">
              <p className="text-white text-xl leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
