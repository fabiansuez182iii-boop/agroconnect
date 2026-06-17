/**
 * ImageGallery component with Cloudinary optimizations.
 *
 * PhD-level features:
 * - Lazy loading with IntersectionObserver
 * - Blur placeholders (LQIP) for smooth transitions
 * - Responsive images with srcset
 * - Carousel navigation (keyboard + touch)
 * - Accessibility: ARIA labels, aria-live, focus management
 * - prefers-reduced-motion support
 * - Error fallback for broken images
 * - Touch/swipe support for mobile devices
 *
 * @see https://web.dev/lazy-loading/
 * @see https://web.dev/blur-up/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getResponsiveImageUrls } from '../../services/cloudinary';
import type { PropertyImage } from '../../types/property';

interface ImageGalleryProps {
  images: PropertyImage[];
  className?: string;
}

/**
 * ImageGallery component with carousel and lazy loading.
 */
export function ImageGallery({
  images,
  className = '',
}: ImageGalleryProps): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const currentImage = images[currentIndex];
  const urls = currentImage ? getResponsiveImageUrls(currentImage.publicId) : null;

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset loaded state when image changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [currentIndex]);

  const handleNext = useCallback((): void => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrevious = useCallback((): void => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case 'Home':
          event.preventDefault();
          setCurrentIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setCurrentIndex(images.length - 1);
          break;
      }
    },
    [handleNext, handlePrevious, images.length]
  );

  // Touch/swipe handlers
  const handleTouchStart = useCallback((event: React.TouchEvent): void => {
    touchStartRef.current = event.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent): void => {
      if (touchStartRef.current === null) return;

      const touchEnd = event.changedTouches[0].clientX;
      const diff = touchStartRef.current - touchEnd;
      const SWIPE_THRESHOLD = 50;

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
          handleNext();
        } else {
          handlePrevious();
        }
      }

      touchStartRef.current = null;
    },
    [handleNext, handlePrevious]
  );

  // Empty state
  if (images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}
        role="img"
        aria-label="No hay imágenes disponibles"
      >
        <p className="text-gray-500">No hay imágenes disponibles</p>
      </div>
    );
  }

  if (!currentImage || !urls) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}
        role="alert"
      >
        <p className="text-gray-500">Error al cargar imagen</p>
      </div>
    );
  }

  const transitionClass = prefersReducedMotion ? '' : 'transition-opacity duration-500';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden ${className}`}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-roledescription="carrusel"
      aria-label={`Galería de imágenes: ${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
    >
      {/* Blur placeholder (LQIP) */}
      {isInView && (
        <img
          src={urls.lqip}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
          fetchPriority="low"
        />
      )}

      {/* High-quality image */}
      {isInView && !hasError && (
        <img
          src={urls.medium}
          srcSet={`
            ${urls.small} 200w,
            ${urls.medium} 600w,
            ${urls.large} 1200w
          `}
          sizes="(max-width: 600px) 200px, (max-width: 1200px) 600px, 1200px"
          alt={currentImage.alt}
          className={`absolute inset-0 w-full h-full object-cover ${transitionClass} ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="text-center">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm text-gray-600">Error al cargar imagen</p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-agro-green"
            aria-label="Imagen anterior"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-agro-green"
            aria-label="Imagen siguiente"
          >
            <span aria-hidden="true">→</span>
          </button>

          {/* Image counter with aria-live for screen readers */}
          <div
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span aria-label={`Imagen ${currentIndex + 1} de ${images.length}`}>
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          {/* Dot indicators for accessibility */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
            role="tablist"
            aria-label="Indicadores de imagen"
          >
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
                }`}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Moderation status badge */}
      {currentImage.moderationStatus && (
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
            currentImage.moderationStatus === 'approved'
              ? 'bg-green-500 text-white'
              : currentImage.moderationStatus === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-yellow-500 text-black'
          }`}
          aria-label={`Estado de moderación: ${currentImage.moderationStatus}`}
        >
          {currentImage.moderationStatus === 'approved'
            ? '✓ Aprobada'
            : currentImage.moderationStatus === 'rejected'
              ? '✗ Rechazada'
              : '⏳ Pendiente'}
        </div>
      )}
    </div>
  );
}
