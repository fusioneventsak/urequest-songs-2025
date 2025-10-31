import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';

export interface NextSong {
  title: string;
  artist?: string;
}

export function useNextSong() {
  const [nextSong, setNextSong] = useState<NextSong | undefined>(undefined);
  const subRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNextSong = async () => {
    // Query the database directly for the currently locked, unplayed song
    const { data, error } = await supabase
      .from('requests')
      .select('title, artist, is_locked, is_played, created_at')
      .eq('is_locked', true)
      .eq('is_played', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch next song:', error.message || error);
      return;
    }

    if (data && data.length > 0) {
      setNextSong({ title: data[0].title, artist: data[0].artist || undefined });
    } else {
      setNextSong(undefined);
    }
  };

  useEffect(() => {
    fetchNextSong();

    if (subRef.current) subRef.current.unsubscribe();

    subRef.current = supabase
      .channel('next_song_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => fetchNextSong(), 400);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (subRef.current) subRef.current.unsubscribe();
    };
  }, []);

  return nextSong;
}
