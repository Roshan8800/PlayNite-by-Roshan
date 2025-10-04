"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Upload,
  Search,
  Filter,
  Heart,
  MessageCircle,
  Share,
  Download,
  MoreVertical,
  Eye,
  Calendar,
  Tag,
  User,
  Plus,
  X,
  Edit3,
  Trash2,
  Copy,
  Grid,
  List,
  ImageIcon,
  Camera,
  Palette,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  SlidersHorizontal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useSearch } from "@/contexts/SearchContext";
import { useImages } from "@/hooks/use-content";
import { useContent } from "@/contexts/ContentContext";
import { contentService } from "@/lib/services/content-service";
import { ApiError } from "@/lib/types/api";
import { UploadArea } from "@/components/ui/upload-area";
import { useUpload } from "@/hooks/use-upload";

// Enhanced image data structure
interface ImageData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: 'photos' | 'art' | 'ai-generated' | 'screenshots' | 'memes' | 'wallpapers';
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  downloads: number;
  uploadDate: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

// Mock enhanced images data
const mockImagesData: ImageData[] = [
  {
    id: "img-1",
    title: "Mountain Landscape",
    description: "A breathtaking view of snow-capped mountains at sunrise, captured during my hiking trip in the Swiss Alps.",
    imageUrl: PlaceHolderImages.find(img => img.id === "story-4")?.imageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    thumbnailUrl: PlaceHolderImages.find(img => img.id === "story-4")?.imageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["nature", "mountains", "sunrise", "landscape", "travel"],
    views: 1247,
    likes: 89,
    comments: 12,
    shares: 5,
    downloads: 23,
    uploadDate: "2024-01-15T08:30:00Z",
    user: {
      id: "user-1",
      name: "Sarah Johnson",
      avatar: PlaceHolderImages.find(img => img.id === "story-1")?.imageUrl || "",
      verified: true
    },
    dimensions: { width: 1920, height: 1080 },
    fileSize: "2.4 MB",
    isLiked: false,
    isBookmarked: true
  },
  {
    id: "img-2",
    title: "Digital Art Portrait",
    description: "AI-generated portrait of a futuristic cyberpunk character with neon lighting effects.",
    imageUrl: PlaceHolderImages.find(img => img.id === "video-5")?.imageUrl || "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=800&h=800&fit=crop",
    thumbnailUrl: PlaceHolderImages.find(img => img.id === "video-5")?.imageUrl || "https://images.unsplash.com/photo-1672236959779-1a1dcf0b0ab6?w=400&h=400&fit=crop",
    category: "ai-generated",
    tags: ["ai-art", "cyberpunk", "portrait", "digital", "neon"],
    views: 2156,
    likes: 156,
    comments: 28,
    shares: 12,
    downloads: 45,
    uploadDate: "2024-01-14T14:20:00Z",
    user: {
      id: "user-2",
      name: "Mike Chen",
      avatar: PlaceHolderImages.find(img => img.id === "story-2")?.imageUrl || "",
      verified: false
    },
    dimensions: { width: 1024, height: 1024 },
    fileSize: "1.8 MB",
    isLiked: true,
    isBookmarked: false
  },
  {
    id: "img-3",
    title: "City Night Lights",
    description: "Urban photography showcasing the beautiful cityscape at night with light trails from traffic.",
    imageUrl: PlaceHolderImages.find(img => img.id === "video-3")?.imageUrl || "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=800&h=600&fit=crop",
    thumbnailUrl: PlaceHolderImages.find(img => img.id === "video-3")?.imageUrl || "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?w=400&h=300&fit=crop",
    category: "photos",
    tags: ["city", "night", "lights", "urban", "long-exposure"],
    views: 3421,
    likes: 234,
    comments: 45,
    shares: 18,
    downloads: 67,
    uploadDate: "2024-01-13T19:45:00Z",
    user: {
      id: "user-3",
      name: "Emma Wilson",
      avatar: PlaceHolderImages.find(img => img.id === "story-3")?.imageUrl || "",
      verified: true
    },
    dimensions: { width: 2048, height: 1365 },
    fileSize: "3.2 MB",
    isLiked: false,
    isBookmarked: true
  },
  {
    id: "img-4",
    title: "Abstract Art Piece",
    description: "Contemporary abstract artwork created with acrylic paints and mixed media techniques.",
    imageUrl: PlaceHolderImages.find(img => img.id === "video-1")?.imageUrl || "https://images.unsplash.com/photo-1736564176042-b3d49989b230?w=800&h=800&fit=crop",
    thumbnailUrl: PlaceHolderImages.find(img => img.id === "video-1")?.imageUrl || "https://images.unsplash.com/photo-1736564176042-b3d49989b230?w=400&h=400&fit=crop",
    category: "art",
    tags: ["abstract", "contemporary", "acrylic", "colorful", "modern"],
    views: 987,
    likes: 67,
    comments: 8,
    shares: 3,
    downloads: 12,
    uploadDate: "2024-01-12T16:10:00Z",
    user: {
      id: "user-4",
      name: "Alex Rodriguez",
      avatar: PlaceHolderImages.find(img => img.id === "avatar-1")?.imageUrl || "",
      verified: false
    },
    dimensions: { width: 1200, height: 1200 },
    fileSize: "2.1 MB",
    isLiked: true,
    isBookmarked: false
  },
  {
    id: "img-5",
    title: "Cute Cat Meme",
    description: "Funny cat meme that perfectly captures the essence of 'Monday mornings' with a grumpy cat expression.",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
    category: "memes",
    tags: ["cat", "meme", "funny", "monday", "grumpy"],
    views: 4567,
    likes: 445,
    comments: 89,
    shares: 156,
    downloads: 234,
    uploadDate: "2024-01-11T12:00:00Z",
    user: {
      id: "user-5",
      name: "Lisa Park",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
      verified: true
    },
    dimensions: { width: 800, height: 600 },
    fileSize: "890 KB",
    isLiked: false,
    isBookmarked: true
  },
  {
    id: "img-6",
    title: "Desktop Wallpaper",
    description: "Minimalist gradient wallpaper perfect for desktop backgrounds with calming blue tones.",
    imageUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop",
    thumbnailUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop",
    category: "wallpapers",
    tags: ["wallpaper", "minimalist", "gradient", "blue", "desktop"],
    views: 2341,
    likes: 123,
    comments: 15,
    shares: 8,
    downloads: 567,
    uploadDate: "2024-01-10T18:25:00Z",
    user: {
      id: "user-6",
      name: "David Kim",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      verified: false
    },
    dimensions: { width: 2560, height: 1440 },
    fileSize: "1.5 MB",
    isLiked: true,
    isBookmarked: true
  }
];

