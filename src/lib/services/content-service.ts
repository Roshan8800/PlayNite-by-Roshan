import { apiClient } from '../api/client';
import { ApiResponse, PaginatedResponse, ContentFilters, PaginationParams } from '../types/api';
import { ImageData, VideoData, StoryData, User } from '../mock-backend';
import { storageService, StorageUploadResult } from './storage-service';
import { contentModerationService } from './content-moderation-service';
import { postUploadService } from './post-upload-service';

// Upload-related types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';
  error?: string;
}

export interface UploadFile {
  id: string;
  file: File;
  type: 'image' | 'video';
  progress: UploadProgress;
  preview?: string;
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    format: string;
  };
}

export interface UploadOptions {
  category?: string;
  tags?: string[];
  title?: string;
  description?: string;
  isPublic?: boolean;
  quality?: 'low' | 'medium' | 'high';
  generateThumbnails?: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    format: string;
  };
  status: 'success' | 'error';
  error?: string;
}

// Content Service for handling all content-related API calls
export class ContentService {
  private readonly baseEndpoint = '/api/content';

  // Image-related methods
  async getImages(filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<ImageData>> {
    const params = this.buildParams(filters);
    return apiClient.getPaginated<ImageData>(`${this.baseEndpoint}/images`, params, {
      cache: { ttl: 2 * 60 * 1000 } // Cache images for 2 minutes
    });
  }

  async getImageById(id: string): Promise<ApiResponse<ImageData>> {
    return apiClient.get<ImageData>(`${this.baseEndpoint}/images/${id}`, {
      cache: { ttl: 5 * 60 * 1000 } // Cache individual images for 5 minutes
    });
  }

  async getImagesByCategory(category: string, filters?: PaginationParams): Promise<PaginatedResponse<ImageData>> {
    return this.getImages({ ...filters, category });
  }

  async searchImages(query: string, filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<ImageData>> {
    return this.getImages({ ...filters, search: query });
  }

  async likeImage(imageId: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return apiClient.post<{ liked: boolean; likes: number }>(`${this.baseEndpoint}/images/${imageId}/like`);
  }

  async unlikeImage(imageId: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return apiClient.delete<{ liked: boolean; likes: number }>(`${this.baseEndpoint}/images/${imageId}/like`);
  }

  async bookmarkImage(imageId: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return apiClient.post<{ bookmarked: boolean }>(`${this.baseEndpoint}/images/${imageId}/bookmark`);
  }

  async removeBookmarkImage(imageId: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return apiClient.delete<{ bookmarked: boolean }>(`${this.baseEndpoint}/images/${imageId}/bookmark`);
  }

  // Video-related methods
  async getVideos(filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<VideoData>> {
    const params = this.buildParams(filters);
    return apiClient.getPaginated<VideoData>(`${this.baseEndpoint}/videos`, params, {
      cache: { ttl: 2 * 60 * 1000 }
    });
  }

  async getVideoById(id: string): Promise<ApiResponse<VideoData>> {
    return apiClient.get<VideoData>(`${this.baseEndpoint}/videos/${id}`, {
      cache: { ttl: 5 * 60 * 1000 }
    });
  }

  async getVideosByCategory(category: string, filters?: PaginationParams): Promise<PaginatedResponse<VideoData>> {
    return this.getVideos({ ...filters, category });
  }

  async searchVideos(query: string, filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<VideoData>> {
    return this.getVideos({ ...filters, search: query });
  }

  async likeVideo(videoId: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return apiClient.post<{ liked: boolean; likes: number }>(`${this.baseEndpoint}/videos/${videoId}/like`);
  }

  async saveVideo(videoId: string): Promise<ApiResponse<{ saved: boolean }>> {
    return apiClient.post<{ saved: boolean }>(`${this.baseEndpoint}/videos/${videoId}/save`);
  }

  // Story-related methods
  async getStories(filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<StoryData>> {
    const params = this.buildParams(filters);
    return apiClient.getPaginated<StoryData>(`${this.baseEndpoint}/stories`, params, {
      cache: { ttl: 1 * 60 * 1000 } // Cache stories for 1 minute (more dynamic)
    });
  }

  async getStoryById(id: string): Promise<ApiResponse<StoryData>> {
    return apiClient.get<StoryData>(`${this.baseEndpoint}/stories/${id}`, {
      cache: { ttl: 2 * 60 * 1000 }
    });
  }

  async getStoriesByUser(userId: string): Promise<PaginatedResponse<StoryData>> {
    return this.getStories({ userId });
  }

  async markStoryAsViewed(storyId: string): Promise<ApiResponse<{ viewed: boolean }>> {
    return apiClient.post<{ viewed: boolean }>(`${this.baseEndpoint}/stories/${storyId}/view`);
  }

  // User-related methods
  async getUsers(filters?: ContentFilters & PaginationParams): Promise<PaginatedResponse<User>> {
    const params = this.buildParams(filters);
    return apiClient.getPaginated<User>(`${this.baseEndpoint}/users`, params, {
      cache: { ttl: 10 * 60 * 1000 } // Cache users for 10 minutes
    });
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`${this.baseEndpoint}/users/${id}`, {
      cache: { ttl: 10 * 60 * 1000 }
    });
  }

  async searchUsers(query: string, filters?: PaginationParams): Promise<PaginatedResponse<User>> {
    return this.getUsers({ ...filters, search: query });
  }

  async followUser(userId: string): Promise<ApiResponse<{ following: boolean }>> {
    return apiClient.post<{ following: boolean }>(`${this.baseEndpoint}/users/${userId}/follow`);
  }

  async unfollowUser(userId: string): Promise<ApiResponse<{ following: boolean }>> {
    return apiClient.delete<{ following: boolean }>(`${this.baseEndpoint}/users/${userId}/follow`);
  }

  // Trending and recommended content
  async getTrendingContent(type?: 'all' | 'images' | 'videos' | 'stories'): Promise<ApiResponse<{
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  }>> {
    const endpoint = type ? `${this.baseEndpoint}/trending/${type}` : `${this.baseEndpoint}/trending`;
    return apiClient.get(endpoint, {
      cache: { ttl: 5 * 60 * 1000 } // Cache trending for 5 minutes
    });
  }

  async getRecommendedContent(userId?: string): Promise<ApiResponse<{
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  }>> {
    const params = userId ? { userId } : {};
    return apiClient.get(`${this.baseEndpoint}/recommended`, {
      cache: { ttl: 3 * 60 * 1000 }, // Cache recommendations for 3 minutes
      ...params
    });
  }

  // Feed methods
  async getFeed(userId?: string, filters?: PaginationParams): Promise<PaginatedResponse<{
    images: ImageData[];
    videos: VideoData[];
    stories: StoryData[];
  }>> {
    const params = { ...filters, ...(userId && { userId }) };
    return apiClient.getPaginated(`${this.baseEndpoint}/feed`, params, {
      cache: { ttl: 2 * 60 * 1000 }
    });
  }

  // Statistics and analytics
  async getContentStats(contentType: 'images' | 'videos' | 'stories', contentId: string): Promise<ApiResponse<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
  }>> {
    return apiClient.get(`${this.baseEndpoint}/${contentType}/${contentId}/stats`);
  }

  // Helper method to build query parameters
  private buildParams(filters?: ContentFilters & PaginationParams): Record<string, string> {
    if (!filters) return {};

    const params: Record<string, string> = {};

    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.type) params.type = filters.type;
    if (filters.userId) params.userId = filters.userId;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.minViews) params.minViews = filters.minViews.toString();
    if (filters.maxViews) params.maxViews = filters.maxViews.toString();
    if (filters.verified !== undefined) params.verified = filters.verified.toString();
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();

    // Handle tags array
    if (filters.tags && filters.tags.length > 0) {
      params.tags = filters.tags.join(',');
    }

    return params;
  }

  // Real-time subscriptions
  subscribeToContentUpdates(
    contentType: 'images' | 'videos' | 'stories',
    callback: (update: any) => void
  ): () => void {
    // In a real app, this would connect to WebSocket or SSE
    // For now, we'll return a no-op unsubscribe function
    return () => {};
  }

  // Batch operations
  async batchLike(contentIds: string[], contentType: 'images' | 'videos'): Promise<ApiResponse<{
    success: string[];
    failed: string[];
  }>> {
    return apiClient.post(`${this.baseEndpoint}/batch/${contentType}/like`, { contentIds });
  }

  async batchBookmark(imageIds: string[]): Promise<ApiResponse<{
    success: string[];
    failed: string[];
  }>> {
    return apiClient.post(`${this.baseEndpoint}/batch/images/bookmark`, { imageIds });
  }

  // Upload methods
  async uploadImage(
    file: File,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const uploadFile: UploadFile = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: 'image',
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: 'pending'
      }
    };

