"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Download,
  Calendar,
  User,
  Image as ImageIcon,
  Video,
  History,
  Users,
  TrendingUp,
  Clock,
  X,
  ChevronDown,
  SlidersHorizontal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useSearch } from "@/contexts/SearchContext";
import { SearchResult } from "@/lib/mock-backend";

const RESULTS_PER_PAGE = 20;

const SearchPageComponent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    state,
    setQuery,
    performSearch,
    loadMore,
    setFilters,
    resetSearch
  } = useSearch();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialQuery && initialQuery !== state.query) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    setFilters({ sortBy: sortBy as any });
  }, [sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && state.hasMore && !state.isSearching) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [state.hasMore, state.isSearching, loadMore]);

  const handleTabChange = (type: 'all' | 'image' | 'video' | 'story' | 'user') => {
    setFilters({ type });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
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

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'story': return <History className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getResultUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'image': return `/images/${result.id}`;
      case 'video': return `/reels/${result.id}`;
      case 'story': return `/stories/${result.id}`;
      case 'user': return `/users/${result.id}`;
      default: return result.url;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              {state.query ? (
                <>
                  Search results for "<span className="text-primary">{highlightText(state.query, state.query)}</span>"
                </>
              ) : (
                "Search"
              )}
            </h1>
            {state.totalResults > 0 && (
              <p className="text-muted-foreground mt-1">
                {formatNumber(state.totalResults)} results found
                {state.isSearching && " • Searching..."}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
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
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search videos, reels, images, and more..."
            value={state.query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            className="pl-10 pr-12"
          />
          {state.query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Tabs */}
      <Tabs value={state.filters.type} onValueChange={(value) => handleTabChange(value as any)} className="mb-8">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            All
            {state.totalResults > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {formatNumber(state.totalResults)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="story" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value={state.filters.type} className="mt-6">
          {/* Error State */}
          {state.error && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{state.error}</p>
              <Button onClick={() => performSearch()}>Try Again</Button>
            </div>
          )}

          {/* No Results */}
          {!state.error && state.results.length === 0 && state.query && !state.isSearching && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters
              </p>
              <Button onClick={resetSearch} variant="outline">
                Clear Search
              </Button>
            </div>
          )}

          {/* Results Grid/List */}
          {state.results.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {state.results.map((result) => (
                    <Card key={result.id} className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
                      <CardContent className="p-0">
                        {/* Thumbnail */}
                        <div className="relative aspect-square overflow-hidden">
                          <Image
                            src={result.thumbnailUrl}
                            alt={result.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Result Type Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="text-xs">
                              {getResultIcon(result.type)}
                              <span className="ml-1 capitalize">{result.type}</span>
                            </Badge>
                          </div>

                          {/* Relevance Score */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {Math.round(result.relevance)}% match
                          </div>
                        </div>

                        {/* Content Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                            {highlightText(result.title, state.query)}
                          </h3>

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {highlightText(result.description, state.query)}
                          </p>

                          {/* User Info */}
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={result.user.avatar} alt={result.user.name} />
                              <AvatarFallback className="text-xs">{result.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium">{result.user.name}</span>
                                {result.user.verified && (
                                  <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(result.metadata.uploadDate)}
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {result.metadata.views && (
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatNumber(result.metadata.views)}
                              </div>
                            )}
                            {result.metadata.likes && (
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {formatNumber(result.metadata.likes)}
                              </div>
                            )}
                            {result.metadata.comments && (
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {formatNumber(result.metadata.comments)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-4">
                  {state.results.map((result) => (
                    <Card key={result.id} className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="relative w-32 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={result.thumbnailUrl}
                              alt={result.title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute top-1 left-1">
                              <Badge variant="secondary" className="text-xs">
                                {getResultIcon(result.type)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                                  {highlightText(result.title, state.query)}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {highlightText(result.description, state.query)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(result.relevance)}% match
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={result.user.avatar} alt={result.user.name} />
                                <AvatarFallback className="text-xs">{result.user.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{result.user.name}</span>
                              {result.user.verified && (
                                <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(result.metadata.uploadDate)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {result.metadata.views && (
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {formatNumber(result.metadata.views)}
                                  </div>
                                )}
                                {result.metadata.likes && (
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {formatNumber(result.metadata.likes)}
                                  </div>
                                )}
                                {result.metadata.comments && (
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {formatNumber(result.metadata.comments)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Loading More Indicator */}
          {state.isSearching && (
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
                            <div className="flex items-center gap-2">
                              <Skeleton className="w-5 h-5 rounded-full" />
                              <Skeleton className="w-20 h-3" />
                            </div>
                            <div className="flex gap-4">
                              <Skeleton className="w-12 h-3" />
                              <Skeleton className="w-12 h-3" />
                              <Skeleton className="w-12 h-3" />
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

          {/* Load More Button (Alternative) */}
          {!state.isSearching && state.hasMore && (
            <div className="text-center mt-8">
              <Button onClick={loadMore} variant="outline" size="lg">
                Load More Results
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageComponent />
    </Suspense>
  );
}