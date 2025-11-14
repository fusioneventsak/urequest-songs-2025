export interface SongRequest {
  id: string;
  title: string;
  artist?: string;
  albumArtUrl?: string;
  requesters: {
    id: string;
    name: string;
    photo: string;
    message?: string;
    timestamp: string;
  }[];
  votes: number;
  status: 'pending' | 'approved' | 'rejected' | 'played';
  isLocked?: boolean;
  isPlayed?: boolean;
  isHot?: boolean;
  createdAt: string;
}

export interface RequestFormData {
  title: string;
  artist: string;
  albumArtUrl?: string;
  requestedBy: string;
  userPhoto: string;
  message?: string;
  userId?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  key?: string;
  notes?: string;
  lastPlayed?: Date;
  albumArtUrl?: string;
}

export interface SetList {
  id: string;
  name: string;
  date: Date | string;
  songs: Song[];
  notes?: string;
  isActive?: boolean;
}

export interface User {
  id?: string;
  name: string;
  photo: string;
}

export interface QueuedRequest {
  id: string;
  request: SongRequest;
  priority: number;
  timestamp: Date;
}

export interface QueueStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  averageWaitTime: number;
}

export interface UiSettings {
  id: string;
  band_name: string;
  primary_color: string;
  primary_use_gradient: boolean;
  primary_gradient_start: string;
  primary_gradient_end: string;
  secondary_color: string;
  secondary_use_gradient: boolean;
  secondary_gradient_start: string;
  secondary_gradient_end: string;
  frontend_accent_color: string;
  frontend_accent_use_gradient: boolean;
  frontend_accent_gradient_start: string;
  frontend_accent_gradient_end: string;
  frontend_bg_color: string;
  frontend_bg_use_gradient: boolean;
  frontend_bg_gradient_start: string;
  frontend_bg_gradient_end: string;
  nav_bg_color: string;
  nav_bg_use_gradient: boolean;
  nav_bg_gradient_start: string;
  nav_bg_gradient_end: string;
  highlight_color: string;
  highlight_use_gradient: boolean;
  highlight_gradient_start: string;
  highlight_gradient_end: string;
  frontend_secondary_accent: string;
  frontend_secondary_accent_use_gradient: boolean;
  frontend_secondary_accent_gradient_start: string;
  frontend_secondary_accent_gradient_end: string;
  song_card_color: string;
  song_card_use_gradient: boolean;
  song_card_gradient_start: string;
  song_card_gradient_end: string;
  frontend_header_bg: string;
  frontend_header_bg_use_gradient: boolean;
  frontend_header_bg_gradient_start: string;
  frontend_header_bg_gradient_end: string;
  band_logo_url: string | null;
  show_qr_code: boolean;
  custom_message: string;
  ticker_active: boolean;
  photobooth_url: string | null;
}