    try {
      // Validate file
      this.validateImageFile(file);

      // Check for duplicates
      const duplicateCheck = await contentModerationService.checkForDuplicates(file);
      if (duplicateCheck.isDuplicate) {
        throw new Error(`Similar content already exists (similarity: ${Math.round(duplicateCheck.similarity * 100)}%)`);
      }

      // Moderate content
      const moderation = await contentModerationService.moderateContent(file, 'image');
      if (!moderation.isApproved) {
        throw new Error('Content violates platform guidelines');
      }

      // Extract metadata
      const metadata = await this.extractImageMetadata(file);

      // Generate preview
      const preview = await this.generateImagePreview(file);

      uploadFile.preview = preview;
      uploadFile.metadata = metadata;

      // Update progress
      uploadFile.progress.status = 'uploading';
      if (onProgress) onProgress(uploadFile.progress);

      // Compress and optimize image
      const optimizedFile = await this.optimizeImage(file, options.quality || 'high');

      // Upload to storage
      const uploadResult = await this.uploadToStorage(optimizedFile, 'images', uploadFile.id, (loaded, total) => {
        uploadFile.progress.loaded = loaded;
        uploadFile.progress.total = total;
        uploadFile.progress.percentage = (loaded / total) * 100;
        if (onProgress) onProgress(uploadFile.progress);
      });

      const { url } = uploadResult;

      // Generate thumbnail
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnails !== false) {
        uploadFile.progress.status = 'processing';
        if (onProgress) onProgress(uploadFile.progress);

        thumbnailUrl = await this.generateThumbnail(optimizedFile, uploadResult.url);
      }

