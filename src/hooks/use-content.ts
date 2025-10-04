import { useState, useEffect, useCallback } from 'react';
import { contentService } from '@/lib/services/content-service';
import { ApiError } from '@/lib/types/api';
import { ImageData, VideoData, StoryData, User } from '@/lib/mock-backend';

// Generic hook for content fetching with loading and error states
export function useContent<T>(
  fetcher: () => Promise<{ data: T }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetcher();
      setData(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Hook for images
export function useImages(filters?: Parameters<typeof contentService.getImages>[0]) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchImages = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await contentService.getImages(filters);

      if (loadMore && pagination) {
        setImages(prev => [...prev, ...response.data]);
        setPagination({ ...response.pagination, page: pagination.page + 1 });
      } else {
        setImages(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'Failed to load images',
        code: 'IMAGES_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, pagination]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNext && !loadingMore) {
      fetchImages(true);
    }
  }, [fetchImages, pagination?.hasNext, loadingMore]);

  const likeImage = useCallback(async (imageId: string) => {
    try {
      const response = await contentService.likeImage(imageId);
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, likes: response.data.likes, isLiked: response.data.liked }
          : img
      ));
      return response.data;
    } catch (err) {
      throw err instanceof ApiError ? err : new ApiError({
        message: 'Failed to like image',
        code: 'LIKE_ERROR',
        statusCode: 0
      });
    }
  }, []);

  const bookmarkImage = useCallback(async (imageId: string) => {
    try {
      const response = await contentService.bookmarkImage(imageId);
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, isBookmarked: response.data.bookmarked }
          : img
      ));
      return response.data;
    } catch (err) {
      throw err instanceof ApiError ? err : new ApiError({
        message: 'Failed to bookmark image',
        code: 'BOOKMARK_ERROR',
        statusCode: 0
      });
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    error,
    pagination,
    loadingMore,
    loadMore,
    likeImage,
    bookmarkImage,
    refetch: fetchImages
  };
}

// Hook for videos
export function useVideos(filters?: Parameters<typeof contentService.getVideos>[0]) {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchVideos = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await contentService.getVideos(filters);

      if (loadMore && pagination) {
        setVideos(prev => [...prev, ...response.data]);
        setPagination({ ...response.pagination, page: pagination.page + 1 });
      } else {
        setVideos(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'Failed to load videos',
        code: 'VIDEOS_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, pagination]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNext && !loadingMore) {
      fetchVideos(true);
    }
  }, [fetchVideos, pagination?.hasNext, loadingMore]);

  const likeVideo = useCallback(async (videoId: string) => {
    try {
      const response = await contentService.likeVideo(videoId);
      setVideos(prev => prev.map(video =>
        video.id === videoId
          ? { ...video, likes: response.data.likes, isLiked: response.data.liked }
          : video
      ));
      return response.data;
    } catch (err) {
      throw err instanceof ApiError ? err : new ApiError({
        message: 'Failed to like video',
        code: 'LIKE_ERROR',
        statusCode: 0
      });
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    pagination,
    loadingMore,
    loadMore,
    likeVideo,
    refetch: fetchVideos
  };
}

// Hook for stories
export function useStories(filters?: Parameters<typeof contentService.getStories>[0]) {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await contentService.getStories(filters);
      setStories(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'Failed to load stories',
        code: 'STORIES_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const markAsViewed = useCallback(async (storyId: string) => {
    try {
      const response = await contentService.markStoryAsViewed(storyId);
      setStories(prev => prev.map(story =>
        story.id === storyId
          ? { ...story, isViewed: response.data.viewed }
          : story
      ));
      return response.data;
    } catch (err) {
      throw err instanceof ApiError ? err : new ApiError({
        message: 'Failed to mark story as viewed',
        code: 'VIEW_ERROR',
        statusCode: 0
      });
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return {
    stories,
    loading,
    error,
    pagination,
    markAsViewed,
    refetch: fetchStories
  };
}

// Hook for users
export function useUsers(filters?: Parameters<typeof contentService.getUsers>[0]) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await contentService.getUsers(filters);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'Failed to load users',
        code: 'USERS_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const followUser = useCallback(async (userId: string) => {
    try {
      const response = await contentService.followUser(userId);
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, followers: response.data.following ? user.followers + 1 : user.followers - 1 }
          : user
      ));
      return response.data;
    } catch (err) {
      throw err instanceof ApiError ? err : new ApiError({
        message: 'Failed to follow user',
        code: 'FOLLOW_ERROR',
        statusCode: 0
      });
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    pagination,
    followUser,
    refetch: fetchUsers
  };
}

// Hook for trending content
export function useTrendingContent(type?: 'all' | 'images' | 'videos' | 'stories') {
  return useContent(() => contentService.getTrendingContent(type));
}

// Hook for recommended content
export function useRecommendedContent(userId?: string) {
  return useContent(() => contentService.getRecommendedContent(userId));
}

// Hook for feed
export function useFeed(userId?: string, filters?: Parameters<typeof contentService.getFeed>[1]) {
  const [feed, setFeed] = useState<{
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  }>({ images: [], videos: [], stories: [] });
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await contentService.getFeed(userId, filters);

      if (loadMore && pagination) {
        setFeed(prev => {
          const newFeed = response.data[0]; // Get the first (and only) feed object
          return {
            images: [...prev.images, ...(newFeed?.images || [])],
            videos: [...prev.videos, ...(newFeed?.videos || [])],
            stories: [...prev.stories, ...(newFeed?.stories || [])]
          };
        });
        setPagination({ ...response.pagination, page: pagination.page + 1 });
      } else {
        const feedData = response.data[0]; // Get the first (and only) feed object
        setFeed({
          images: feedData?.images || [],
          videos: feedData?.videos || [],
          stories: feedData?.stories || []
        });
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({
        message: 'Failed to load feed',
        code: 'FEED_ERROR',
        statusCode: 0
      }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, filters, pagination]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNext && !loadingMore) {
      fetchFeed(true);
    }
  }, [fetchFeed, pagination?.hasNext, loadingMore]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return {
    feed,
    loading,
    error,
    pagination,
    loadingMore,
    loadMore,
    refetch: fetchFeed
  };
}