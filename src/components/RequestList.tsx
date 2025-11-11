import React, { useState } from 'react';
import { ThumbsUp, Check, X, Music2, MessageCircle, Users, Maximize2, Flame } from 'lucide-react';
import { EnlargeModal } from './EnlargeModal';
import type { SongRequest } from '../types';

interface RequestListProps {
  requests: SongRequest[];
  onVote: (id: string) => void;
  onUpdateStatus: (id: string, status: SongRequest['status']) => void;
}

export function RequestList({ requests, onVote, onUpdateStatus }: RequestListProps) {
  const [enlargeModal, setEnlargeModal] = useState<{
    isOpen: boolean;
    type: 'photo' | 'message';
    content: string;
    userName?: string;
  }>({
    isOpen: false,
    type: 'photo',
    content: '',
    userName: ''
  });

  const getStatusColor = (status: SongRequest['status']) => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'played': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const handlePhotoClick = (photoUrl: string, userName: string) => {
    setEnlargeModal({
      isOpen: true,
      type: 'photo',
      content: photoUrl,
      userName
    });
  };

  const handleMessageClick = (message: string, userName: string) => {
    setEnlargeModal({
      isOpen: true,
      type: 'message',
      content: message,
      userName
    });
  };

  const closeModal = () => {
    setEnlargeModal({
      isOpen: false,
      type: 'photo',
      content: '',
      userName: ''
    });
  };

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const mainRequester = request.requesters?.[0];
          const hasMultipleRequesters = request.requesters?.length > 1;
          const hasMessages = request.requesters?.some(r => r.message);
          // Consider a song "hot" if it has multiple requesters or high votes, or if explicitly marked
          const isHot = request.isHot || request.requesters?.length >= 3 || request.votes >= 5;

          return (
            <div
              key={request.id}
              className={`glass-effect rounded-lg p-4 ${isHot ? 'ring-2 ring-orange-500/50' : ''}`}
            >
              <div className="flex items-start gap-4 mb-3">
                {/* Clickable Photo */}
                {mainRequester && (
                  <div className="relative group">
                    <button
                      onClick={() => handlePhotoClick(mainRequester.photo, mainRequester.name)}
                      className="relative block"
                      title={`Click to enlarge ${mainRequester.name}'s photo`}
                    >
                      <img
                        src={mainRequester.photo}
                        alt={`${mainRequester.name}'s photo`}
                        className="w-16 h-16 rounded-full object-cover neon-border transition-all group-hover:scale-110 group-hover:shadow-2xl cursor-pointer"
                      />
                      {/* Enlarge icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 rounded-full transition-all">
                        <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                    {/* Multiple requesters indicator */}
                    {hasMultipleRequesters && (
                      <div className="absolute -bottom-1 -right-1 bg-neon-pink rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white border-2 border-black">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                )}

                {/* Song Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{request.title}</h3>
                    {isHot && (
                      <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 rounded-full animate-pulse">
                        <Flame className="w-4 h-4 text-white" />
                        <span className="text-xs font-bold text-white uppercase">Hot</span>
                      </div>
                    )}
                  </div>
                  {request.artist && (
                    <p className="text-gray-300 text-sm mb-1">by {request.artist}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Requested by: {mainRequester?.name || 'Unknown'}</span>
                    {hasMultipleRequesters && (
                      <span className="text-neon-pink">
                        +{request.requesters.length - 1} more
                      </span>
                    )}
                  </div>

                  {/* Messages indicator/viewer */}
                  {hasMessages && (
                    <div className="mt-2 space-y-1">
                      {request.requesters
                        .filter(r => r.message)
                        .map((requester, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleMessageClick(requester.message!, requester.name)}
                            className="flex items-start gap-2 p-2 bg-neon-purple/10 hover:bg-neon-purple/20 rounded-lg transition-all w-full text-left group"
                            title="Click to enlarge message"
                          >
                            <MessageCircle className="w-4 h-4 text-neon-pink flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">{requester.name}:</p>
                              <p className="text-sm text-white truncate group-hover:text-neon-pink transition-colors">
                                {requester.message}
                              </p>
                            </div>
                            <Maximize2 className="w-4 h-4 text-gray-500 group-hover:text-neon-pink flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-3 border-t border-neon-purple/20">
                {/* Votes */}
                <div className="flex items-center gap-2">
                  <span className="flex items-center">
                    <span className="font-medium text-white mr-2">{request.votes}</span>
                    <button
                      onClick={() => onVote(request.id)}
                      className="p-1 hover:bg-neon-purple/20 rounded text-neon-pink"
                      title="Upvote"
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                  </span>
                </div>

                {/* Status Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateStatus(request.id, 'approved')}
                    className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-all"
                    title="Approve"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onUpdateStatus(request.id, 'rejected')}
                    className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-all"
                    title="Reject"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onUpdateStatus(request.id, 'played')}
                    className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-all"
                    title="Mark as Played"
                  >
                    <Music2 className="w-5 h-5" />
                  </button>

                  {/* Status Display */}
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No requests in the queue</p>
          </div>
        )}
      </div>

      {/* Enlarge Modal */}
      <EnlargeModal
        isOpen={enlargeModal.isOpen}
        onClose={closeModal}
        type={enlargeModal.type}
        content={enlargeModal.content}
        userName={enlargeModal.userName}
      />
    </>
  );
}
