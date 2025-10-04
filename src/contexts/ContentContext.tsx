"use client";

import React, { createContext, useContext, useReducer, useState, ReactNode } from 'react';
import { ImageData, VideoData, StoryData, User } from '@/lib/mock-backend';
import { ApiError } from '@/lib/types/api';
import { AdvancedCacheManager, CacheLayer } from '@/lib/performance/AdvancedCacheManager';
import { notificationService } from '@/lib/services/notification-service';
import { contentService } from '@/lib/services/content-service';

// Content State Interface
interface ContentState {
  // Images
  images: ImageData[];
  imagesLoading: boolean;
  imagesError: ApiError | null;
  imagesPagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  } | null;

  // Videos
  videos: VideoData[];
  videosLoading: boolean;
  videosError: ApiError | null;
  videosPagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  } | null;

  // Stories
  stories: StoryData[];
  storiesLoading: boolean;
  storiesError: ApiError | null;
  storiesPagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  } | null;

  // Users
  users: User[];
  usersLoading: boolean;
  usersError: ApiError | null;
  usersPagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  } | null;

  // Feed
  feed: {
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  };
  feedLoading: boolean;
  feedError: ApiError | null;

  // Trending content
  trending: {
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  };
  trendingLoading: boolean;
  trendingError: ApiError | null;

  // Recommended content
  recommended: {
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  };
  recommendedLoading: boolean;
  recommendedError: ApiError | null;

  // User interactions tracking
  likedImages: Set<string>;
  bookmarkedImages: Set<string>;
  likedVideos: Set<string>;
  savedVideos: Set<string>;
  viewedStories: Set<string>;
  followingUsers: Set<string>;

  // Filters and search
  activeFilters: {
    images?: any;
    videos?: any;
    stories?: any;
    users?: any;
  };
  searchQuery: string;
}

// Action Types
type ContentAction =
  // Images actions
  | { type: 'SET_IMAGES_LOADING'; payload: boolean }
  | { type: 'SET_IMAGES_SUCCESS'; payload: { images: ImageData[]; pagination: any } }
  | { type: 'SET_IMAGES_ERROR'; payload: ApiError }
  | { type: 'ADD_IMAGES'; payload: { images: ImageData[]; pagination: any } }
  | { type: 'UPDATE_IMAGE'; payload: ImageData }
  | { type: 'LIKE_IMAGE'; payload: { imageId: string; liked: boolean } }
  | { type: 'BOOKMARK_IMAGE'; payload: { imageId: string; bookmarked: boolean } }

  // Videos actions
  | { type: 'SET_VIDEOS_LOADING'; payload: boolean }
  | { type: 'SET_VIDEOS_SUCCESS'; payload: { videos: VideoData[]; pagination: any } }
  | { type: 'SET_VIDEOS_ERROR'; payload: ApiError }
  | { type: 'ADD_VIDEOS'; payload: { videos: VideoData[]; pagination: any } }
  | { type: 'UPDATE_VIDEO'; payload: VideoData }
  | { type: 'LIKE_VIDEO'; payload: { videoId: string; liked: boolean } }
  | { type: 'SAVE_VIDEO'; payload: { videoId: string; saved: boolean } }

  // Stories actions
  | { type: 'SET_STORIES_LOADING'; payload: boolean }
  | { type: 'SET_STORIES_SUCCESS'; payload: { stories: StoryData[]; pagination: any } }
  | { type: 'SET_STORIES_ERROR'; payload: ApiError }
  | { type: 'UPDATE_STORY'; payload: StoryData }
  | { type: 'MARK_STORY_VIEWED'; payload: string }

  // Users actions
  | { type: 'SET_USERS_LOADING'; payload: boolean }
  | { type: 'SET_USERS_SUCCESS'; payload: { users: User[]; pagination: any } }
  | { type: 'SET_USERS_ERROR'; payload: ApiError }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'FOLLOW_USER'; payload: { userId: string; following: boolean } }

  // Feed actions
  | { type: 'SET_FEED_LOADING'; payload: boolean }
  | { type: 'SET_FEED_SUCCESS'; payload: { images: ImageData[]; videos: VideoData[]; stories: StoryData[] } }
  | { type: 'SET_FEED_ERROR'; payload: ApiError }

  // Trending actions
  | { type: 'SET_TRENDING_LOADING'; payload: boolean }
  | { type: 'SET_TRENDING_SUCCESS'; payload: { images: ImageData[]; videos: VideoData[]; stories: StoryData[] } }
  | { type: 'SET_TRENDING_ERROR'; payload: ApiError }

  // Recommended actions
  | { type: 'SET_RECOMMENDED_LOADING'; payload: boolean }
  | { type: 'SET_RECOMMENDED_SUCCESS'; payload: { images: ImageData[]; videos: VideoData[]; stories: StoryData[] } }
  | { type: 'SET_RECOMMENDED_ERROR'; payload: ApiError }

  // Filter and search actions
  | { type: 'SET_FILTERS'; payload: { type: string; filters: any } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'CLEAR_FILTERS'; payload: string };

