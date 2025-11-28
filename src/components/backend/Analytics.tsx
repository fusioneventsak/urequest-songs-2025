import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { BarChart3, Users, Music, TrendingUp, Calendar, Award, Activity, CheckCircle2, Smartphone } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import type { SongRequest } from '../../types';

interface AnalyticsData {
  totalUsers: number;
  totalRequests: number;
  totalSongs: number;
  totalPlayed: number;
  totalKioskRequests: number;
  totalVotes: number;
  requestsPerUser: { name: string; count: number; photo?: string }[];
  mostRequestedSongs: { title: string; artist: string; count: number }[];
  dailyActivity: { date: string; requests: number; users: number; played: number }[];
  topUpvotedSongs: { title: string; artist: string; votes: number }[];
}

export function Analytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalRequests: 0,
    totalSongs: 0,
    totalPlayed: 0,
    totalKioskRequests: 0,
    totalVotes: 0,
    requestsPerUser: [],
    mostRequestedSongs: [],
    dailyActivity: [],
    topUpvotedSongs: []
  });
  const [dateRange, setDateRange] = useState<number>(7); // Default 7 days
  const [dateMode, setDateMode] = useState<'range' | 'custom'>('range'); // Range or custom dates
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, dateMode, startDate, endDate]);

  // Real-time subscription for analytics updates
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    // Subscribe to requests and requesters changes
    const subscription = supabase
      .channel('analytics_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        () => {
          // Debounce updates to avoid excessive reloads
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadAnalytics();
          }, 2000); // 2 second delay
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requesters'
        },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadAnalytics();
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [dateRange, dateMode, startDate, endDate]); // Reload when date filters change

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Calculate date range for daily activity chart
      let rangeStartDate: Date;
      let rangeEndDate: Date = new Date();
      let dayCount: number;

      if (dateMode === 'custom' && startDate && endDate) {
        rangeStartDate = startOfDay(parseISO(startDate));
        rangeEndDate = endOfDay(parseISO(endDate));  // Use END of day (23:59:59) to include all data
        dayCount = Math.ceil((rangeEndDate.getTime() - rangeStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        rangeStartDate = startOfDay(subDays(new Date(), dateRange));
        rangeEndDate = endOfDay(new Date());  // Use END of today to include current data
        dayCount = dateRange;
      }

      // Fetch requests within date range for stats (per-day performance tracking)
      const { data: rangeRequests, error: rangeError} = await supabase
        .from('requests')
        .select(`
          *,
          requesters (
            id,
            name,
            photo,
            message,
            source,
            created_at
          )
        `)
        .gte('created_at', rangeStartDate.toISOString())
        .lte('created_at', rangeEndDate.toISOString())
        .order('created_at', { ascending: false });

      if (rangeError) {
        console.error('Error fetching range requests:', rangeError);
        throw rangeError;
      }

      // Fetch total votes count from user_votes table (filtered by date range)
      const { count: totalVotesCount, error: votesError } = await supabase
        .from('user_votes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', rangeStartDate.toISOString())
        .lte('created_at', rangeEndDate.toISOString());

      if (votesError) {
        console.error('Error fetching votes count:', votesError);
      }

      // Use rangeRequests for stats (date-filtered) so each day shows its own totals
      // This allows tracking stats per performance/day
      const requests = rangeRequests || [];

      if (requests.length === 0) {
        setIsLoading(false);
        setAnalyticsData({
          totalUsers: 0,
          totalRequests: 0,
          totalSongs: 0,
          totalPlayed: 0,
          totalKioskRequests: 0,
          totalVotes: 0,
          requestsPerUser: [],
          mostRequestedSongs: [],
          dailyActivity: [],
          topUpvotedSongs: []
        });
        return;
      }

      // Process the data
      const userMap = new Map<string, { count: number; photo?: string }>();
      const songMap = new Map<string, { title: string; artist: string; count: number }>();
      const upvoteMap = new Map<string, { title: string; artist: string; votes: number }>();
      const dailyMap = new Map<string, { requests: number; users: Set<string>; played: number }>();
      let totalPlayedCount = 0;
      let kioskRequestCount = 0;

      // Process requests for stats (date-filtered for per-day analytics)
      requests.forEach((request: SongRequest) => {
        const requesters = Array.isArray(request.requesters) ? request.requesters : [];
        const songKey = `${request.title}|${request.artist || ''}`;

        // Track songs and their request counts
        if (songMap.has(songKey)) {
          songMap.get(songKey)!.count += requesters.length || 1;
        } else {
          songMap.set(songKey, {
            title: request.title,
            artist: request.artist || 'Unknown Artist',
            count: requesters.length || 1
          });
        }

        // Track upvotes
        if (request.votes && request.votes > 0) {
          if (upvoteMap.has(songKey)) {
            upvoteMap.get(songKey)!.votes += request.votes;
          } else {
            upvoteMap.set(songKey, {
              title: request.title,
              artist: request.artist || 'Unknown Artist',
              votes: request.votes
            });
          }
        }

        // Track played songs (marked as played) - handle both isPlayed and is_played
        const isPlayed = request.isPlayed || (request as any).is_played;
        if (isPlayed) {
          totalPlayedCount += 1;
        }

        // Track kiosk requests - count each requester with source='kiosk'
        console.log(`🔍 ANALYTICS - "${request.title}" has ${requesters.length} requesters`);
        requesters.forEach((requester, idx) => {
          console.log(`  Requester ${idx + 1}: ${requester.name}, source='${requester.source}' (type: ${typeof requester.source})`);
          if (requester.source === 'kiosk') {
            kioskRequestCount += 1;
            console.log('📱 KIOSK REQUEST FOUND!');
          }
        });

        // Track users and their request counts
        requesters.forEach((requester) => {
          const userName = requester.name || 'Anonymous';
          if (userMap.has(userName)) {
            userMap.get(userName)!.count += 1;
          } else {
            userMap.set(userName, { count: 1, photo: requester.photo });
          }
        });

        // Track daily activity for the chart
        const createdDate = request.created_at || request.createdAt;
        if (createdDate) {
          const dateKey = format(parseISO(createdDate), 'yyyy-MM-dd');
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { requests: 0, users: new Set(), played: 0 });
          }
          const dayData = dailyMap.get(dateKey)!;
          dayData.requests += requesters.length || 1;
          if (isPlayed) {
            dayData.played += 1;
          }
          requesters.forEach((requester) => {
            dayData.users.add(requester.name || 'Anonymous');
          });
        }
      });

      // Convert maps to sorted arrays
      const requestsPerUser = Array.from(userMap.entries())
        .map(([name, data]) => ({ name, count: data.count, photo: data.photo }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      console.log('📊 Analytics summary - Total kiosk requests:', kioskRequestCount);

      const mostRequestedSongs = Array.from(songMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topUpvotedSongs = Array.from(upvoteMap.values())
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 10);

      // Generate daily activity for the entire date range
      const dailyActivity: { date: string; requests: number; users: number; played: number }[] = [];
      for (let i = dayCount - 1; i >= 0; i--) {
        const date = format(subDays(rangeEndDate, i), 'yyyy-MM-dd');
        const dayData = dailyMap.get(date);
        dailyActivity.push({
          date,
          requests: dayData?.requests || 0,
          users: dayData?.users.size || 0,
          played: dayData?.played || 0
        });
      }

      setAnalyticsData({
        totalUsers: userMap.size,
        totalRequests: requests.reduce((sum, r) => sum + (r.requesters?.length || 1), 0),
        totalSongs: songMap.size,
        totalPlayed: totalPlayedCount,
        totalKioskRequests: kioskRequestCount,
        totalVotes: totalVotesCount || 0,
        requestsPerUser,
        mostRequestedSongs,
        dailyActivity,
        topUpvotedSongs
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate max values for chart scaling
  const maxDailyRequests = useMemo(
    () => Math.max(...analyticsData.dailyActivity.map(d => d.requests), 1),
    [analyticsData.dailyActivity]
  );

  const maxDailyUsers = useMemo(
    () => Math.max(...analyticsData.dailyActivity.map(d => d.users), 1),
    [analyticsData.dailyActivity]
  );

  const maxDailyPlayed = useMemo(
    () => Math.max(...analyticsData.dailyActivity.map(d => d.played), 1),
    [analyticsData.dailyActivity]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-neon-purple" />
            Analytics Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Mode:</span>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value as 'range' | 'custom')}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neon-purple"
            >
              <option value="range">Preset Range</option>
              <option value="custom">Custom Dates</option>
            </select>
          </div>
        </div>

        {dateMode === 'range' ? (
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm text-gray-400">Date Range:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neon-purple"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neon-purple"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neon-purple"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-effect rounded-lg p-6 border border-neon-purple/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalUsers}</p>
            </div>
            <Users className="w-12 h-12 text-neon-purple opacity-50" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 border border-neon-pink/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Requests</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalRequests}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-neon-pink opacity-50" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 border border-neon-blue/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Unique Songs</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalSongs}</p>
            </div>
            <Music className="w-12 h-12 text-neon-blue opacity-50" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Songs Played</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalPlayed}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Kiosk Requests</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalKioskRequests}</p>
            </div>
            <Smartphone className="w-12 h-12 text-orange-500 opacity-50" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Votes</p>
              <p className="text-3xl font-bold text-white mt-1">{analyticsData.totalVotes}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="glass-effect rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon-purple" />
          Daily Activity
        </h3>
        <div className="space-y-6">
          {/* Requests Chart */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Requests per Day</p>
            <div className="flex items-end gap-2 h-32">
              {analyticsData.dailyActivity.map((day) => {
                const height = (day.requests / maxDailyRequests) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full">
                    <div className="relative group w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-neon-pink to-neon-purple rounded-t transition-all duration-300 hover:opacity-80"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                        {day.requests} requests
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(parseISO(day.date), 'M/d')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Users Chart */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Active Users per Day</p>
            <div className="flex items-end gap-2 h-32">
              {analyticsData.dailyActivity.map((day) => {
                const height = (day.users / maxDailyUsers) * 100;
                return (
                  <div key={`users-${day.date}`} className="flex-1 flex flex-col items-center gap-1 h-full">
                    <div className="relative group w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all duration-300 hover:opacity-80"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                        {day.users} users
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(parseISO(day.date), 'M/d')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Played Songs Chart */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Songs Played per Day</p>
            <div className="flex items-end gap-2 h-32">
              {analyticsData.dailyActivity.map((day) => {
                const height = maxDailyPlayed > 0 ? (day.played / maxDailyPlayed) * 100 : 0;
                return (
                  <div key={`played-${day.date}`} className="flex-1 flex flex-col items-center gap-1 h-full">
                    <div className="relative group w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t transition-all duration-300 hover:opacity-80"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                        {day.played} played
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(parseISO(day.date), 'M/d')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Requesters */}
        <div className="glass-effect rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Top Requesters
          </h3>
          <div className="space-y-3">
            {analyticsData.requestsPerUser.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No user data available</p>
            ) : (
              analyticsData.requestsPerUser.map((user, index) => (
                <div key={user.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neon-purple w-6">#{index + 1}</span>
                    {user.photo ? (
                      <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <span className="text-white">{user.name}</span>
                  </div>
                  <span className="text-neon-pink font-bold">{user.count} requests</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Requested Songs */}
        <div className="glass-effect rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-neon-pink" />
            Most Requested Songs
          </h3>
          <div className="space-y-3">
            {analyticsData.mostRequestedSongs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No song data available</p>
            ) : (
              analyticsData.mostRequestedSongs.map((song, index) => (
                <div key={`${song.title}-${song.artist}`} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg font-bold text-neon-pink w-6">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{song.title}</p>
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    </div>
                  </div>
                  <span className="text-neon-purple font-bold ml-2 flex-shrink-0">{song.count}x</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Upvoted Songs */}
      <div className="glass-effect rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Most Upvoted Songs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analyticsData.topUpvotedSongs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4 col-span-2">No upvote data available</p>
          ) : (
            analyticsData.topUpvotedSongs.map((song, index) => (
              <div key={`upvote-${song.title}-${song.artist}`} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg font-bold text-green-500 w-6">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  </div>
                </div>
                <span className="text-green-500 font-bold ml-2 flex-shrink-0">{song.votes} 👍</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
