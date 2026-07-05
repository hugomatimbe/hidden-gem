import { useEffect, useCallback } from 'react';
import Image from 'next/image';

interface LightboxProps {
  images: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

// Full-screen viewer for a single photo album — used for both the main gem
// gallery and the menu photos section. Images render with objectFit
// "contain" (never cropped), regardless of how they're cropped in their
// small thumbnail/polaroid form elsewhere on the page.
export default function Lightbox({ images, index, alt = '', onClose, onNavigate }: LightboxProps) {
  const goNext = useCallback(() => {
    onNavigate((index + 1) % images.length);
  }, [index, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + images.length) % images.length);
  }, [index, images.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent the page behind the modal from scrolling while it's open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, goNext, goPrev]);

  if (!images[index]) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
        aria-label="Fechar"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 md:left-6 text-white/80 hover:text-white p-2 z-10"
          aria-label="Anterior"
        >
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="relative w-full h-full max-w-5xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <Image src={images[index]} alt={alt} layout="fill" objectFit="contain" priority />
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 md:right-6 text-white/80 hover:text-white p-2 z-10"
          aria-label="Seguinte"
        >
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