// Initial State
const initialState: ContentState = {
  // Images
  images: [],
  imagesLoading: false,
  imagesError: null,
  imagesPagination: null,

  // Videos
  videos: [],
  videosLoading: false,
  videosError: null,
  videosPagination: null,

  // Stories
  stories: [],
  storiesLoading: false,
  storiesError: null,
  storiesPagination: null,

  // Users
  users: [],
  usersLoading: false,
  usersError: null,
  usersPagination: null,

  // Feed
  feed: { images: [], videos: [], stories: [] },
  feedLoading: false,
  feedError: null,

  // Trending
  trending: { images: [], videos: [], stories: [] },
  trendingLoading: false,
  trendingError: null,

  // Recommended
  recommended: { images: [], videos: [], stories: [] },
  recommendedLoading: false,
  recommendedError: null,

  // User interactions
  likedImages: new Set(),
  bookmarkedImages: new Set(),
  likedVideos: new Set(),
  savedVideos: new Set(),
  viewedStories: new Set(),
  followingUsers: new Set(),

  // Filters and search
  activeFilters: {},
  searchQuery: '',
};

// Reducer
function contentReducer(state: ContentState, action: ContentAction): ContentState {
  switch (action.type) {
    // Images
    case 'SET_IMAGES_LOADING':
      return { ...state, imagesLoading: action.payload, imagesError: null };

    case 'SET_IMAGES_SUCCESS':
      return {
        ...state,
        images: action.payload.images,
        imagesLoading: false,
        imagesError: null,
        imagesPagination: action.payload.pagination,
      };

    case 'SET_IMAGES_ERROR':
      return { ...state, imagesLoading: false, imagesError: action.payload };

    case 'ADD_IMAGES':
      return {
        ...state,
        images: [...state.images, ...action.payload.images],
        imagesPagination: action.payload.pagination,
      };

    case 'UPDATE_IMAGE':
      return {
        ...state,
        images: state.images.map(img =>
          img.id === action.payload.id ? action.payload : img
        ),
      };

    case 'LIKE_IMAGE':
      const likedImages = new Set(state.likedImages);
      if (action.payload.liked) {
        likedImages.add(action.payload.imageId);
      } else {
        likedImages.delete(action.payload.imageId);
      }
      return {
        ...state,
        likedImages,
        images: state.images.map(img =>
          img.id === action.payload.imageId
            ? { ...img, isLiked: action.payload.liked }
            : img
        ),
      };

    case 'BOOKMARK_IMAGE':
      const bookmarkedImages = new Set(state.bookmarkedImages);
      if (action.payload.bookmarked) {
        bookmarkedImages.add(action.payload.imageId);
      } else {
        bookmarkedImages.delete(action.payload.imageId);
      }
      return {
        ...state,
        bookmarkedImages,
        images: state.images.map(img =>
          img.id === action.payload.imageId
            ? { ...img, isBookmarked: action.payload.bookmarked }
            : img
        ),
      };

    // Videos
    case 'SET_VIDEOS_LOADING':
      return { ...state, videosLoading: action.payload, videosError: null };

    case 'SET_VIDEOS_SUCCESS':
      return {
        ...state,
        videos: action.payload.videos,
        videosLoading: false,
        videosError: null,
        videosPagination: action.payload.pagination,
      };

    case 'SET_VIDEOS_ERROR':
      return { ...state, videosLoading: false, videosError: action.payload };

    case 'ADD_VIDEOS':
      return {
        ...state,
        videos: [...state.videos, ...action.payload.videos],
        videosPagination: action.payload.pagination,
      };

    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(video =>
          video.id === action.payload.id ? action.payload : video
        ),
      };

    case 'LIKE_VIDEO':
      const likedVideos = new Set(state.likedVideos);
      if (action.payload.liked) {
        likedVideos.add(action.payload.videoId);
      } else {
        likedVideos.delete(action.payload.videoId);
      }
      return {
        ...state,
        likedVideos,
        videos: state.videos.map(video =>
          video.id === action.payload.videoId
            ? { ...video, isLiked: action.payload.liked }
            : video
        ),
      };

    case 'SAVE_VIDEO':
      const savedVideos = new Set(state.savedVideos);
      if (action.payload.saved) {
        savedVideos.add(action.payload.videoId);
      } else {
        savedVideos.delete(action.payload.videoId);
      }
      return {
        ...state,
        savedVideos,
        videos: state.videos.map(video =>
          video.id === action.payload.videoId
            ? { ...video, isSaved: action.payload.saved }
            : video
        ),
      };

    // Stories
    case 'SET_STORIES_LOADING':
      return { ...state, storiesLoading: action.payload, storiesError: null };

    case 'SET_STORIES_SUCCESS':
      return {
        ...state,
        stories: action.payload.stories,
        storiesLoading: false,
        storiesError: null,
        storiesPagination: action.payload.pagination,
      };

    case 'SET_STORIES_ERROR':
      return { ...state, storiesLoading: false, storiesError: action.payload };

    case 'UPDATE_STORY':
      return {
        ...state,
        stories: state.stories.map(story =>
          story.id === action.payload.id ? action.payload : story
        ),
      };

    case 'MARK_STORY_VIEWED':
      return {
        ...state,
        viewedStories: new Set([...state.viewedStories, action.payload]),
        stories: state.stories.map(story =>
          story.id === action.payload
            ? { ...story, isViewed: true }
            : story
        ),
      };

    // Users
    case 'SET_USERS_LOADING':
      return { ...state, usersLoading: action.payload, usersError: null };

    case 'SET_USERS_SUCCESS':
      return {
        ...state,
        users: action.payload.users,
        usersLoading: false,
        usersError: null,
        usersPagination: action.payload.pagination,
      };

    case 'SET_USERS_ERROR':
      return { ...state, usersLoading: false, usersError: action.payload };

    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
      };

    case 'FOLLOW_USER':
      const followingUsers = new Set(state.followingUsers);
      if (action.payload.following) {
        followingUsers.add(action.payload.userId);
      } else {
        followingUsers.delete(action.payload.userId);
      }
      return {
        ...state,
        followingUsers,
        users: state.users.map(user =>
          user.id === action.payload.userId
            ? { ...user, followers: action.payload.following ? user.followers + 1 : user.followers - 1 }
            : user
        ),
      };

    // Feed
    case 'SET_FEED_LOADING':
      return { ...state, feedLoading: action.payload, feedError: null };

    case 'SET_FEED_SUCCESS':
      return {
        ...state,
        feed: action.payload,
        feedLoading: false,
        feedError: null,
      };

    case 'SET_FEED_ERROR':
      return { ...state, feedLoading: false, feedError: action.payload };

    // Trending
    case 'SET_TRENDING_LOADING':
      return { ...state, trendingLoading: action.payload, trendingError: null };

    case 'SET_TRENDING_SUCCESS':
      return {
        ...state,
        trending: action.payload,
        trendingLoading: false,
        trendingError: null,
      };

    case 'SET_TRENDING_ERROR':
      return { ...state, trendingLoading: false, trendingError: action.payload };

    // Recommended
    case 'SET_RECOMMENDED_LOADING':
      return { ...state, recommendedLoading: action.payload, recommendedError: null };

    case 'SET_RECOMMENDED_SUCCESS':
      return {
        ...state,
        recommended: action.payload,
        recommendedLoading: false,
        recommendedError: null,
      };

    case 'SET_RECOMMENDED_ERROR':
      return { ...state, recommendedLoading: false, recommendedError: action.payload };

    // Filters and search
    case 'SET_FILTERS':
      return {
        ...state,
        activeFilters: {
          ...state.activeFilters,
          [action.payload.type]: action.payload.filters,
        },
      };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        activeFilters: {
          ...state.activeFilters,
          [action.payload]: undefined,
        },
      };

    default:
      return state;
  }
}

