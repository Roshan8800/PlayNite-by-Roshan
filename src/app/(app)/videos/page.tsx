import React from 'react';
import EnhancedVideoGallery from '@/components/EnhancedVideoGallery';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enhanced Video Gallery - PlayNite',
  description: 'Browse and watch videos from massive CSV database (530K+ videos) with advanced filtering, search, HD/VR support, and comprehensive metadata.',
  keywords: ['videos', 'gallery', 'csv', 'streaming', 'player', 'pornhub', 'database', 'hd', 'vr'],
};

export default function VideosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <EnhancedVideoGallery
          databasePath="/pornhub-database/pornhub.com-db.csv"
          maxVideos={1000}
          enableAdvancedFilters={true}
          showStats={true}
        />
      </div>
    </div>
  );
}