import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Banner, Page } from '../types';
import SafeImage from './SafeImage';

interface HeroBannerCarouselProps {
  banners: Banner[];
  onPageChange: (page: Page, id?: string) => void;
}

// Fallback esports banners (Sketel Arena Tournaments)
const FALLBACK_BANNERS: Banner[] = [
  {
    id: 'esports-banner-1',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    redirectUrl: '',
    type: 'main',
    order: 1,
    isActive: true
  },
  {
    id: 'esports-banner-2',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
    redirectUrl: '',
    type: 'main',
    order: 2,
    isActive: true
  }
];

export default function HeroBannerCarousel({ banners, onPageChange }: HeroBannerCarouselProps) {
  const activeBanners = (banners && banners.length > 0) ? banners : FALLBACK_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const handleBannerClick = (banner: Banner) => {
    if (banner.redirectUrl) {
      const url = banner.redirectUrl.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
        return;
      }
    }
    // Default action: Open Tournaments
    onPageChange(Page.TOURNAMENTS, 'freefire');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
      }
    }
    touchStartX.current = null;
  };

  return (
    <section className="px-4 sm:px-5 mt-3.5">
      <div
        className="relative w-full aspect-[2.1/1] sm:aspect-[2.2/1] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#1e3461]/80 shadow-2xl bg-[#0a1226] select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => handleBannerClick(currentBanner)}
            className="w-full h-full relative cursor-pointer group flex items-center justify-between"
          >
            <>
              <SafeImage
                src={currentBanner.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop'}
                alt="Esports Banner"
                className="w-full h-full object-cover"
                imgClassName="group-hover:scale-105 transition-transform duration-700 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070d1e] via-[#070d1e]/80 to-transparent" />
              <div className="absolute inset-y-0 left-0 p-4 flex flex-col justify-center max-w-[70%] z-10">
                <h2 className="text-base sm:text-xl font-black italic uppercase tracking-tight text-white leading-none">
                  PLAY & WIN
                </h2>
                <h2 className="text-base sm:text-xl font-black italic uppercase tracking-tight text-amber-400 leading-none mt-1">
                  DAILY TOURNAMENTS
                </h2>
              </div>
            </>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Indicators */}
      {activeBanners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-4 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  : 'w-1 bg-[#1e3461] hover:bg-[#2e4d8e]'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

