import { Logo } from './shared/Logo';

interface WelcomeScreenProps {
  onStart: () => void;
  logoUrl: string;
  bandName?: string;
  accentColor?: string;
}

export function WelcomeScreen({ onStart, logoUrl, bandName = 'Band Name', accentColor = '#ff00ff' }: WelcomeScreenProps) {
  // Create gradient stops for the background
  const gradientStyle = {
    background: `radial-gradient(ellipse at top, ${accentColor}40, transparent 50%), radial-gradient(ellipse at bottom, ${accentColor}20, transparent 70%), linear-gradient(to bottom, #000000, ${accentColor}15, #000000)`
  };

  return (
    <div className="welcome-screen min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 animate-gradient" style={gradientStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-6">
        {/* Logo Section */}
        <div className="logo-container mb-4 animate-fadeInDown">
          <div className="relative">
            <div
              className="absolute inset-0 blur-3xl opacity-50 animate-pulse"
              style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }}
            ></div>
            <Logo
              url={logoUrl}
              className="h-16 md:h-40 relative z-10 drop-shadow-2xl"
            />
          </div>
          <h2
            className="text-xl md:text-5xl font-bold mt-2 text-center"
            style={{ color: accentColor }}
          >
            {bandName}
          </h2>
        </div>

        {/* Main Message */}
        <div className="text-center max-w-3xl mb-6 animate-fadeInUp space-y-3">
          <div className="relative">
            <h1 className="text-xl md:text-6xl font-black mb-3 leading-tight">
              <span className="text-gray-100 drop-shadow-lg text-base md:text-5xl">
                Welcome to the
              </span>
              <br />
              <span
                className="text-2xl md:text-7xl font-black"
                style={{ color: accentColor }}
              >
                uRequest Live
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-sm md:text-2xl text-gray-200 leading-snug animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            You shape the show. Make as many requests as you like and upvote your favorites.
            <br />
            <span
              className="font-bold text-base md:text-3xl"
              style={{ color: accentColor }}
            >
              The most requested songs by the audience will be played.
            </span>
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onStart}
          className="cta-button group relative px-8 py-3 text-base md:text-2xl font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl animate-fadeInUp"
          style={{
            animationDelay: '0.6s',
            background: accentColor,
            boxShadow: `0 0 30px ${accentColor}60, 0 0 60px ${accentColor}30`
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-slide"></div>
          </div>

          {/* Button content */}
          <span className="relative z-10 text-white drop-shadow-lg">
            Start Requesting
          </span>
        </button>

        {/* Pulsing ring around button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
          <div
            className="w-64 h-64 border-4 rounded-full animate-ping-slow"
            style={{ borderColor: `${accentColor}30` }}
          ></div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes shimmer {
          0%, 100% {
            background-position: -200% center;
          }
          50% {
            background-position: 200% center;
          }
        }

        @keyframes shimmer-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100vh) translateX(50px);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }

        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }

        .animate-shimmer-slide {
          animation: shimmer-slide 2s linear infinite;
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-fadeInDown {
          animation: fadeInDown 1s ease-out forwards;
        }

        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out forwards;
          opacity: 0;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .cta-button {
          transform-style: preserve-3d;
        }

        .cta-button:active {
          transform: scale(0.95);
        }

        .feature-card {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}
