"use client";

import React, { useState, useEffect } from 'react';
import { IframeVideoPlayer } from '@/components/ui/iframe-video-player';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Search, Filter, Grid, List, Clock, Eye, ThumbsUp } from 'lucide-react';
import { PornhubDataParser, PlayNiteContentStructure, PornhubVideoMetadata, createSampleData } from '@/lib/services/pornhub-data-parser';
import PornhubParserExample from '@/lib/services/pornhub-parser-usage';

interface VideoGalleryProps {
  csvFilePath?: string;
  autoLoad?: boolean;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({
  csvFilePath = '/src/lib/services/pornhub-videos-sample.csv',
  autoLoad = true
}) => {
  const [contentData, setContentData] = useState<PlayNiteContentStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<PornhubVideoMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load CSV data on component mount
  useEffect(() => {
    if (autoLoad) {
      loadVideoData();
    }
  }, [autoLoad]);

  const loadVideoData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading video data from CSV...');

      // In a real application, this would fetch from the server
      // For demo purposes, we'll use the sample data
      const sampleVideos = createSampleData();

      const mockContentData: PlayNiteContentStructure = {
        videos: sampleVideos,
        metadata: {
          totalCount: sampleVideos.length,
          sources: ['brazzers.com', 'cumbots.com'],
          categories: ['Brunette', 'Toys', 'Pornstar', 'Big Tits', 'Blowjob'],
          performers: ['Gen Padova', 'Mandy May'],
          processedAt: new Date().toISOString(),
          dataVersion: '1.0.0'
        }
      };

      setContentData(mockContentData);
      console.log(`Loaded ${sampleVideos.length} videos from CSV data`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load video data';
      setError(errorMessage);
      console.error('Error loading video data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter videos based on search and filters
  const filteredVideos = contentData?.videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.performers.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         video.categories.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || video.categories.includes(selectedCategory);
    const matchesSource = selectedSource === 'all' || video.source === selectedSource;

    return matchesSearch && matchesCategory && matchesSource;
  }) || [];

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format view count for display
  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading videos from CSV data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center text-red-500">
          <p className="text-lg font-semibold mb-2">Error Loading Videos</p>
          <p className="mb-4">{error}</p>
          <Button onClick={loadVideoData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Video Gallery</h1>
        <p className="text-muted-foreground mb-6">
          Videos loaded from CSV data with {contentData?.videos.length || 0} total videos
        </p>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search videos, performers, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {contentData?.metadata.categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {contentData?.metadata.sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredVideos.length} of {contentData?.videos.length || 0} videos</span>
          {searchTerm && <span>Search: "{searchTerm}"</span>}
          {selectedCategory !== 'all' && <span>Category: {selectedCategory}</span>}
          {selectedSource !== 'all' && <span>Source: {selectedSource}</span>}
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            >
              ✕
            </Button>

            <div className="bg-background rounded-lg overflow-hidden">
              <div className="aspect-video">
                <IframeVideoPlayer
                  src={selectedVideo.embedUrl}
                  poster={selectedVideo.primaryThumbnail}
                  title={selectedVideo.title}
                  autoPlay={true}
                  className="w-full h-full"
                />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{selectedVideo.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(selectedVideo.duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {formatViewCount(selectedVideo.viewCount)}
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {selectedVideo.likes}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">Source: {selectedVideo.source}</Badge>
                  {selectedVideo.categories.map(category => (
                    <Badge key={category} variant="outline">{category}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedVideo.performers.map(performer => (
                    <Badge key={performer} variant="default">{performer}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid/List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No videos found matching your criteria.</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredVideos.map((video, index) => (
            <Card
              key={`${video.videoId || index}`}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                viewMode === 'list' ? 'flex' : ''
              }`}
              onClick={() => setSelectedVideo(video)}
            >
              <div className={viewMode === 'list' ? 'flex-shrink-0 w-48' : ''}>
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={video.primaryThumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
              </div>

              <CardContent className={viewMode === 'list' ? 'flex-1' : 'p-4'}>
                <CardTitle className={`line-clamp-2 ${viewMode === 'list' ? 'text-lg' : 'text-base'}`}>
                  {video.title}
                </CardTitle>

                <CardDescription className="mt-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatViewCount(video.viewCount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {video.likes}
                    </div>
                  </div>
                </CardDescription>

                <div className="mt-3 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {video.source}
                  </Badge>
                  {video.categories.slice(0, 2).map(category => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>

                {viewMode === 'list' && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {video.performers.map(performer => (
                      <Badge key={performer} variant="default" className="text-xs">
                        {performer}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoGallery;