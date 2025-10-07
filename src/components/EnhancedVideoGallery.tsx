"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { IframeVideoPlayer } from '@/components/ui/iframe-video-player';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Search,
  Filter,
  Grid,
  List,
  Clock,
  Eye,
  ThumbsUp,
  MessageCircle,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Award,
  Users,
  Database,
  Monitor,
  Glasses
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoMetadata, VideoQuery, VideoDatabaseStats } from '@/lib/services/video-database-service';

interface EnhancedVideoGalleryProps {
  databasePath?: string;
  maxVideos?: number;
  enableAdvancedFilters?: boolean;
  showStats?: boolean;
}

export const EnhancedVideoGallery: React.FC<EnhancedVideoGalleryProps> = ({
  databasePath = '/pornhub-database/pornhub.com-db.csv',
  maxVideos = 1000,
  enableAdvancedFilters = true,
  showStats = true
}) => {
  // State management
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VideoDatabaseStats | null>(null);

  // Query state
  const [query, setQuery] = useState<VideoQuery>({
    page: 1,
    limit: 20,
    sortBy: 'views',
    sortOrder: 'desc'
  });

  // UI state
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [availableFilters, setAvailableFilters] = useState<{
    sources: string[];
    categories: string[];
    performers: string[];
  }>({ sources: [], categories: [], performers: [] });

  // Load initial data
  useEffect(() => {
    loadVideos();
    loadStats();
    loadFilterOptions();
  }, []);

  // Reload videos when query changes
  useEffect(() => {
    if (query.page !== 1) {
      loadVideos();
    }
  }, [query]);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading videos with query:', query);

      const response = await fetch(`/api/videos/database?${new URLSearchParams({
        page: query.page?.toString() || '1',
        limit: query.limit?.toString() || '20',
        search: query.search || '',
        category: query.category || '',
        source: query.source || '',
        performer: query.performer || '',
        sortBy: query.sortBy || 'views',
        sortOrder: query.sortOrder || 'desc',
        ...(query.minDuration && { minDuration: query.minDuration.toString() }),
        ...(query.maxDuration && { maxDuration: query.maxDuration.toString() }),
        ...(query.minViews && { minViews: query.minViews.toString() }),
        ...(query.isHD !== undefined && { isHD: query.isHD.toString() }),
        ...(query.isVR !== undefined && { isVR: query.isVR.toString() })
      })}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setVideos(data.videos);
      console.log(`Loaded ${data.videos.length} videos`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load videos';
      setError(errorMessage);
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/videos/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/videos/filters');
      if (response.ok) {
        const data = await response.json();
        setAvailableFilters(data);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  // Update query and reload
  const updateQuery = (updates: Partial<VideoQuery>) => {
    setQuery(prev => ({ ...prev, ...updates, page: 1 }));
  };

  // Reset to first page when filters change
  useEffect(() => {
    loadVideos();
  }, [query.search, query.category, query.source, query.performer, query.sortBy, query.sortOrder]);

  // Format helpers
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (error && videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center text-red-500">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Videos</p>
          <p className="mb-4">{error}</p>
          <Button onClick={loadVideos}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Stats */}
      {showStats && stats && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalVideos)}</div>
                <div className="text-sm text-muted-foreground">Total Videos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalViews)}</div>
                <div className="text-sm text-muted-foreground">Total Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.sources.length}</div>
                <div className="text-sm text-muted-foreground">Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{formatDuration(stats.averageDuration)}</div>
                <div className="text-sm text-muted-foreground">Avg Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Gallery Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced Video Gallery</h1>
            <p className="text-muted-foreground">
              {formatNumber(stats?.totalVideos || 530672)} videos • Advanced filtering & search
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search videos, performers, categories, or tags..."
            value={query.search || ''}
            onChange={(e) => updateQuery({ search: e.target.value })}
            className="pl-10 text-lg"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && enableAdvancedFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={query.category || ''} onValueChange={(value) => updateQuery({ category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {availableFilters.categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Filter */}
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={query.source || ''} onValueChange={(value) => updateQuery({ source: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sources</SelectItem>
                      {availableFilters.sources.map(source => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={query.sortBy || 'views'} onValueChange={(value) => updateQuery({ sortBy: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">Most Viewed</SelectItem>
                      <SelectItem value="date">Newest</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select value={query.sortOrder || 'desc'} onValueChange={(value) => updateQuery({ sortOrder: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quality Filters */}
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hd-filter"
                    checked={query.isHD || false}
                    onCheckedChange={(checked) => updateQuery({ isHD: checked })}
                  />
                  <Label htmlFor="hd-filter" className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    HD Only
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="vr-filter"
                    checked={query.isVR || false}
                    onCheckedChange={(checked) => updateQuery({ isVR: checked })}
                  />
                  <Label htmlFor="vr-filter" className="flex items-center gap-2">
                    <Glasses className="w-4 h-4" />
                    VR Content
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Duration Filter */}
              <div className="space-y-2">
                <Label>Duration Range: {formatDuration(query.minDuration || 0)} - {formatDuration(query.maxDuration || 3600)}</Label>
                <div className="px-2">
                  <Slider
                    value={[query.minDuration || 0, query.maxDuration || 3600]}
                    onValueChange={([min, max]) => updateQuery({ minDuration: min, maxDuration: max })}
                    max={3600}
                    step={60}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading videos...</p>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl">
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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-2">{selectedVideo.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                      {selectedVideo.commentCount && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {formatNumber(selectedVideo.commentCount)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedVideo.isHD && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Monitor className="w-3 h-3 mr-1" />
                        HD
                      </Badge>
                    )}
                    {selectedVideo.isVR && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Glasses className="w-3 h-3 mr-1" />
                        VR
                      </Badge>
                    )}
                    <Badge variant="outline">{selectedVideo.source}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
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
      {!loading && videos.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {videos.map((video, index) => (
            <Card
              key={`${video.videoId || index}`}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => setSelectedVideo(video)}
            >
              <div className={viewMode === 'list' ? 'flex-shrink-0 w-48' : ''}>
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={video.primaryThumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                  {video.isHD && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-blue-500/80 text-white text-xs">
                        <Monitor className="w-3 h-3 mr-1" />
                        HD
                      </Badge>
                    </div>
                  )}
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
                      {formatNumber(video.likes)}
                    </div>
                    {video.commentCount && video.commentCount > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {formatNumber(video.commentCount)}
                      </div>
                    )}
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

      {/* Empty State */}
      {!loading && videos.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No videos found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
          <Button onClick={() => updateQuery({ search: '', category: '', source: '' })}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Pagination would go here */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateQuery({ page: (query.page || 1) - 1 })}
          disabled={(query.page || 1) <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Page {query.page || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => updateQuery({ page: (query.page || 1) + 1 })}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EnhancedVideoGallery;