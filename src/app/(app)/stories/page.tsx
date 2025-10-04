"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { History, Heart, MessageCircle, Share, Plus, MoreVertical, TrendingUp, Users, Clock, Filter, Eye, Calendar, Play, X, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useSearch } from "@/contexts/SearchContext";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import { contentService } from "@/lib/services/content-service";
import { ErrorManager } from "@/lib/errors/ErrorManager";
import { ErrorCategory, ErrorSeverity } from "@/lib/errors/types";
import { ApiError } from "@/lib/types/api";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Story data will come from ContentContext

const categories = [
  { id: "all", label: "All", icon: Filter },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "popular", label: "Popular", icon: TrendingUp },
  { id: "following", label: "Following", icon: Users }
];

export default function StoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { state: searchState, setQuery, performSearch } = useSearch();
  const {
    state: contentState,
    setStoriesLoading,
    setStoriesSuccess,
    setStoriesError,
    markStoryViewed,
    likeImage,
    isImageLiked,
    isStoryViewed
  } = useContent();

  // Load stories data
  useEffect(() => {
    loadStories();
  }, [selectedCategory, searchState.query]);

  const loadStories = async () => {
    try {
      setStoriesLoading(true);

      const filters: any = {};
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      if (searchState.query) {
        filters.search = searchState.query;
      }

      const response = await contentService.getStories(filters);

      if (response.success) {
        setStoriesSuccess(response.data, response.pagination || { page: 1, limit: 20, total: response.data.length, hasNext: false });
      } else {
        setStoriesError(new ApiError({
          message: response.message || "Failed to load stories",
          code: "STORIES_LOAD_FAILED",
          statusCode: 500
        }));
      }
    } catch (error: any) {
      ErrorManager.getInstance().reportError(error, ErrorCategory.EXTERNAL_API, ErrorSeverity.HIGH, {
        component: 'StoriesPage',
        action: 'loadStories',
        metadata: { selectedCategory, searchQuery: searchState.query }
      });

      setStoriesError(new ApiError({
        message: error.message || "Failed to load stories",
        code: "STORIES_LOAD_FAILED",
        statusCode: 500
      }));
    }
  };

  const loadMoreStories = async () => {
    if (loadingMore || !contentState.storiesPagination?.hasNext) return;

    try {
      setLoadingMore(true);

      const filters: any = { page: (contentState.storiesPagination?.page || 1) + 1 };
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      if (searchState.query) {
        filters.search = searchState.query;
      }

      const response = await contentService.getStories(filters);

      if (response.success) {
        // Add new stories to existing ones
        const updatedStories = [...contentState.stories, ...response.data];
        setStoriesSuccess(updatedStories, response.pagination || { page: 1, limit: 20, total: updatedStories.length, hasNext: false });
      }
    } catch (error: any) {
      ErrorManager.getInstance().reportError(error, ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, {
        component: 'StoriesPage',
        action: 'loadMoreStories'
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Set up infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && contentState.storiesPagination?.hasNext && !loadingMore) {
          loadMoreStories();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [contentState.storiesPagination?.hasNext, loadingMore]);

  const filteredStories = contentState.stories.filter(story => {
    const matchesCategory = selectedCategory === "all" || story.category === selectedCategory;
    const matchesSearch = searchState.query === "" ||
      story.user?.name?.toLowerCase().includes(searchState.query.toLowerCase()) ||
      story.stories?.some((s: any) => s.caption?.toLowerCase().includes(searchState.query.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLike = (storyId: string) => {
    // For stories, we'll treat them as images for the like functionality
    likeImage(storyId, !isImageLiked(storyId));
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
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "1d ago";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Infinite scroll is handled by the useEffect above

  const openStoryViewer = (story: any) => {
    setSelectedStory(story);
    setCurrentStoryIndex(0);
    setStoryProgress(0);

    // Mark story as viewed
    if (story.stories && story.stories.length > 0) {
      markStoryViewed(story.stories[0].id);
    }
  };

  const closeStoryViewer = () => {
    setSelectedStory(null);
    setCurrentStoryIndex(0);
    setStoryProgress(0);
  };

  const nextStory = () => {
    if (!selectedStory) return;

    if (currentStoryIndex < selectedStory.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setStoryProgress(0);
    } else {
      // Move to next user's story
      const currentIndex = filteredStories.findIndex(s => s.id === selectedStory.id);
      if (currentIndex < filteredStories.length - 1) {
        const nextStory = filteredStories[currentIndex + 1];
        setSelectedStory(nextStory);
        setCurrentStoryIndex(0);
        setStoryProgress(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const prevStory = () => {
    if (!selectedStory) return;

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setStoryProgress(0);
    } else {
      // Move to previous user's story
      const currentIndex = filteredStories.findIndex(s => s.id === selectedStory.id);
      if (currentIndex > 0) {
        const prevStoryData = filteredStories[currentIndex - 1];
        setSelectedStory(prevStoryData);
        setCurrentStoryIndex(prevStoryData.stories.length - 1);
        setStoryProgress(0);
      }
    }
  };

  // Auto-advance story
  useEffect(() => {
    if (!selectedStory) return;

    const timer = setTimeout(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2; // Increment by 2% every 100ms = 5 seconds total
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [storyProgress, selectedStory, currentStoryIndex]);

  return (
    <ErrorBoundary componentName="StoriesPage" showErrorDetails={process.env.NODE_ENV === 'development'}>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-headline flex items-center gap-3">
            <History className="text-primary" />
            Stories
          </h1>
          <p className="text-muted-foreground mt-2">
            Share moments and connect with your community
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search stories..."
              value={searchState.query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Story
          </Button>
          <Badge variant="secondary" className="text-sm">
            {filteredStories.length} stories
          </Badge>
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

      {/* Stories Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredStories.map((story) => (
          <Card key={story.id} className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-0">
              {/* Story Avatar with Progress Ring */}
              <div className="relative p-4 pb-2">
                <div className="relative">
                  <Avatar className={`w-16 h-16 border-2 ${story.isViewed ? 'border-muted' : 'border-primary'} transition-colors`}>
                    <AvatarImage src={story.user.avatar} alt={story.user.name} />
                    <AvatarFallback>{story.user.name[0]}</AvatarFallback>
                  </Avatar>

                  {/* Progress Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-primary ${story.isViewed ? 'opacity-30' : 'opacity-100'}`}
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (story.isViewed ? 1 : 0)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Verified Badge */}
                  {story.user.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{story.user.name}</span>
                    {story.user.verified && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(story.stories[0].timestamp)}
                  </div>
                </div>
              </div>

              {/* Story Preview */}
              <div className="relative aspect-[9/16] overflow-hidden">
                <Image
                  src={story.stories[0].imageUrl}
                  alt={story.stories[0].caption}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Story Count Badge */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {story.stories.length}
                </div>

                {/* Views Count */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatNumber(story.stories.reduce((acc, s) => acc + s.views, 0))}
                </div>

                {/* Story Viewer Trigger */}
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="absolute inset-0 cursor-pointer" onClick={() => openStoryViewer(story)} />
                  </DialogTrigger>
                </Dialog>
              </div>

              {/* Story Actions */}
              <div className="p-4 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(story.id)}
                      className={`p-2 ${isImageLiked(story.id) ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isImageLiked(story.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <Button variant="ghost" size="sm" className="p-2">
                      <MessageCircle className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="sm" className="p-2">
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" className="p-2">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {/* Story Caption */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {story.stories[0].caption}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading More Indicator */}
      {contentState.storiesLoading && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 pb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-16 h-3" />
                    </div>
                  </div>
                </div>
                <Skeleton className="aspect-[9/16] w-full" />
                <div className="p-4 pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="w-8 h-6" />
                    <Skeleton className="w-8 h-6" />
                    <Skeleton className="w-8 h-6" />
                  </div>
                  <Skeleton className="w-full h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="h-10" />

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative w-full h-full max-w-md mx-auto">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeStoryViewer}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4">
              <Progress value={storyProgress} className="h-1 bg-white/20" />
            </div>

            {/* Story Content */}
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={selectedStory.stories[currentStoryIndex].imageUrl}
                alt={selectedStory.stories[currentStoryIndex].caption}
                fill
                className="object-contain"
              />

              {/* Story Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={selectedStory.user.avatar} alt={selectedStory.user.name} />
                    <AvatarFallback>{selectedStory.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{selectedStory.user.name}</span>
                      {selectedStory.user.verified && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white/80 text-xs">{formatDate(selectedStory.stories[currentStoryIndex].timestamp)}</p>
                  </div>
                </div>

                <p className="text-white text-sm">{selectedStory.stories[currentStoryIndex].caption}</p>

                {/* Story Actions */}
                <div className="flex items-center gap-4 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(selectedStory.id)}
                    className={`text-white hover:bg-white/20 ${isImageLiked(selectedStory.id) ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-4 h-4 ${isImageLiked(selectedStory.id) ? 'fill-current' : ''}`} />
                  </Button>

                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <MessageCircle className="w-4 h-4" />
                  </Button>

                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Navigation Areas */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
                onClick={prevStory}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
                onClick={nextStory}
              />
              <div
                className="absolute left-1/3 right-1/3 top-1/2 bottom-1/2 cursor-pointer"
                onClick={nextStory}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}
