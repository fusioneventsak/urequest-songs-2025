import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Trophy, Users, Award, Medal, Crown, Sparkles } from 'lucide-react';
import { useUiSettings } from '../../hooks/useUiSettings';

interface TopRequester {
  name: string;
  count: number;
  photo?: string;
}

const DEFAULT_BAND_LOGO = "https://www.fusion-events.ca/wp-content/uploads/2025/03/ulr-wordmark.png";

export function Leaderboard() {
  const [topRequesters, setTopRequesters] = useState<TopRequester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useUiSettings();

  const accentColor = settings?.frontend_accent_color || '#ff00ff';
  const secondaryColor = settings?.frontend_secondary_accent || '#9d00ff';
  const bgColor = settings?.frontend_bg_color || '#0f051d';
  const headerBgColor = settings?.frontend_header_bg || '#13091f';
  const bandLogoUrl = settings?.band_logo_url || DEFAULT_BAND_LOGO;

  useEffect(() => {
    loadTopRequesters();

    // Real-time subscription for updates
    const subscription = supabase
      .channel('leaderboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        () => {
          loadTopRequesters();
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
          loadTopRequesters();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTopRequesters = async () => {
    try {
      // Fetch only active requests with requesters
      const { data: requests, error } = await supabase
        .from('requests')
        .select(`
          *,
          requesters (
            id,
            name,
            photo
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to count requests per user
      const userMap = new Map<string, { count: number; photo?: string }>();

      requests?.forEach((request: any) => {
        const requesters = Array.isArray(request.requesters) ? request.requesters : [];

        requesters.forEach((requester: any) => {
          const userName = requester.name || 'Anonymous';
          if (userMap.has(userName)) {
            userMap.get(userName)!.count += 1;
          } else {
            userMap.set(userName, { count: 1, photo: requester.photo });
          }
        });
      });

      // Convert to array and sort by count, limit to 20
      const topUsers = Array.from(userMap.entries())
        .map(([name, data]) => ({ name, count: data.count, photo: data.photo }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setTopRequesters(topUsers);
    } catch (error) {
      console.error('Error loading top requesters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-10 h-10" style={{ color: '#FFD700' }} />;
      case 1:
        return <Medal className="w-10 h-10" style={{ color: '#C0C0C0' }} />;
      case 2:
        return <Medal className="w-10 h-10" style={{ color: '#CD7F32' }} />;
      default:
        return <Award className="w-8 h-8" style={{ color: accentColor }} />;
    }
  };

  const getRankGlow = (index: number) => {
    switch (index) {
      case 0:
        return '0 0 30px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 215, 0, 0.3)';
      case 1:
        return '0 0 25px rgba(192, 192, 192, 0.5), 0 0 40px rgba(192, 192, 192, 0.2)';
      case 2:
        return '0 0 25px rgba(205, 127, 50, 0.5), 0 0 40px rgba(205, 127, 50, 0.2)';
      default:
        return `0 0 15px ${accentColor}40`;
    }
  };

  // Calculate dynamic sizing based on user count
  const userCount = topRequesters.length;

  // Dynamic grid columns: 1 col for 1-4 users, 2 cols for 5-20 users
  const gridCols = userCount <= 4 ? 'grid-cols-1' : 'grid-cols-2';

  // Calculate number of rows needed to fill viewport
  const numColumns = userCount <= 4 ? 1 : 2;
  const numRows = Math.ceil(userCount / numColumns);

  // Dynamic card sizes based on user count - optimized for horizontal layout
  const getCardSizes = () => {
    if (userCount <= 2) {
      // 1-2 users: Extra large
      return {
        photo: 'w-28 h-28',
        badge: 'w-16 h-16 text-2xl',
        nameText: 'text-5xl',
        countText: 'text-4xl',
        labelText: 'text-2xl',
        spacing: 'gap-6',
        padding: 'px-4 py-3',
        gap: 'gap-6',
        iconSize: 'w-12 h-12',
        rankIconSize: 'w-7 h-7',
        headerGap: 'gap-5',
        headerLogo: 'h-16',
        headerTitle: 'text-5xl',
        headerIcon: 'w-8 h-8',
        marginBottom: 'mb-5'
      };
    } else if (userCount <= 4) {
      // 3-4 users: Very large
      return {
        photo: 'w-24 h-24',
        badge: 'w-14 h-14 text-xl',
        nameText: 'text-4xl',
        countText: 'text-3xl',
        labelText: 'text-xl',
        spacing: 'gap-5',
        padding: 'px-3 py-2.5',
        gap: 'gap-5',
        iconSize: 'w-10 h-10',
        rankIconSize: 'w-6 h-6',
        headerGap: 'gap-4',
        headerLogo: 'h-14',
        headerTitle: 'text-4xl',
        headerIcon: 'w-7 h-7',
        marginBottom: 'mb-4'
      };
    } else if (userCount <= 6) {
      // 5-6 users: Large
      return {
        photo: 'w-20 h-20',
        badge: 'w-12 h-12 text-lg',
        nameText: 'text-3xl',
        countText: 'text-2xl',
        labelText: 'text-lg',
        spacing: 'gap-4',
        padding: 'px-3 py-2',
        gap: 'gap-4',
        iconSize: 'w-8 h-8',
        rankIconSize: 'w-5 h-5',
        headerGap: 'gap-4',
        headerLogo: 'h-12',
        headerTitle: 'text-3xl',
        headerIcon: 'w-6 h-6',
        marginBottom: 'mb-3'
      };
    } else if (userCount <= 10) {
      // 7-10 users: Medium-large
      return {
        photo: 'w-16 h-16',
        badge: 'w-10 h-10 text-base',
        nameText: 'text-2xl',
        countText: 'text-xl',
        labelText: 'text-base',
        spacing: 'gap-3',
        padding: 'px-2.5 py-1.5',
        gap: 'gap-3',
        iconSize: 'w-7 h-7',
        rankIconSize: 'w-4 h-4',
        headerGap: 'gap-3',
        headerLogo: 'h-11',
        headerTitle: 'text-3xl',
        headerIcon: 'w-6 h-6',
        marginBottom: 'mb-3'
      };
    } else if (userCount <= 14) {
      // 11-14 users: Medium
      return {
        photo: 'w-14 h-14',
        badge: 'w-9 h-9 text-sm',
        nameText: 'text-xl',
        countText: 'text-lg',
        labelText: 'text-sm',
        spacing: 'gap-2.5',
        padding: 'px-2 py-1.5',
        gap: 'gap-2.5',
        iconSize: 'w-6 h-6',
        rankIconSize: 'w-3.5 h-3.5',
        headerGap: 'gap-3',
        headerLogo: 'h-10',
        headerTitle: 'text-2xl',
        headerIcon: 'w-5 h-5',
        marginBottom: 'mb-2.5'
      };
    } else if (userCount <= 17) {
      // 15-17 users: Small
      return {
        photo: 'w-12 h-12',
        badge: 'w-8 h-8 text-xs',
        nameText: 'text-lg',
        countText: 'text-base',
        labelText: 'text-xs',
        spacing: 'gap-2',
        padding: 'px-2 py-1',
        gap: 'gap-2',
        iconSize: 'w-5 h-5',
        rankIconSize: 'w-3 h-3',
        headerGap: 'gap-2',
        headerLogo: 'h-9',
        headerTitle: 'text-2xl',
        headerIcon: 'w-5 h-5',
        marginBottom: 'mb-2'
      };
    } else {
      // 18-20 users: Extra small
      return {
        photo: 'w-10 h-10',
        badge: 'w-7 h-7 text-xs',
        nameText: 'text-base',
        countText: 'text-sm',
        labelText: 'text-xs',
        spacing: 'gap-2',
        padding: 'px-1.5 py-1',
        gap: 'gap-1.5',
        iconSize: 'w-4 h-4',
        rankIconSize: 'w-2.5 h-2.5',
        headerGap: 'gap-2',
        headerLogo: 'h-8',
        headerTitle: 'text-xl',
        headerIcon: 'w-4 h-4',
        marginBottom: 'mb-1.5'
      };
    }
  };

  const sizes = getCardSizes();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: accentColor }}></div>
      </div>
    );
  }

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className="h-screen w-full overflow-hidden py-4 px-6"
      style={{
        background: `linear-gradient(135deg, ${headerBgColor} 0%, ${bgColor} 100%)`
      }}
    >
      <style>{`
        :root {
          --accent-color: ${accentColor};
          --accent-color-dd: ${accentColor}dd;
          --accent-color-60: ${accentColor}99;
          --accent-color-40: ${accentColor}66;
          --accent-color-20: ${accentColor}33;
          --accent-color-10: ${accentColor}1a;
          --song-card-color-60: ${settings?.song_card_color || accentColor}99;
          --song-card-color-30: ${settings?.song_card_color || accentColor}4d;
          --song-card-color-10: ${settings?.song_card_color || accentColor}1a;
        }
      `}</style>
      {/* Animated background pattern */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, ${accentColor}15 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, ${secondaryColor}15 0%, transparent 60%),
            linear-gradient(45deg,
              transparent 0%,
              ${accentColor}05 25%,
              ${secondaryColor}05 50%,
              ${accentColor}05 75%,
              transparent 100%
            )
          `,
          animation: 'ambientFlow 15s ease-in-out infinite'
        }}
      />

      {/* Glass reflection effect */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          background: `linear-gradient(
            125deg,
            transparent 0%,
            transparent 35%,
            rgba(255, 255, 255, 0.02) 42%,
            rgba(255, 255, 255, 0.08) 48%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.08) 52%,
            rgba(255, 255, 255, 0.02) 58%,
            transparent 65%,
            transparent 100%
          )`,
          animation: 'glassReflection 10s ease-in-out infinite',
          transform: 'skewX(-15deg)'
        }}
      />

      <div className="max-w-[98vw] mx-auto relative z-10 h-full flex flex-col">
        {/* Dynamic Header */}
        <div className={`text-center ${sizes.marginBottom} flex-shrink-0`}>
          <div className={`flex items-center justify-center ${sizes.headerGap}`}>
            <img
              src={bandLogoUrl}
              alt="Band Logo"
              className={`${sizes.headerLogo} object-contain`}
              style={{
                filter: `drop-shadow(0 0 10px ${accentColor}50)`
              }}
            />
            <h1
              className={`${sizes.headerTitle} font-black tracking-tight`}
              style={{
                background: `linear-gradient(90deg, ${accentColor}, white, ${secondaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: `0 0 20px ${accentColor}60`,
                backgroundSize: '200% auto'
              }}
            >
              TOP REQUESTERS
            </h1>
            <Sparkles className={sizes.headerIcon} style={{ color: accentColor }} />
          </div>
        </div>

        {/* Dynamic Leaderboard Grid */}
        {topRequesters.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {/* Band Logo */}
            <img
              src={bandLogoUrl}
              alt="Band Logo"
              className="h-32 object-contain"
              style={{
                filter: `drop-shadow(0 0 20px ${accentColor}60)`
              }}
            />

            {/* Message */}
            <div className="text-center max-w-2xl px-8">
              <h2
                className="text-4xl font-black tracking-tight leading-tight"
                style={{
                  background: `linear-gradient(90deg, ${accentColor}, white, ${secondaryColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: `0 0 30px ${accentColor}40`,
                  backgroundSize: '200% auto',
                  animation: 'textShimmer 3s ease-in-out infinite'
                }}
              >
                REQUEST MORE SONGS TO GET ON THE TOP REQUESTER LEADERBOARD
              </h2>
            </div>
          </div>
        ) : (
          <div
            className={`grid ${gridCols} ${sizes.gap} flex-1`}
            style={{
              gridTemplateRows: `repeat(${numRows}, 1fr)`,
              gridAutoFlow: 'column'
            }}
          >
            {topRequesters.map((user, index) => (
              <div
                key={`${user.name}-${index}`}
                className="relative group h-full"
                style={{
                  animation: `fadeInUp 0.3s ease-out ${index * 0.02}s both`
                }}
              >
                <div
                  className={`glass-effect ${sizes.padding} rounded-lg relative overflow-hidden h-full flex items-center`}
                  style={{
                    background: 'linear-gradient(to right, var(--song-card-color-60), var(--song-card-color-10))',
                    border: index < 3
                      ? `2px solid ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}`
                      : '1px solid var(--accent-color)',
                    boxShadow: index < 3 ? getRankGlow(index) : '0 0 6px var(--accent-color-40)',
                    willChange: 'auto',
                    contain: 'layout style paint'
                  }}
                >
                  {/* Rank Badge */}
                  <div
                    className={`absolute top-2 right-2 flex items-center justify-center ${sizes.badge} rounded-full font-bold`}
                    style={{
                      background: index < 3
                        ? `linear-gradient(135deg, ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}, ${index === 0 ? '#FFA500' : index === 1 ? '#808080' : '#8B4513'})`
                        : `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`,
                      boxShadow: index < 3 ? `0 0 10px ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}80` : `0 0 8px ${accentColor}40`,
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    #{index + 1}
                  </div>

                  {/* User Content - Horizontal Layout */}
                  <div className={`flex items-center ${sizes.spacing} w-full`}>
                    {/* User Photo - Left */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`${sizes.photo} rounded-full overflow-hidden ring-2`}
                        style={{
                          ringColor: index < 3
                            ? (index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32')
                            : accentColor,
                          boxShadow: index < 3 ? `0 0 12px ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}60` : `0 0 8px ${accentColor}40`
                        }}
                      >
                        {user.photo ? (
                          <img
                            src={user.photo}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${accentColor}40, ${secondaryColor}40)`
                            }}
                          >
                            <Users className={sizes.iconSize} style={{ color: 'rgb(209, 213, 219)' }} />
                          </div>
                        )}
                      </div>

                      {/* Rank Icon */}
                      {index < 3 && (
                        <div
                          className="absolute -bottom-1 -right-1 p-1 rounded-full"
                          style={{
                            background: 'rgba(0, 0, 0, 0.95)',
                            border: `1px solid ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}`
                          }}
                        >
                          {index === 0 ? <Crown className={sizes.rankIconSize} style={{ color: '#FFD700' }} /> :
                           index === 1 ? <Medal className={sizes.rankIconSize} style={{ color: '#C0C0C0' }} /> :
                           <Medal className={sizes.rankIconSize} style={{ color: '#CD7F32' }} />}
                        </div>
                      )}
                    </div>

                    {/* User Info - Right */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <h3
                        className={`${sizes.nameText} font-bold truncate leading-tight`}
                        style={{
                          color: 'white',
                          textShadow: `0 1px 4px ${accentColor}50`
                        }}
                      >
                        {user.name}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`${sizes.labelText} font-bold whitespace-nowrap`}
                          style={{
                            color: 'white',
                            opacity: 0.9
                          }}
                        >
                          # of Requests:
                        </span>
                        <span
                          className={`${sizes.countText} font-black`}
                          style={{
                            color: 'white',
                            textShadow: `0 2px 8px ${accentColor}60`
                          }}
                        >
                          {user.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ambientFlow {
          0%, 100% {
            transform: translateX(-5px) translateY(-5px) scale(1);
            opacity: 0.2;
          }
          33% {
            transform: translateX(5px) translateY(5px) scale(1.05);
            opacity: 0.3;
          }
          66% {
            transform: translateX(-3px) translateY(3px) scale(0.95);
            opacity: 0.25;
          }
        }

        @keyframes glassReflection {
          0% {
            transform: translateX(-200%) skewX(-15deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(300%) skewX(-15deg);
            opacity: 0;
          }
        }

        @keyframes textShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2) rotate(5deg);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