// Context Interface
interface ContentContextType {
  state: ContentState;

  // Images actions
  setImagesLoading: (loading: boolean) => void;
  setImagesSuccess: (images: ImageData[], pagination: any) => void;
  setImagesError: (error: ApiError) => void;
  addImages: (images: ImageData[], pagination: any) => void;
  updateImage: (image: ImageData) => void;
  likeImage: (imageId: string, liked: boolean) => void;
  bookmarkImage: (imageId: string, bookmarked: boolean) => void;

  // Videos actions
  setVideosLoading: (loading: boolean) => void;
  setVideosSuccess: (videos: VideoData[], pagination: any) => void;
  setVideosError: (error: ApiError) => void;
  addVideos: (videos: VideoData[], pagination: any) => void;
  updateVideo: (video: VideoData) => void;
  likeVideo: (videoId: string, liked: boolean) => void;
  saveVideo: (videoId: string, saved: boolean) => void;

  // Stories actions
  setStoriesLoading: (loading: boolean) => void;
  setStoriesSuccess: (stories: StoryData[], pagination: any) => void;
  setStoriesError: (error: ApiError) => void;
  updateStory: (story: StoryData) => void;
  markStoryViewed: (storyId: string) => void;

  // Users actions
  setUsersLoading: (loading: boolean) => void;
  setUsersSuccess: (users: User[], pagination: any) => void;
  setUsersError: (error: ApiError) => void;
  updateUser: (user: User) => void;
  followUser: (userId: string, following: boolean) => void;

