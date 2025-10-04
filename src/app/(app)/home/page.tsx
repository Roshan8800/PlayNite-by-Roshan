"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, PlayCircle, Heart, MessageCircle, Share, Eye, Calendar } from "lucide-react";
import { useStories } from "@/hooks/use-content";
import { useRecommendedContent } from "@/hooks/use-content";
import { useContent } from "@/contexts/ContentContext";
import { mockUsers, mockImages, mockVideos } from "@/lib/mock-backend";
import { ImageData, VideoData, StoryData } from "@/lib/mock-backend";

export default function HomePage() {
  const { state: contentState, likeImage, likeVideo, markStoryViewed, isImageLiked, isVideoLiked, isStoryViewed } = useContent();

  // Use the new hooks for data fetching
  const {
    stories,
    loading: storiesLoading,
    error: storiesError
  } = useStories({ limit: 10 });

  const {
    data: recommendedData,
    loading: recommendedLoading,
    error: recommendedError
  } = useRecommendedContent();

  // Format data for display
  const recommendedImages = recommendedData?.images || [];
  const recommendedVideos = recommendedData?.videos || [];
  const reels = recommendedVideos.slice(0, 6); // Show first 6 videos as reels

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

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      {/* Stories Section */}
      <section>
        <h2 className="text-2xl font-headline tracking-tight mb-4">Stories</h2>

        {storiesError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Failed to load stories</p>
          </div>
        )}

        {storiesLoading ? (
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-2 flex-shrink-0">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-16 h-3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {stories.map((storyData) => (
              <div key={storyData.id} className="flex flex-col items-center space-y-2 flex-shrink-0">
                <div className={`relative w-20 h-20 rounded-full p-1 ${
                  storyData.isViewed
                    ? 'bg-muted'
                    : 'bg-gradient-to-tr from-accent to-primary'
                }`}>
                  <Avatar className="w-full h-full">
                    <AvatarImage
                      src={storyData.user.avatar}
                      alt={storyData.user.name}
                    />
                    <AvatarFallback>{storyData.user.name[0]}</AvatarFallback>
                  </Avatar>
                  {!storyData.isViewed && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate w-20 text-center">
                  {storyData.user.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Content Section */}
      <section>
        <h2 className="text-2xl font-headline tracking-tight mb-4">
          Recommended For You
        </h2>

        {recommendedError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">Failed to load recommended content</p>
          </div>
        )}

        {recommendedLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-full h-4" />
                      <Skeleton className="w-2/3 h-3" />
                      <Skeleton className="w-1/2 h-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommendedImages.slice(0, 4).map((image) => (
              <Card key={image.id} className="overflow-hidden group transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1">
                <CardHeader className="p-0 relative">
                  <Image
                    src={image.thumbnailUrl}
                    alt={image.title}
                    width={400}
                    height={225}
                    className="w-full h-auto aspect-video object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {image.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(image.views)}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex gap-3">
                  <Avatar>
                    <AvatarImage src={image.user.avatar} alt={image.user.name} />
                    <AvatarFallback>{image.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                      {image.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{image.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(image.likes)} likes &bull; {formatDate(image.uploadDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => likeImage(image.id, !isImageLiked(image.id))}
                      className={`p-1 ${isImageLiked(image.id) ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isImageLiked(image.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recommendedVideos.slice(0, 4).map((video) => (
              <Card key={video.id} className="overflow-hidden group transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1">
                <CardHeader className="p-0 relative">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={400}
                    height={225}
                    className="w-full h-auto aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-16 h-16 text-white/80" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {video.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(video.views)}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                    {video.duration}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex gap-3">
                  <Avatar>
                    <AvatarImage src={video.user.avatar} alt={video.user.name} />
                    <AvatarFallback>{video.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                      {video.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{video.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(video.likes)} likes &bull; {formatDate(video.uploadDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => likeVideo(video.id, !isVideoLiked(video.id))}
                      className={`p-1 ${isVideoLiked(video.id) ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isVideoLiked(video.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Reels Section */}
      <section>
        <h2 className="text-2xl font-headline tracking-tight mb-4">Reels</h2>

        {recommendedLoading ? (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="relative overflow-hidden rounded-lg">
                <Skeleton className="aspect-[9/16] w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {reels.map((reel) => (
              <div key={reel.id} className="relative overflow-hidden rounded-lg group cursor-pointer">
                <Image
                  src={reel.thumbnailUrl}
                  alt={reel.title}
                  width={270}
                  height={480}
                  className="w-full h-full object-cover aspect-[9/16] transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 text-white">
                  <p className="text-sm font-bold line-clamp-2">{reel.title}</p>
                  <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                    <PlayCircle className="w-3 h-3" />
                    {formatNumber(reel.views)}
                  </p>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {reel.category}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likeVideo(reel.id, !isVideoLiked(reel.id))}
                    className={`p-1 ${isVideoLiked(reel.id) ? 'text-red-500' : 'text-white/80'}`}
                  >
                    <Heart className={`w-4 h-4 ${isVideoLiked(reel.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
