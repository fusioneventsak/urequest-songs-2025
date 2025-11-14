import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { useUiSettings } from '../../hooks/useUiSettings';

interface BackToTopButtonProps {
  size?: 'normal' | 'medium' | 'large';
  positioning?: 'default' | 'request-page';
}

export function BackToTopButton({ size = 'normal', positioning = 'default' }: BackToTopButtonProps) {
  const { settings } = useUiSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [rotation, setRotation] = useState(0);
  const lastScrollY = useRef(0);
  const accentColor = settings?.frontend_accent_color || '#ff00ff';

  // normal: base size (56px)
  // medium: 20% larger (67px) - for request page
  // large: 30% larger (73px) - for kiosk page
  const buttonSize = size === 'large' ? 73 : size === 'medium' ? 67 : 56;
  const centerLabelSize = size === 'large' ? 31 : size === 'medium' ? 29 : 24;
  const centerHoleSize = size === 'large' ? 10 : size === 'medium' ? 10 : 8;
  const iconSize = size === 'large' ? 'w-6 h-6' : size === 'medium' ? 'w-6 h-6' : 'w-5 h-5';
  const fontSize = size === 'large' ? '9' : size === 'medium' ? '8' : '7';

  // Positioning: request-page moves 10% higher (110px -> 121px) and 10% to right (16px/32px -> 17.6px/35.2px)
  const bottomPosition = positioning === 'request-page' ? '121px' : '100px';
  const rightClass = positioning === 'request-page' ? 'right-[17.6px] sm:right-[35.2px]' : 'right-4 sm:right-8';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show button when page is scrolled down 300px
      if (currentScrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      // Calculate rotation based on scroll direction and distance
      const scrollDelta = currentScrollY - lastScrollY.current;
      setRotation(prev => prev + scrollDelta * 0.5); // 0.5 is the rotation speed multiplier

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed ${rightClass} z-40 transition-all duration-300 hover:scale-110 active:scale-95`}
      style={{
        bottom: bottomPosition,
        width: `${buttonSize}px`,
        height: `${buttonSize}px`
      }}
      aria-label="Back to top"
    >
      {/* Vinyl Record */}
      <div
        className="relative w-full h-full rounded-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.1s linear',
          background: `radial-gradient(circle at center,
            #1a1a1a 0%,
            #1a1a1a 20%,
            #2d2d2d 20%,
            #2d2d2d 22%,
            #1a1a1a 22%,
            #1a1a1a 78%,
            #2d2d2d 78%,
            #2d2d2d 80%,
            #1a1a1a 80%,
            #1a1a1a 100%
          )`,
          boxShadow: `
            0 4px 20px rgba(0, 0, 0, 0.4),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1),
            0 0 20px ${accentColor}40
          `
        }}
      >
        {/* Curved Text */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            <path
              id="circlePath"
              d="M 50,50 m -35,0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
            />
          </defs>
          <text
            fill="rgba(255, 255, 255, 0.6)"
            fontSize={fontSize}
            fontWeight="600"
            letterSpacing="2"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            <textPath href="#circlePath" startOffset="0%">
              BACK TO TOP • BACK TO TOP •
            </textPath>
          </text>
        </svg>
        {/* Center Label */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full flex items-center justify-center"
          style={{
            width: `${centerLabelSize}px`,
            height: `${centerLabelSize}px`,
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            boxShadow: `0 2px 8px ${accentColor}60, inset 0 1px 0 rgba(255,255,255,0.3)`
          }}
        >
          {/* Center Hole */}
          <div
            className="rounded-full bg-black"
            style={{
              width: `${centerHoleSize}px`,
              height: `${centerHoleSize}px`,
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.8)'
            }}
          />
        </div>

        {/* Grooves (decorative lines) */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-full h-px opacity-20"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
              background: 'rgba(255, 255, 255, 0.1)'
            }}
          />
        ))}

        {/* Up Arrow Icon (doesn't rotate) */}
        <div
          className="absolute top-1/2 left-1/2 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(-${rotation}deg)`,
            transition: 'transform 0.1s linear'
          }}
        >
          <ChevronUp className={`${iconSize} text-white drop-shadow-lg`} />
        </div>
      </div>
    </button>
  );
}
