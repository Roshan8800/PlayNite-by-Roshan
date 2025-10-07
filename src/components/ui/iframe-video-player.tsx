"use client";

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface IframeVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
}

/**
 * IframeVideoPlayer - Component to handle iframe embed URLs from CSV data
 * Extracts the iframe src URL from HTML string and renders it properly
 */
export const IframeVideoPlayer: React.FC<IframeVideoPlayerProps> = ({
  src,
  poster,
  title,
  autoPlay = false,
  className
}) => {
  // Extract iframe src URL from HTML string
  const embedUrl = useMemo(() => {
    if (!src) return '';

    // Check if src is already a clean URL
    if (src.startsWith('http') && !src.includes('<iframe')) {
      return src;
    }

    // Extract src from iframe HTML string
    const srcMatch = src.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }

    return src;
  }, [src]);

  // Add autoplay parameter if needed
  const finalEmbedUrl = useMemo(() => {
    if (!embedUrl) return '';

    try {
      const url = new URL(embedUrl);
      if (autoPlay) {
        url.searchParams.set('autoplay', '1');
      }
      return url.toString();
    } catch {
      return embedUrl;
    }
  }, [embedUrl, autoPlay]);

  if (!finalEmbedUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-900", className)}>
        <p className="text-white text-sm">Invalid video URL</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      <iframe
        src={finalEmbedUrl}
        title={title || 'Video Player'}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default IframeVideoPlayer;