  // Feed actions
  setFeedLoading: (loading: boolean) => void;
  setFeedSuccess: (images: ImageData[], videos: VideoData[], stories: StoryData[]) => void;
  setFeedError: (error: ApiError) => void;

  // Trending actions
  setTrendingLoading: (loading: boolean) => void;
  setTrendingSuccess: (images: ImageData[], videos: VideoData[], stories: StoryData[]) => void;
  setTrendingError: (error: ApiError) => void;

  // Recommended actions
  setRecommendedLoading: (loading: boolean) => void;
  setRecommendedSuccess: (images: ImageData[], videos: VideoData[], stories: StoryData[]) => void;
  setRecommendedError: (error: ApiError) => void;

  // Filter and search actions
  setFilters: (type: string, filters: any) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: (type: string) => void;

  // Utility functions
  isImageLiked: (imageId: string) => boolean;
  isImageBookmarked: (imageId: string) => boolean;
  isVideoLiked: (videoId: string) => boolean;
  isVideoSaved: (videoId: string) => boolean;
  isStoryViewed: (storyId: string) => boolean;
  isUserFollowing: (userId: string) => boolean;

  // Cache functions
  getCachedContent: (key: string) => Promise<any>;
  setCachedContent: (key: string, data: any, options?: any) => Promise<void>;
  invalidateCache: (pattern?: string) => Promise<void>;
  getCacheStats: () => any;

  // Real-time functions
  subscribeToContentUpdates: (contentType: 'images' | 'videos' | 'stories', callback: (update: any) => void) => () => void;
  subscribeToNotifications: (callback: (notification: any) => void) => () => void;
}

// Create Context
const ContentContext = createContext<ContentContextType | undefined>(undefined);

// Cache configuration
const cacheLayers: CacheLayer[] = [
  {
    name: 'hot',
    maxSize: 50 * 1024 * 1024, // 50MB
    maxAge: 5 * 60 * 1000, // 5 minutes
    strategy: 'LRU',
    compression: true,
    encryption: false
  },
  {
    name: 'warm',
    maxSize: 200 * 1024 * 1024, // 200MB
    maxAge: 30 * 60 * 1000, // 30 minutes
    strategy: 'LFU',
    compression: true,
    encryption: false
  },
  {
    name: 'cold',
    maxSize: 500 * 1024 * 1024, // 500MB
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    strategy: 'TTL',
    compression: false,
    encryption: false
  }
];

const cacheConfig = {
  layers: cacheLayers,
  globalMaxSize: 750 * 1024 * 1024, // 750MB total
  enableCompression: true,
  enableEncryption: false,
  enableMetrics: true,
  adaptiveScaling: true
};

// Provider Component
interface ContentProviderProps {
  children: ReactNode;
}

