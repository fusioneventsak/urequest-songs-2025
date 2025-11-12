import React, { useState, useRef } from 'react';
import { Camera, User as UserIcon, AlertTriangle, UserCircle } from 'lucide-react';
import { resizeAndCompressImage, getOptimalCameraConstraints, getOptimalFileInputAccept, supportsHighQualityCapture } from '../utils/imageUtils';
import { dataURLtoBlob } from '../utils/photoStorage';
import { usePhotoStorage } from '../hooks/usePhotoStorage';
import { useUiSettings } from '../hooks/useUiSettings';
import { Logo } from './shared/Logo';
import type { User } from '../types';

interface LandingPageProps {
  onComplete: (user: User) => void;
  initialUser?: User | null;
}

// HD photo support with optimized compression for egress savings
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB limit for HD compressed photos
const MAX_INPUT_SIZE = 50 * 1024 * 1024; // 50MB max input size (supports all major phone brands)

export function LandingPage({ onComplete, initialUser }: LandingPageProps) {
  const [name, setName] = useState(initialUser?.name || '');
  const [photo, setPhoto] = useState<string>(initialUser?.photo || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { uploadPhoto, getDefaultAvatar } = usePhotoStorage();
  const { settings } = useUiSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get colors from settings
  const accentColor = settings?.frontend_accent_color || '#ff00ff';
  const bgColor = settings?.frontend_bg_color || '#13091f';
  const headerBgColor = settings?.frontend_header_bg || '#13091f';
  const songBorderColor = settings?.song_border_color || '#ff00ff';
  const logoUrl = settings?.band_logo_url || '';
  const bandName = settings?.band_name || 'uRequest Live';

  const startCamera = async () => {
    try {
      // Get optimal camera constraints based on device
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user', // Use front camera by default
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        console.log('Camera stream obtained, setting to video element');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, playing video');
          videoRef.current?.play().catch(e => {
            console.error('Error playing video:', e);
          });
        };
        setIsCapturing(true);
        setErrorMessage(null);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setErrorMessage('Could not access camera. Please check your permissions or try uploading a photo from your gallery instead.');
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      try {
        setIsProcessing(true);
        setErrorMessage(null);
        
        const context = canvasRef.current.getContext('2d');
        if (context) {
          // Set dimensions for the capture - higher resolution for better quality
          const width = 600; // Increased for better quality on all devices
          const height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * width;
          
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          context.drawImage(videoRef.current, 0, 0, width, height);
          
          const photoData = canvasRef.current.toDataURL('image/jpeg', 0.95); // HD quality initial capture

          try {
            // HD compression with defaults (800x800, 0.85 quality)
            const compressedPhoto = await resizeAndCompressImage(photoData);
            
            // Instead of storing base64 in state, upload to storage and store URL
            const userId = initialUser?.id || name.toLowerCase().replace(/\s+/g, '-');
            const photoUrl = await uploadPhoto(await dataURLtoBlob(compressedPhoto), userId);
            setPhoto(photoUrl);
            stopCamera();
          } catch (error) {
            if (error instanceof Error) {
              setErrorMessage(error.message);
            } else {
              setErrorMessage('Error processing your photo. Please try again.');
            }
          }
        }
      } catch (error) {
        console.error('Error capturing photo:', error);
        setErrorMessage('Error processing your photo. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        setErrorMessage(null);
        
        // Check if file is too large to process (before compression)
        if (file.size > MAX_INPUT_SIZE) {
          setErrorMessage(`Image file is too large (${Math.round(file.size/(1024*1024))}MB). Please select an image under ${Math.round(MAX_INPUT_SIZE/(1024*1024))}MB.`);
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            // HD compression with defaults (800x800, 0.85 quality) for uploaded photos
            const compressedPhoto = await resizeAndCompressImage(reader.result as string);
            
            // Instead of storing base64 in state, upload to storage and store URL
            const userId = initialUser?.id || name.toLowerCase().replace(/\s+/g, '-');
            const photoUrl = await uploadPhoto(await dataURLtoBlob(compressedPhoto), userId);
            setPhoto(photoUrl);
          } catch (error) {
            if (error instanceof Error) {
              setErrorMessage(error.message);
            } else {
              setErrorMessage('Error processing your photo. Please try a different image.');
            }
          } finally {
            setIsProcessing(false);
          }
        };
        reader.onerror = () => {
          setErrorMessage('Error reading the image file. Please try again.');
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error handling file upload:', error);
        setErrorMessage('An error occurred while processing your photo.');
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    
    // Use the photo URL or generate a default avatar
    const userPhoto = photo || getDefaultAvatar(name);
    
    onComplete({ 
      id: initialUser?.id || name.toLowerCase().replace(/\s+/g, '-'), 
      name, 
      photo: userPhoto 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: bgColor }}>
      <div
        className="glass-effect rounded-lg shadow-xl p-8 max-w-md w-full border relative overflow-hidden"
        style={{
          borderColor: `${songBorderColor}40`,
          boxShadow: `0 0 20px ${songBorderColor}30`,
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))`
        }}
      >
        {/* Glassy reflection effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 15%, rgba(255, 255, 255, 0.05) 30%, rgba(255, 255, 255, 0.08) 45%, rgba(255, 255, 255, 0.05) 60%, rgba(255, 255, 255, 0.02) 75%, transparent 100%)`,
            opacity: 0.4,
          }}
        />

        <div className="text-center mb-6 relative z-10">
          {/* Logo */}
          {logoUrl ? (
            <div className="mb-1">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-36 mx-auto block"
                style={{
                  filter: `drop-shadow(0 0 15px ${accentColor}60)`,
                  objectFit: 'contain',
                  maxWidth: '100%'
                }}
                onError={(e) => {
                  console.error('Logo failed to load:', logoUrl);
                  console.error('Logo URL was:', logoUrl);
                }}
              />
            </div>
          ) : (
            console.log('No logo URL provided, logoUrl:', logoUrl),
            null
          )}

          {initialUser ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2" style={{ color: accentColor, textShadow: `0 0 10px ${accentColor}` }}>
                Edit Profile
              </h1>
              <p className="text-gray-300">
                Update your profile information
              </p>
            </>
          ) : (
            <>
              <h1
                className="text-xl font-extrabold text-white mb-2 leading-tight tracking-wide"
                style={{
                  color: accentColor,
                  textShadow: `0 0 20px ${accentColor}, 0 0 10px ${accentColor}80`
                }}
              >
                GET READY TO CONTROL THE SHOW
              </h1>
              <p
                className="text-sm font-bold mb-3"
                style={{
                  color: songBorderColor,
                  textShadow: `0 0 8px ${songBorderColor}60`
                }}
              >
                WE ONLY PLAY THE MOST REQUESTED AND UPVOTED SONGS
              </p>
              <p className="text-gray-300 text-xs">
                Tell us who you are so you can start making requests
              </p>
            </>
          )}
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 mb-6 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-bold text-white mb-2" style={{ color: accentColor }}>
              MY NAME <span style={{ opacity: 0.7 }}>*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none transition-all"
              style={{
                backgroundColor: `${songBorderColor}10`,
                border: `1px solid ${songBorderColor}30`,
                boxShadow: `0 0 8px ${songBorderColor}20`
              }}
              onFocus={(e) => {
                e.target.style.borderColor = songBorderColor;
                e.target.style.boxShadow = `0 0 12px ${songBorderColor}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${songBorderColor}30`;
                e.target.style.boxShadow = `0 0 8px ${songBorderColor}20`;
              }}
              placeholder="Enter your name"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2" style={{ color: accentColor }}>
              MY PHOTO <span style={{ color: songBorderColor, fontWeight: 'normal' }}>(Optional)</span>
            </label>
            
            {isCapturing ? (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-lg"
                  style={{
                    border: `2px solid ${songBorderColor}`,
                    boxShadow: `0 0 12px ${songBorderColor}50`
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 rounded-lg font-extrabold tracking-wide uppercase text-sm transition-all transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center justify-center text-white shadow-lg"
                    style={{
                      backgroundColor: accentColor,
                      textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.3)',
                      boxShadow: `0 4px 15px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
                    }}
                  >
                    {isProcessing ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 text-sm hover:text-white transition-colors border rounded-md"
                    style={{
                      color: songBorderColor,
                      borderColor: `${songBorderColor}50`
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photo ? (
              <div className="space-y-3">
                <img
                  src={photo}
                  alt="Preview"
                  className="w-24 h-24 rounded-full mx-auto object-cover"
                  style={{
                    border: `3px solid ${songBorderColor}`,
                    boxShadow: `0 0 15px ${songBorderColor}60`
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="w-full px-3 py-1.5 text-xs hover:text-white transition-colors"
                  style={{ color: songBorderColor }}
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <UserCircle className="w-20 h-20 text-gray-400 mx-auto" />
                </div>
                <p className="text-center text-gray-400 text-xs">
                  A default avatar will be created
                </p>
                
                {/* Single button that handles both camera and gallery selection via file input */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 rounded-lg font-bold tracking-wide uppercase text-xs transition-all transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center justify-center text-white shadow-lg"
                  style={{
                    backgroundColor: accentColor,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    boxShadow: `0 3px 10px ${accentColor}40`,
                    border: `1px solid rgba(255,255,255,0.1)`
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  Upload Photo
                </button>

                {/* Hidden file input with accessibility label */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getOptimalFileInputAccept()}
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  aria-label="Upload profile photo"
                  title="Upload profile photo"
                />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isProcessing}
            className="w-full px-4 py-3 rounded-lg font-extrabold tracking-wide uppercase text-sm transition-all transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: accentColor,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              boxShadow: `0 4px 15px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
              border: `1px solid rgba(255,255,255,0.1)`,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
            }}
          >
            <UserIcon className="w-4 h-4 mr-2" />
            {initialUser ? 'Update Profile' : 'Continue to Song Requests'}
          </button>
        </form>
      </div>
    </div>
  );
}