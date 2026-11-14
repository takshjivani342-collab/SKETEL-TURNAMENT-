import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Gamepad2 } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackSrc?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  showLoader?: boolean;
}

const APP_LOGO = "/assets/aistudio/file_00000000d12482108e623996537462ea_f1b955c6.png";
const DEFAULT_GAME_COVER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop";

function resolveSafeSrc(rawSrc?: string, fallback: string = APP_LOGO): string | undefined {
  if (!rawSrc) return undefined;
  const trimmed = rawSrc.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('i.ibb.co/v4v8Q5N/freefire.jpg')) return DEFAULT_GAME_COVER;
  if (trimmed.includes('i.ibb.co/XxVkbcW8/logo.png') || trimmed.includes('i.ibb.co/n8jPYbMP/image.png')) return APP_LOGO;
  return trimmed || fallback;
}

export default function SafeImage({ 
  src, 
  alt = "Image", 
  className = "", 
  imgClassName = "",
  fallbackSrc = APP_LOGO,
  objectFit = 'cover',
  showLoader = true
}: SafeImageProps) {
  const sanitized = resolveSafeSrc(src, fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(sanitized);

  useEffect(() => {
    const nextSrc = resolveSafeSrc(src, fallbackSrc);
    setIsLoading(true);
    setError(false);
    setCurrentSrc(nextSrc);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!error) {
      setError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If no source is provided at all, fallback immediately
  useEffect(() => {
    if (!sanitized) {
      setError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
    }
  }, [sanitized, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background / Placeholder during loading */}
      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-4">
        <img 
          src={APP_LOGO} 
          alt="App Logo Placeholder" 
          className="w-1/3 max-w-[64px] opacity-20 grayscale"
        />
        {isLoading && showLoader && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader2 className="text-purple-500 animate-spin" size={20} />
          </div>
        )}
      </div>

      {/* Main Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-${objectFit} relative z-10 ${imgClassName}`}
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      {/* Error State Overlay (Optional debug hint) */}
      {error && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none opacity-50">
          {/* We could show a small icon here if we want to indicate failure, but user wants clean fallback */}
        </div>
      )}
    </div>
  );
}