export function ContentProvider({ children }: ContentProviderProps) {
  const [state, dispatch] = useReducer(contentReducer, initialState);
  const [cacheManager] = useState(() => new AdvancedCacheManager(cacheConfig));

  // Images actions
  const setImagesLoading = (loading: boolean) => {
    dispatch({ type: 'SET_IMAGES_LOADING', payload: loading });
  };

  const setImagesSuccess = (images: ImageData[], pagination: any) => {
    dispatch({ type: 'SET_IMAGES_SUCCESS', payload: { images, pagination } });
  };

  const setImagesError = (error: ApiError) => {
    dispatch({ type: 'SET_IMAGES_ERROR', payload: error });
  };

  const addImages = (images: ImageData[], pagination: any) => {
    dispatch({ type: 'ADD_IMAGES', payload: { images, pagination } });
  };

  const updateImage = (image: ImageData) => {
    dispatch({ type: 'UPDATE_IMAGE', payload: image });
  };

  const likeImage = (imageId: string, liked: boolean) => {
    dispatch({ type: 'LIKE_IMAGE', payload: { imageId, liked } });
  };

  const bookmarkImage = (imageId: string, bookmarked: boolean) => {
    dispatch({ type: 'BOOKMARK_IMAGE', payload: { imageId, bookmarked } });
  };

  // Videos actions
  const setVideosLoading = (loading: boolean) => {
    dispatch({ type: 'SET_VIDEOS_LOADING', payload: loading });
  };

  const setVideosSuccess = async (videos: VideoData[], pagination: any) => {
    dispatch({ type: 'SET_VIDEOS_SUCCESS', payload: { videos, pagination } });

    // Cache the videos data
    const cacheKey = `videos_${JSON.stringify(pagination || {})}`;
    await setCachedContent(cacheKey, { videos, pagination, timestamp: Date.now() }, {
      layer: 'warm',
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  };

  const setVideosError = (error: ApiError) => {
    dispatch({ type: 'SET_VIDEOS_ERROR', payload: error });
  };

  const addVideos = (videos: VideoData[], pagination: any) => {
    dispatch({ type: 'ADD_VIDEOS', payload: { videos, pagination } });
  };

  const updateVideo = (video: VideoData) => {
    dispatch({ type: 'UPDATE_VIDEO', payload: video });
  };

  const likeVideo = (videoId: string, liked: boolean) => {
    dispatch({ type: 'LIKE_VIDEO', payload: { videoId, liked } });
  };

  const saveVideo = (videoId: string, saved: boolean) => {
    dispatch({ type: 'SAVE_VIDEO', payload: { videoId, saved } });
  };

  // Stories actions
  const setStoriesLoading = (loading: boolean) => {
    dispatch({ type: 'SET_STORIES_LOADING', payload: loading });
  };

  const loadStoriesFromCache = async (filters: any) => {
    const cacheKey = `stories_${JSON.stringify(filters)}`;
    const cached = await getCachedContent(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) { // 5 minutes
      dispatch({ type: 'SET_STORIES_SUCCESS', payload: { stories: cached.stories, pagination: cached.pagination } });
      return true;
    }
    return false;
  };

  const setStoriesSuccess = async (stories: StoryData[], pagination: any) => {
    dispatch({ type: 'SET_STORIES_SUCCESS', payload: { stories, pagination } });

    // Cache the stories data
    const cacheKey = `stories_${JSON.stringify(pagination || {})}`;
    await setCachedContent(cacheKey, { stories, pagination, timestamp: Date.now() }, {
      layer: 'warm',
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  };

  const setStoriesError = (error: ApiError) => {
    dispatch({ type: 'SET_STORIES_ERROR', payload: error });
  };

  const updateStory = (story: StoryData) => {
    dispatch({ type: 'UPDATE_STORY', payload: story });
  };

  const markStoryViewed = (storyId: string) => {
    dispatch({ type: 'MARK_STORY_VIEWED', payload: storyId });
  };

  // Users actions
  const setUsersLoading = (loading: boolean) => {
    dispatch({ type: 'SET_USERS_LOADING', payload: loading });
  };

  const setUsersSuccess = (users: User[], pagination: any) => {
    dispatch({ type: 'SET_USERS_SUCCESS', payload: { users, pagination } });
  };

  const setUsersError = (error: ApiError) => {
    dispatch({ type: 'SET_USERS_ERROR', payload: error });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const followUser = (userId: string, following: boolean) => {
    dispatch({ type: 'FOLLOW_USER', payload: { userId, following } });
  };

  // Feed actions
  const setFeedLoading = (loading: boolean) => {
    dispatch({ type: 'SET_FEED_LOADING', payload: loading });
  };

  const setFeedSuccess = (images: ImageData[], videos: VideoData[], stories: StoryData[]) => {
    dispatch({ type: 'SET_FEED_SUCCESS', payload: { images, videos, stories } });
  };

  const setFeedError = (error: ApiError) => {
    dispatch({ type: 'SET_FEED_ERROR', payload: error });
  };

  // Trending actions
  const setTrendingLoading = (loading: boolean) => {
    dispatch({ type: 'SET_TRENDING_LOADING', payload: loading });
  };

  const setTrendingSuccess = (images: ImageData[], videos: VideoData[], stories: StoryData[]) => {
    dispatch({ type: 'SET_TRENDING_SUCCESS', payload: { images, videos, stories } });
  };

  const setTrendingError = (error: ApiError) => {
    dispatch({ type: 'SET_TRENDING_ERROR', payload: error });
  };

  // Recommended actions
  const setRecommendedLoading = (loading: boolean) => {
    dispatch({ type: 'SET_RECOMMENDED_LOADING', payload: loading });
  };

  const setRecommendedSuccess = (images: ImageData[], videos: VideoData[], stories: StoryData[]) => {
    dispatch({ type: 'SET_RECOMMENDED_SUCCESS', payload: { images, videos, stories } });
  };

  const setRecommendedError = (error: ApiError) => {
    dispatch({ type: 'SET_RECOMMENDED_ERROR', payload: error });
  };

  // Filter and search actions
  const setFilters = (type: string, filters: any) => {
    dispatch({ type: 'SET_FILTERS', payload: { type, filters } });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const clearFilters = (type: string) => {
    dispatch({ type: 'CLEAR_FILTERS', payload: type });
  };

  // Utility functions
  const isImageLiked = (imageId: string) => {
    return state.likedImages.has(imageId);
  };

  const isImageBookmarked = (imageId: string) => {
    return state.bookmarkedImages.has(imageId);
  };

  const isVideoLiked = (videoId: string) => {
    return state.likedVideos.has(videoId);
  };

  const isVideoSaved = (videoId: string) => {
    return state.savedVideos.has(videoId);
  };

  const isStoryViewed = (storyId: string) => {
    return state.viewedStories.has(storyId);
  };

  const isUserFollowing = (userId: string) => {
    return state.followingUsers.has(userId);
  };

  // Cache functions
  const getCachedContent = async (key: string) => {
    return await cacheManager.get(key);
  };

  const setCachedContent = async (key: string, data: any, options?: any) => {
    await cacheManager.set(key, data, options);
  };

  const invalidateCache = async (pattern?: string) => {
    // Invalidate specific cache entries or all cache
    if (pattern) {
      // For pattern-based invalidation, we'd need to implement pattern matching
      // For now, we'll clear the entire cache
      await cacheManager.clear();
    } else {
      await cacheManager.clear();
    }
  };

  const getCacheStats = () => {
    return cacheManager.getStats();
  };

  // Real-time functions
  const subscribeToContentUpdates = (contentType: 'images' | 'videos' | 'stories', callback: (update: any) => void) => {
    // Use the content service's subscription method
    return contentService.subscribeToContentUpdates(contentType, callback);
  };

  const subscribeToNotifications = (callback: (notification: any) => void) => {
    // Use the notification service's message listener
    return notificationService.addMessageListener(callback);
  };

  const contextValue: ContentContextType = {
    state,
    setImagesLoading,
    setImagesSuccess,
    setImagesError,
    addImages,
    updateImage,
    likeImage,
    bookmarkImage,
    setVideosLoading,
    setVideosSuccess,
    setVideosError,
    addVideos,
    updateVideo,
    likeVideo,
    saveVideo,
    setStoriesLoading,
    setStoriesSuccess,
    setStoriesError,
    updateStory,
    markStoryViewed,
    setUsersLoading,
    setUsersSuccess,
    setUsersError,
    updateUser,
    followUser,
    setFeedLoading,
    setFeedSuccess,
    setFeedError,
    setTrendingLoading,
    setTrendingSuccess,
    setTrendingError,
    setRecommendedLoading,
    setRecommendedSuccess,
    setRecommendedError,
    setFilters,
    setSearchQuery,
    clearFilters,
    isImageLiked,
    isImageBookmarked,
    isVideoLiked,
    isVideoSaved,
    isStoryViewed,
    isUserFollowing,
    getCachedContent,
    setCachedContent,
    invalidateCache,
    getCacheStats,
    subscribeToContentUpdates,
    subscribeToNotifications,
  };

  return (
    <ContentContext.Provider value={contextValue}>
      {children}
    </ContentContext.Provider>
  );
}

// Custom hook to use content context
export function useContent(): ContentContextType {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}