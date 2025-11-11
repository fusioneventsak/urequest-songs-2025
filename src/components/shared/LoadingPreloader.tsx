import React from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';

interface LoadingPreloaderProps {
  logoUrl: string;
  accentColor?: string;
  bandName?: string;
}

export function LoadingPreloader({ logoUrl, accentColor = '#ff00ff', bandName = 'Band Name' }: LoadingPreloaderProps) {
  const gradientStyle = {
    background: `radial-gradient(ellipse at center, ${accentColor}20, transparent 60%), linear-gradient(to bottom, #000000, ${accentColor}10, #000000)`
  };

  return (
    <div className="loading-preloader min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0" style={gradientStyle}></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo with glow */}
        <div className="relative">
          <div
            className="absolute inset-0 blur-3xl opacity-50 animate-pulse"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }}
          ></div>
          <Logo
            url={logoUrl}
            className="h-32 md:h-40 relative z-10 drop-shadow-2xl"
          />
        </div>

        {/* Band Name */}
        <h2
          className="text-4xl md:text-5xl font-bold text-center mt-6"
          style={{
            color: accentColor,
            textShadow: `0 0 10px ${accentColor}80`
          }}
        >
          {bandName}
        </h2>

        {/* Now Loading text */}
        <div
          className="text-xl font-semibold uppercase tracking-wider opacity-90"
          style={{ color: accentColor }}
        >
          Now Loading
        </div>

        {/* Spinner */}
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: accentColor }}
        />
      </div>
    </div>
  );
}
