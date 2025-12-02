import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Search, Music, Check } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { searchITunes, DEFAULT_ALBUM_ART } from '../utils/itunes';
import { AlbumArtDisplay } from './shared/AlbumArtDisplay';
import type { Song } from '../types';

interface iTunesSuggestion {
  trackName: string;
  artistName: string;
  artworkUrl: string;
  collectionName?: string;
}

interface SongEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song | null;
  onSave?: (song: Song) => void;
  onAdd?: (song: Song) => void;
}

export function SongEditorModal({ isOpen, onClose, song, onSave, onAdd }: SongEditorModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<iTunesSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState<Omit<Song, 'id'>>({
    title: '',
    artist: '',
    genre: '',
    key: '',
    notes: '',
    albumArtUrl: '',
  });

  // Update form data when song prop changes
  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title,
        artist: song.artist,
        genre: song.genre || '',
        key: song.key || '',
        notes: song.notes || '',
        albumArtUrl: song.albumArtUrl || '',
      });
    } else {
      setFormData({
        title: '',
        artist: '',
        genre: '',
        key: '',
        notes: '',
        albumArtUrl: '',
      });
    }
    // Reset suggestions when song changes
    setSuggestions([]);
    setShowSuggestions(false);
  }, [song]);

  // Search iTunes for song suggestions
  const handleSearchiTunes = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a song title first');
      return;
    }

    setIsSearching(true);
    setSuggestions([]);
    setShowSuggestions(true);

    try {
      const allSuggestions: iTunesSuggestion[] = [];
      const seenKeys = new Set<string>();

      // Generate search variations
      const variations = generateSearchVariations(formData.title, formData.artist);

      for (const query of variations) {
        try {
          const encodedQuery = encodeURIComponent(query);
          const response = await fetch(
            `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=5`
          );

          if (!response.ok) continue;

          const data = await response.json();

          for (const result of data.results || []) {
            const key = `${result.trackName.toLowerCase()}|${result.artistName.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allSuggestions.push({
                trackName: result.trackName,
                artistName: result.artistName,
                artworkUrl: result.artworkUrl100?.replace('100x100', '300x300') || '',
                collectionName: result.collectionName
              });
            }
          }

          // Stop if we have enough suggestions
          if (allSuggestions.length >= 12) break;

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Search error for "${query}":`, error);
        }
      }

      setSuggestions(allSuggestions.slice(0, 12));
    } catch (error) {
      console.error('Error searching iTunes:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Generate search variations
  const generateSearchVariations = (title: string, artist: string): string[] => {
    const variations: string[] = [];

    // Original search
    if (artist.trim()) {
      variations.push(`${title} ${artist}`);
    }
    variations.push(title);

    // Clean version - remove parentheses, brackets, feat, etc.
    const cleanTitle = title
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s*\[[^\]]*\]\s*/g, ' ')
      .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/i, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanArtist = artist
      .replace(/\s*&\s+.*$/, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanTitle !== title || cleanArtist !== artist) {
      if (cleanArtist) {
        variations.push(`${cleanTitle} ${cleanArtist}`);
      }
      variations.push(cleanTitle);
    }

    // Without "The" in artist
    if (artist.toLowerCase().startsWith('the ')) {
      const artistWithoutThe = artist.slice(4);
      variations.push(`${title} ${artistWithoutThe}`);
    }

    return [...new Set(variations)];
  };

  // Apply a suggestion
  const handleApplySuggestion = (suggestion: iTunesSuggestion) => {
    setFormData(prev => ({
      ...prev,
      title: suggestion.trackName,
      artist: suggestion.artistName,
      albumArtUrl: suggestion.artworkUrl
    }));
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'genre') {
      const formattedValue = value
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^,\s*/, '')
        .replace(/\s*,$/, '');
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsProcessing(true);
      
      // Search for album art
      const albumArtUrl = await searchITunes(formData.title, formData.artist);
      
      const cleanedGenre = formData.genre
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^,\s*/, '')
        .replace(/\s*,$/, '');

      const songData = {
        ...formData,
        genre: cleanedGenre,
        albumArtUrl
      };

      if (song) {
        // Update existing song
        const { error } = await supabase
          .from('songs')
          .update(songData)
          .eq('id', song.id);

        if (error) throw error;

        // Call onSave callback with updated song data
        if (onSave) {
          onSave({ id: song.id, ...songData });
        }
      } else {
        // Add new song
        const { data, error } = await supabase
          .from('songs')
          .insert(songData)
          .select()
          .single();

        if (error) throw error;

        // Call onAdd callback with the returned song data (includes id)
        if (data && onAdd) {
          onAdd(data);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving song:', error);
      alert('Error saving song. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative glass-effect rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-gray-400 hover:text-white disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">
          {song ? 'Edit Song' : 'Add New Song'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Album Art Preview */}
          {formData.albumArtUrl && !formData.albumArtUrl.startsWith('data:image/svg') && formData.albumArtUrl !== DEFAULT_ALBUM_ART && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
              <img
                src={formData.albumArtUrl}
                alt="Current album art"
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <p className="text-sm text-gray-400">Current Album Art</p>
                <p className="text-white font-medium">{formData.title || 'Untitled'}</p>
                <p className="text-gray-400 text-sm">{formData.artist || 'Unknown artist'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2 text-white">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="input-field"
                placeholder="Enter song title"
              />
            </div>
            <div>
              <label htmlFor="artist" className="block text-sm font-medium mb-2 text-white">Artist *</label>
              <input
                type="text"
                id="artist"
                name="artist"
                required
                value={formData.artist}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="input-field"
                placeholder="Enter artist name"
              />
            </div>
          </div>

          {/* Search iTunes Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSearchiTunes}
              disabled={isSearching || isProcessing || !formData.title.trim()}
              className="px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-lg border border-green-500/30 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching iTunes...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search iTunes for Correct Song
                </>
              )}
            </button>
            <span className="text-xs text-gray-400">
              Find the correct spelling and album art
            </span>
          </div>

          {/* iTunes Suggestions Panel */}
          {showSuggestions && (
            <div className="rounded-lg border border-neon-purple/30 bg-neon-purple/5 overflow-hidden">
              <div className="p-3 border-b border-neon-purple/20 flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-neon-pink" />
                  iTunes Results
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isSearching ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-pink mx-auto mb-2" />
                  <p className="text-gray-400">Searching iTunes...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-8 text-center">
                  <Music className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">No matches found</p>
                  <p className="text-gray-500 text-sm">Try adjusting the title or artist</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-neon-purple/20 transition-colors cursor-pointer group"
                      onClick={() => handleApplySuggestion(suggestion)}
                    >
                      {suggestion.artworkUrl ? (
                        <img
                          src={suggestion.artworkUrl}
                          alt={suggestion.trackName}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Music className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {suggestion.trackName}
                          {suggestion.trackName.toLowerCase() !== formData.title.toLowerCase() && (
                            <span className="text-yellow-400 ml-1 text-xs">(different)</span>
                          )}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {suggestion.artistName}
                        </p>
                        {suggestion.collectionName && (
                          <p className="text-gray-500 text-xs truncate">
                            {suggestion.collectionName}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <Check className="w-3 h-3" />
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium mb-2 text-white">
                Genres
                <span className="text-gray-400 text-xs ml-2">
                  (separate with comma and space, e.g. "Rock, Pop, Dance")
                </span>
              </label>
              <input
                type="text"
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="input-field"
                placeholder="Rock, Pop, Dance"
              />
            </div>
            <div>
              <label htmlFor="key" className="block text-sm font-medium mb-2 text-white">Key</label>
              <input
                type="text"
                id="key"
                name="key"
                value={formData.key}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="input-field"
                placeholder="Enter song key"
              />
            </div>
          </div>

          <div>
            <label htmlFor="albumArtUrl" className="block text-sm font-medium mb-2 text-white">
              Album Art URL
              <span className="text-gray-400 text-xs ml-2">(auto-filled from iTunes search)</span>
            </label>
            <input
              type="url"
              id="albumArtUrl"
              name="albumArtUrl"
              value={formData.albumArtUrl}
              onChange={handleInputChange}
              disabled={isProcessing}
              className="input-field"
              placeholder="https://example.com/album-art.jpg"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2 text-white">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              disabled={isProcessing}
              className="input-field"
              rows={3}
              placeholder="Add any notes about the song..."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="neon-button flex items-center disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {song ? 'Update Song' : 'Add Song'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}