      // Process with AI for tagging and categorization
      uploadFile.progress.status = 'processing';
      if (onProgress) onProgress(uploadFile.progress);

      const processedData = await this.processImageWithAI(uploadResult.url, metadata);

      // Save to database
      const savedImage = await this.saveImageToDatabase({
        url: uploadResult.url,
        thumbnailUrl,
        metadata,
        title: options.title || file.name,
        description: options.description || '',
        category: options.category || 'photos',
        tags: options.tags || processedData.tags || [],
        isPublic: options.isPublic !== false
      });

      // Post-upload processing
      await postUploadService.processAfterUpload(savedImage.id, {
        id: savedImage.id,
        title: options.title || file.name,
        description: options.description || '',
        tags: options.tags || processedData.tags || [],
        category: options.category || 'photos',
        metadata: metadata || { size: file.size, format: file.type, width: 0, height: 0, duration: 0 },
        url: uploadResult.url,
        thumbnailUrl,
        userId: 'current-user', // In a real app, this would come from auth context
        isPublic: options.isPublic !== false
      });

      uploadFile.progress.status = 'completed';
      uploadFile.progress.percentage = 100;
      if (onProgress) onProgress(uploadFile.progress);

      return {
        id: savedImage.id,
        url: uploadResult.url,
        thumbnailUrl,
        metadata: metadata || { size: file.size, format: file.type, width: 0, height: 0, duration: 0 },
        status: 'success'
      };

    } catch (error) {
      uploadFile.progress.status = 'error';
      uploadFile.progress.error = error instanceof Error ? error.message : 'Upload failed';
      if (onProgress) onProgress(uploadFile.progress);

      return {
        id: uploadFile.id,
        url: '',
        metadata: uploadFile.metadata || { size: file.size, format: file.type, width: 0, height: 0, duration: 0 },
        status: 'error',
        error: uploadFile.progress.error
      };
    }
  }

  async uploadVideo(
    file: File,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const uploadFile: UploadFile = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: 'video',
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: 'pending'
      }
    };

    try {
      // Validate file
      this.validateVideoFile(file);

      // Check for duplicates
      const duplicateCheck = await contentModerationService.checkForDuplicates(file);
      if (duplicateCheck.isDuplicate) {
        throw new Error(`Similar content already exists (similarity: ${Math.round(duplicateCheck.similarity * 100)}%)`);
      }

      // Moderate content
      const moderation = await contentModerationService.moderateContent(file, 'video');
      if (!moderation.isApproved) {
        throw new Error('Content violates platform guidelines');
      }

      // Extract metadata
      const metadata = await this.extractVideoMetadata(file);

      uploadFile.metadata = metadata;

      // Update progress
      uploadFile.progress.status = 'uploading';
      if (onProgress) onProgress(uploadFile.progress);

      // Upload to storage (videos are typically not compressed during upload)
      const uploadResult = await this.uploadToStorage(file, 'videos', uploadFile.id, (loaded, total) => {
        uploadFile.progress.loaded = loaded;
        uploadFile.progress.total = total;
        uploadFile.progress.percentage = (loaded / total) * 100;
        if (onProgress) onProgress(uploadFile.progress);
      });

      // Generate thumbnail
      uploadFile.progress.status = 'processing';
      if (onProgress) onProgress(uploadFile.progress);

      const thumbnailUrl = await this.generateVideoThumbnail(file, uploadResult.url);

      // Process with AI for content analysis
      const processedData = await this.processVideoWithAI(uploadResult.url, metadata);

      // Save to database
      const savedVideo = await this.saveVideoToDatabase({
        url: uploadResult.url,
        thumbnailUrl,
        metadata,
        title: options.title || file.name,
        description: options.description || '',
        category: options.category || 'reels',
        tags: options.tags || processedData.tags || [],
        isPublic: options.isPublic !== false
      });

      uploadFile.progress.status = 'completed';
      uploadFile.progress.percentage = 100;
      if (onProgress) onProgress(uploadFile.progress);

      return {
        id: savedVideo.id,
        url: uploadResult.url,
        thumbnailUrl,
        metadata: metadata || { size: file.size, format: file.type, width: 0, height: 0, duration: 0 },
        status: 'success'
      };

    } catch (error) {
      uploadFile.progress.status = 'error';
      uploadFile.progress.error = error instanceof Error ? error.message : 'Upload failed';
      if (onProgress) onProgress(uploadFile.progress);

      return {
        id: uploadFile.id,
        url: '',
        metadata: uploadFile.metadata || { size: file.size, format: file.type, width: 0, height: 0, duration: 0 },
        status: 'error',
        error: uploadFile.progress.error
      };
    }
  }

  async uploadMultipleFiles(
    files: File[],
    options: UploadOptions = {},
    onProgress?: (files: UploadFile[]) => void
  ): Promise<UploadResult[]> {
    const uploadFiles: UploadFile[] = files.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: 'pending'
      }
    }));

    const results: UploadResult[] = [];

    // Upload files concurrently but limit to 3 at a time
    const concurrentUploads = 3;
    for (let i = 0; i < uploadFiles.length; i += concurrentUploads) {
      const batch = uploadFiles.slice(i, i + concurrentUploads);
      const batchPromises = batch.map(uploadFile =>
        uploadFile.type === 'image'
          ? this.uploadImage(uploadFile.file, options, (progress) => {
              uploadFile.progress = progress;
              if (onProgress) onProgress(uploadFiles);
            })
          : this.uploadVideo(uploadFile.file, options, (progress) => {
              uploadFile.progress = progress;
              if (onProgress) onProgress(uploadFiles);
            })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result =>
        result.status === 'fulfilled' ? result.value : {
          id: `error-${Date.now()}`,
          url: '',
          metadata: { size: 0, format: 'unknown' },
          status: 'error' as const,
          error: result.reason?.message || 'Upload failed'
        }
      ));
    }

    return results;
  }

  // File validation methods
  private validateImageFile(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      throw new Error('Image file size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid image format. Please use JPG, PNG, GIF, or WebP');
    }
  }

  private validateVideoFile(file: File): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

    if (file.size > maxSize) {
      throw new Error('Video file size must be less than 100MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid video format. Please use MP4, WebM, OGG, AVI, or MOV');
    }
  }

  // Metadata extraction methods
  private async extractImageMetadata(file: File): Promise<UploadFile['metadata']> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          format: file.type
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          size: file.size,
          format: file.type
        });
      };

      img.src = url;
    });
  }

  private async extractVideoMetadata(file: File): Promise<UploadFile['metadata']> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          size: file.size,
          format: file.type
        });
      });

      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve({
          size: file.size,
          format: file.type
        });
      });

      video.src = url;
    });
  }

  // Image processing methods
  private async generateImagePreview(file: File): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Create a preview thumbnail
        const maxSize = 300;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob!));
        }, 'image/jpeg', 0.8);
      };

      img.src = url;
    });
  }

  private async optimizeImage(file: File, quality: 'low' | 'medium' | 'high'): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Set canvas size based on quality
        const qualitySettings = {
          low: { maxWidth: 1200, maxHeight: 1200, compression: 0.6 },
          medium: { maxWidth: 1920, maxHeight: 1920, compression: 0.8 },
          high: { maxWidth: 2560, maxHeight: 2560, compression: 0.9 }
        };

        const settings = qualitySettings[quality];
        let { width, height } = img;

        if (width > height) {
          if (width > settings.maxWidth) {
            height = (height * settings.maxWidth) / width;
            width = settings.maxWidth;
          }
        } else {
          if (height > settings.maxHeight) {
            width = (width * settings.maxHeight) / height;
            height = settings.maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', settings.compression);
      };

      img.src = url;
    });
  }

  // Storage and processing methods
  private async uploadToStorage(
    file: File,
    folder: string,
    id: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<StorageUploadResult> {
    try {
      // Use Firebase Storage service for actual file upload
      const uploadResult = await storageService.uploadFile(
        file,
        {
          folder,
          fileName: `${id}.${file.name.split('.').pop()}`
        },
        (progress) => {
          if (onProgress) {
            onProgress(progress.loaded, progress.total);
          }
        }
      );

      return uploadResult;
    } catch (error) {
      console.error('Storage upload failed:', error);
      throw error;
    }
  }

  private async generateThumbnail(file: File, imageUrl: string): Promise<string> {
    // Generate thumbnail from uploaded image
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Create 400x400 thumbnail
        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(img, 0, 0, 400, 400);

        canvas.toBlob((blob) => {
          const thumbnailUrl = URL.createObjectURL(blob!);
          resolve(thumbnailUrl);
        }, 'image/jpeg', 0.8);
      };

      img.src = imageUrl;
    });
  }

  private async generateVideoThumbnail(file: File, videoUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      video.onloadeddata = () => {
        // Seek to 1 second or 10% of duration for thumbnail
        const thumbnailTime = Math.min(1, video.duration * 0.1);
        video.currentTime = thumbnailTime;
      };

      video.onseeked = () => {
        canvas.width = 400;
        canvas.height = 400;
        ctx.drawImage(video, 0, 0, 400, 400);

        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob!));
        }, 'image/jpeg', 0.8);
      };

      video.src = videoUrl;
    });
  }

  private async processImageWithAI(imageUrl: string, metadata: any): Promise<{ tags: string[] }> {
    try {
      // Create a temporary file from the URL for analysis
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'processed-image.jpg', { type: 'image/jpeg' });

      // Use content moderation service for tag extraction
      const analysis = await contentModerationService.extractContentTags(file, 'image');

      return {
        tags: analysis.tags
      };
    } catch (error) {
      console.error('AI processing failed:', error);
      return {
        tags: ['processed', 'error']
      };
    }
  }

  private async processVideoWithAI(videoUrl: string, metadata: any): Promise<{ tags: string[] }> {
    try {
      // Create a temporary file from the URL for analysis
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'processed-video.mp4', { type: 'video/mp4' });

      // Use content moderation service for tag extraction
      const analysis = await contentModerationService.extractContentTags(file, 'video');

      return {
        tags: analysis.tags
      };
    } catch (error) {
      console.error('Video AI processing failed:', error);
      return {
        tags: ['video', 'processed', 'error']
      };
    }
  }

  private async saveImageToDatabase(data: any): Promise<{ id: string }> {
    // Simulate saving to database
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `img-${Date.now()}`
        });
      }, 500);
    });
  }

  private async saveVideoToDatabase(data: any): Promise<{ id: string }> {
    // Simulate saving to database
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `vid-${Date.now()}`
        });
      }, 500);
    });
  }
}

// Export singleton instance
export const contentService = new ContentService();
