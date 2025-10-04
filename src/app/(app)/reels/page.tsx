"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Film, Heart, MessageCircle, Share, Bookmark, Play, MoreVertical, TrendingUp, Users, Clock, Filter, Search, Upload, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useSearch } from "@/contexts/SearchContext";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import { UploadArea } from "@/components/ui/upload-area";
import { useUpload } from "@/hooks/use-upload";
import { VideoPlayer } from "@/components/ui/video-player";
import { videoStreamingService } from "@/lib/services/video-streaming-service";
import { videoManagementService } from "@/lib/services/video-management-service";
import { contentService } from "@/lib/services/content-service";
import { ErrorManager } from "@/lib/errors/ErrorManager";
import { ErrorCategory, ErrorSeverity } from "@/lib/errors/types";
import { ApiError } from "@/lib/types/api";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Video data will come from ContentContext

const categories = [
  { id: "all", label: "All", icon: Filter },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "following", label: "Following", icon: Users },
  { id: "foryou", label: "For You", icon: Clock }
];

export default function ReelsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedReel, setSelectedReel] = useState<any | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [preloadingReels, setPreloadingReels] = useState<Set<string>>(new Set());
  const [streamManifests, setStreamManifests] = useState<Map<string, any>>(new Map());
  const observerTarget = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { state: searchState, setQuery, performSearch } = useSearch();
  const {
    state: contentState,
    setVideosLoading,
    setVideosSuccess,
    setVideosError,
    likeVideo,
    saveVideo,
    isVideoLiked,
    isVideoSaved
  } = useContent();

  // Load videos data
  useEffect(() => {
    loadVideos();
  }, [selectedCategory, searchState.query]);

  const loadVideos = async () => {
    try {
      setVideosLoading(true);

      const filters: any = {};
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      if (searchState.query) {
        filters.search = searchState.query;
      }

      const response = await contentService.getVideos(filters);

      if (response.success) {
        setVideosSuccess(response.data, response.pagination || { page: 1, limit: 20, total: response.data.length, hasNext: false });
      } else {
        setVideosError(new ApiError({
          message: response.message || "Failed to load videos",
          code: "VIDEOS_LOAD_FAILED",
          statusCode: 500
        }));
      }
    } catch (error: any) {
      ErrorManager.getInstance().reportError(error, ErrorCategory.EXTERNAL_API, ErrorSeverity.HIGH, {
        component: 'ReelsPage',
        action: 'loadVideos',
        metadata: { selectedCategory, searchQuery: searchState.query }
      });

      setVideosError(new ApiError({
        message: error.message || "Failed to load videos",
        code: "VIDEOS_LOAD_FAILED",
        statusCode: 500
      }));
    }
  };

  const loadMoreVideos = async () => {
    if (loadingMore || !contentState.videosPagination?.hasNext) return;

    try {
      setLoadingMore(true);

      const filters: any = { page: (contentState.videosPagination?.page || 1) + 1 };
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      if (searchState.query) {
        filters.search = searchState.query;
      }

      const response = await contentService.getVideos(filters);

      if (response.success) {
        // Add new videos to existing ones
        const updatedVideos = [...contentState.videos, ...response.data];
        setVideosSuccess(updatedVideos, response.pagination || { page: 1, limit: 20, total: updatedVideos.length, hasNext: false });
      }
    } catch (error: any) {
      ErrorManager.getInstance().reportError(error, ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, {
        component: 'ReelsPage',
        action: 'loadMoreVideos'
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Set up infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && contentState.videosPagination?.hasNext && !loadingMore) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [contentState.videosPagination?.hasNext, loadingMore]);

  // Upload functionality
  const { uploadFiles, isUploading, uploadResults, addFiles, upload, removeFile, clearCompleted } = useUpload({
    onUploadComplete: (results) => {
      console.log('Upload completed:', results);
      // Refresh videos after successful upload
      loadVideos();
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
    }
  });

  // Preload video for better performance
  const preloadVideo = async (reel: any) => {
    if (preloadingReels.has(reel.id)) return;

    setPreloadingReels(prev => new Set([...prev, reel.id]));

    try {
      // Generate stream manifest for the video
      const manifest = await videoStreamingService.generateStreamManifest(
        reel.id,
        reel.videoUrl,
        {
          title: reel.title,
          description: reel.description,
          thumbnailUrl: reel.thumbnailUrl
        }
      );

      setStreamManifests(prev => new Map([...prev, [reel.id, manifest]]));

      // Preload the video
      await videoStreamingService.preloadVideo(reel.videoUrl);

    } catch (error) {
      console.error('Failed to preload video:', error);
    } finally {
      setPreloadingReels(prev => {
        const newSet = new Set(prev);
        newSet.delete(reel.id);
        return newSet;
      });
    }
  };

  // Get optimal stream URL for a reel
  const getOptimalStreamUrl = async (reel: any) => {
    try {
      const manifest = streamManifests.get(reel.id);
      return await videoStreamingService.getOptimalStreamUrl(reel.id, manifest);
    } catch (error) {
      console.error('Failed to get optimal stream URL:', error);
      return reel.videoUrl;
    }
  };

  const filteredReels = contentState.videos.filter((reel: any) => {
    const matchesCategory = selectedCategory === "all" || reel.category === selectedCategory;
    const matchesSearch = searchState.query === "" ||
      reel.title?.toLowerCase().includes(searchState.query.toLowerCase()) ||
      reel.description?.toLowerCase().includes(searchState.query.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLike = (reelId: string) => {
    likeVideo(reelId, !isVideoLiked(reelId));
  };

  const handleSave = (reelId: string) => {
    saveVideo(reelId, !isVideoSaved(reelId));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Infinite scroll is handled by the useEffect above

  return (
    <ErrorBoundary componentName="ReelsPage" showErrorDetails={process.env.NODE_ENV === 'development'}>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-headline flex items-center gap-3">
            <Film className="text-primary" />
            Reels
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and share amazing video content
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search reels..."
              value={searchState.query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {filteredReels.length} videos
            </Badge>

            {/* Auto-play Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={autoPlayEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
              >
                <Play className="mr-2 h-4 w-4" />
                Auto-play
              </Button>

              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
                Sound
              </Button>
            </div>

            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload Reel
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Video Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredReels.map((reel) => (
          <Card key={reel.id} className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-0">
              {/* Video Thumbnail */}
              <div className="relative aspect-[9/16] overflow-hidden">
                <Image
                  src={reel.thumbnailUrl}
                  alt={reel.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-4">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {reel.duration}
                </div>

                {/* Views Count */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {formatNumber(reel.views)}
                </div>

                {/* Enhanced Video Player Modal */}
                <Dialog>
                  <DialogTrigger asChild>
                    <div
                      className="absolute inset-0 cursor-pointer"
                      onMouseEnter={() => preloadVideo(reel)}
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl w-full p-0 bg-black overflow-hidden">
                    <div className="relative">
                      <VideoPlayer
                        src={reel.videoUrl}
                        poster={reel.thumbnailUrl}
                        title={reel.title}
                        autoPlay={autoPlayEnabled}
                        muted={!soundEnabled}
                        controls={true}
                        showTitle={true}
                        enableKeyboardShortcuts={true}
                        enablePictureInPicture={true}
                        className="w-full aspect-video"
                        onPlay={() => {
                          // Track video play analytics
                          videoManagementService.updateVideoAnalytics(reel.id, 'view', {
                            watchTime: 0,
                            duration: reel.duration
                          });
                        }}
                        onTimeUpdate={(currentTime, duration) => {
                          // Track watch time for analytics
                          if (currentTime > 0) {
                            videoManagementService.updateVideoAnalytics(reel.id, 'view', {
                              watchTime: currentTime,
                              duration: duration
                            });
                          }
                        }}
                        onEnded={() => {
                          // Track video completion
                          videoManagementService.updateVideoAnalytics(reel.id, 'view', {
                            watchTime: parseFloat(reel.duration),
                            duration: parseFloat(reel.duration)
                          });
                        }}
                      />

                      {/* Video Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <div className="flex items-end justify-between text-white">
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-2">{reel.title}</h2>
                            <p className="text-gray-300 mb-4 line-clamp-2">{reel.description}</p>

                            {/* User Info */}
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={reel.user.avatar} alt={reel.user.name} />
                                <AvatarFallback>{reel.user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{reel.user.name}</span>
                                  {reel.user.verified && (
                                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {formatNumber(reel.views)} views • {formatDate(reel.uploadDate)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLike(reel.id)}
                              className={`text-white hover:bg-white/20 ${isVideoLiked(reel.id) ? 'text-red-500' : ''}`}
                            >
                              <Heart className={`w-5 h-5 ${isVideoLiked(reel.id) ? 'fill-current' : ''}`} />
                              <span className="ml-2">{formatNumber(reel.likes)}</span>
                            </Button>

                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                              <MessageCircle className="w-5 h-5" />
                              <span className="ml-2">{formatNumber(reel.comments)}</span>
                            </Button>

                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                              <Share className="w-5 h-5" />
                              <span className="ml-2">{formatNumber(reel.shares)}</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSave(reel.id)}
                              className={`text-white hover:bg-white/20 ${isVideoSaved(reel.id) ? 'text-primary' : ''}`}
                            >
                              <Bookmark className={`w-5 h-5 ${isVideoSaved(reel.id) ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Video Info */}
              <div className="p-4">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={reel.user.avatar} alt={reel.user.name} />
                    <AvatarFallback>{reel.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{reel.user.name}</span>
                      {reel.user.verified && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(reel.uploadDate)}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {/* Video Title & Description */}
                <div className="mb-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{reel.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{reel.description}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(reel.id)}
                      className={`p-2 ${isVideoLiked(reel.id) ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isVideoLiked(reel.id) ? 'fill-current' : ''}`} />
                      <span className="ml-1 text-xs">{formatNumber(reel.likes)}</span>
                    </Button>

                    <Button variant="ghost" size="sm" className="p-2">
                      <MessageCircle className="w-4 h-4" />
                      <span className="ml-1 text-xs">{formatNumber(reel.comments)}</span>
                    </Button>

                    <Button variant="ghost" size="sm" className="p-2">
                      <Share className="w-4 h-4" />
                      <span className="ml-1 text-xs">{formatNumber(reel.shares)}</span>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(reel.id)}
                    className={`p-2 ${isVideoSaved(reel.id) ? 'text-primary' : ''}`}
                  >
                    <Bookmark className={`w-4 h-4 ${isVideoSaved(reel.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <Skeleton className="aspect-[9/16] w-full" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-16 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-3/4 h-4" />
                  <div className="flex gap-2">
                    <Skeleton className="w-16 h-6" />
                    <Skeleton className="w-16 h-6" />
                    <Skeleton className="w-16 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="h-10" />

      {/* Load More Button (Alternative to infinite scroll) */}
      {!contentState.videosLoading && contentState.videosPagination?.hasNext && (
        <div className="text-center mt-8">
          <Button onClick={loadMoreVideos} variant="outline" size="lg">
            Load More Reels
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
          </DialogHeader>

          <UploadArea
            onFilesSelected={addFiles}
            onUpload={async (files, options) => {
              await upload(files, options);
              setShowUploadDialog(false);
            }}
            multiple={true}
            maxFiles={10}
            acceptedTypes="video/*"
            maxSize={100 * 1024 * 1024} // 100MB
          />
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}