const categories = [
  { id: "all", label: "All", icon: Filter, count: mockImagesData.length },
  { id: "photos", label: "Photos", icon: Camera, count: mockImagesData.filter(img => img.category === "photos").length },
  { id: "art", label: "Art", icon: Palette, count: mockImagesData.filter(img => img.category === "art").length },
  { id: "ai-generated", label: "AI Generated", icon: Sparkles, count: mockImagesData.filter(img => img.category === "ai-generated").length },
  { id: "screenshots", label: "Screenshots", icon: ImageIcon, count: mockImagesData.filter(img => img.category === "screenshots").length },
  { id: "memes", label: "Memes", icon: Users, count: mockImagesData.filter(img => img.category === "memes").length },
  { id: "wallpapers", label: "Wallpapers", icon: Grid, count: mockImagesData.filter(img => img.category === "wallpapers").length }
];

export default function ImagesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { state: searchState, setQuery, performSearch, setFilters } = useSearch();
  const { state: contentState, likeImage, bookmarkImage, isImageLiked, isImageBookmarked } = useContent();

  // Upload functionality
  const { uploadFiles, isUploading, uploadResults, addFiles, upload, removeFile, clearCompleted } = useUpload({
    onUploadComplete: (results) => {
      console.log('Upload completed:', results);
      // Refresh images after successful upload
      window.location.reload();
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
    }
  });

  // Use the new images hook with category filtering
  const {
    images,
    loading,
    error,
    pagination,
    loadingMore,
    loadMore,
    likeImage: handleLike,
    bookmarkImage: handleBookmark
  } = useImages({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchState.query || undefined
  });

  // Update category when selection changes
  useEffect(() => {
    // The useImages hook will automatically refetch when selectedCategory changes
  }, [selectedCategory]);

  // Update search when query changes
  useEffect(() => {
    // The useImages hook will automatically refetch when searchState.query changes
  }, [searchState.query]);

  const filteredImages = images; // Images are already filtered by the hook

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

  // Infinite scroll with new data system
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const openImageViewer = (image: ImageData) => {
    setSelectedImage(image);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (!selectedImage) return;

    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1]);
    }
  };

  const prevImage = () => {
    if (!selectedImage) return;

    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1]);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Handle file drop logic here
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-headline flex items-center gap-3">
            <ImageIcon className="text-primary" />
            Images
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and share amazing images from our community
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search images..."
              value={searchState.query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Image
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 bg-muted/50">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {category.count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-destructive">⚠️</span>
              <span className="text-sm font-medium">Failed to load images</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Images Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredImages.map((image) => (
            <Card key={image.id} className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-0">
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={image.thumbnailUrl}
                    alt={image.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {image.category.replace("-", " ")}
                    </Badge>
                  </div>

                  {/* View Count */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(image.views)}
                  </div>

                  {/* Image Viewer Trigger */}
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => openImageViewer(image)}
                  />

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(image.id);
                      }}
                      className={`${isImageLiked(image.id) ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isImageLiked(image.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <Button variant="secondary" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button variant="secondary" size="sm">
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{image.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleBookmark(image.id)}
                    >
                      <Heart className={`w-4 h-4 ${isImageBookmarked(image.id) ? 'fill-current text-red-500' : ''}`} />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {image.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {image.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {image.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{image.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={image.user.avatar} alt={image.user.name} />
                        <AvatarFallback className="text-xs">{image.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">{image.user.name}</span>
                          {image.user.verified && (
                            <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(image.uploadDate)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatNumber(image.likes)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {formatNumber(image.comments)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredImages.map((image) => (
            <Card key={image.id} className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative w-32 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{image.title}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(image.id)}
                          className={`p-1 ${isImageLiked(image.id) ? 'text-red-500' : ''}`}
                        >
                          <Heart className={`w-4 h-4 ${isImageLiked(image.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {image.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(image.views)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(image.likes)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatNumber(image.comments)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {formatNumber(image.downloads)}
                        </div>
                      </div>
                      <span>{formatDate(image.uploadDate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && (
        <div className="mt-8">
          {viewMode === "grid" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="w-full h-4" />
                      <Skeleton className="w-3/4 h-4" />
                      <div className="flex gap-1">
                        <Skeleton className="w-12 h-5" />
                        <Skeleton className="w-12 h-5" />
                        <Skeleton className="w-12 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="w-20 h-3" />
                          <Skeleton className="w-16 h-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-32 h-24 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-full h-4" />
                        <Skeleton className="w-3/4 h-4" />
                        <div className="flex gap-1">
                          <Skeleton className="w-12 h-5" />
                          <Skeleton className="w-12 h-5" />
                        </div>
                        <div className="flex justify-between">
                          <div className="flex gap-4">
                            <Skeleton className="w-12 h-3" />
                            <Skeleton className="w-12 h-3" />
                            <Skeleton className="w-12 h-3" />
                          </div>
                          <Skeleton className="w-16 h-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="h-10" />

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-7xl mx-auto">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeImageViewer}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Navigation Buttons */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={prevImage}
              disabled={filteredImages.findIndex(img => img.id === selectedImage.id) === 0}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={nextImage}
              disabled={filteredImages.findIndex(img => img.id === selectedImage.id) === filteredImages.length - 1}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={selectedImage.imageUrl}
                alt={selectedImage.title}
                width={selectedImage.dimensions.width}
                height={selectedImage.dimensions.height}
                className="max-w-full max-h-full object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>

            {/* Image Info Sidebar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedImage.title}</h2>
                    <p className="text-white/90 mb-4 line-clamp-3">{selectedImage.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedImage.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Image Stats */}
                    <div className="flex items-center gap-6 text-white/80 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {formatNumber(selectedImage.views)} views
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {formatNumber(selectedImage.likes)} likes
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {formatNumber(selectedImage.comments)} comments
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {formatNumber(selectedImage.downloads)} downloads
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedImage.uploadDate)}
                      </div>
                    </div>
                  </div>

                  {/* User Info & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-white/20">
                        <AvatarImage src={selectedImage.user.avatar} alt={selectedImage.user.name} />
                        <AvatarFallback>{selectedImage.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{selectedImage.user.name}</span>
                          {selectedImage.user.verified && (
                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">{selectedImage.fileSize} • {selectedImage.dimensions.width}×{selectedImage.dimensions.height}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLike(selectedImage.id)}
                        className={`${isImageLiked(selectedImage.id) ? 'text-red-500' : ''}`}
                      >
                        <Heart className={`w-4 h-4 ${isImageLiked(selectedImage.id) ? 'fill-current' : ''}`} />
                      </Button>

                      <Button variant="secondary" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button variant="secondary" size="sm">
                        <Share className="w-4 h-4" />
                      </Button>

                      <Button variant="secondary" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
          </DialogHeader>

          <UploadArea
            onFilesSelected={addFiles}
            onUpload={async (files, options) => {
              await upload(files, options);
              setShowUploadDialog(false);
            }}
            multiple={true}
            maxFiles={20}
            acceptedTypes="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
