"use client";

import { useState, useCallback, useRef } from 'react';
import { contentService, UploadFile, UploadOptions, UploadResult } from '@/lib/services/content-service';
import { useToast } from './use-toast';

export interface UseUploadOptions {
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  onProgress?: (files: UploadFile[]) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: 'pending'
      },
      metadata: {
        size: file.size,
        format: file.type
      }
    }));

    // Generate previews for images
    const filesWithPreviews = await Promise.all(
      newUploadFiles.map(async (uploadFile) => {
        if (uploadFile.type === 'image') {
          const preview = await generateImagePreview(uploadFile.file);
          return { ...uploadFile, preview };
        }
        return uploadFile;
      })
    );

    setUploadFiles(prev => [...prev, ...filesWithPreviews]);
    return filesWithPreviews;
  }, []);

  const generateImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // Create thumbnail
          const maxSize = 150;
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
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const updateFileProgress = useCallback((fileId: string, progress: UploadFile['progress']) => {
    setUploadFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, progress } : f
    ));

    if (options.onProgress) {
      options.onProgress(uploadFiles);
    }
  }, [uploadFiles, options.onProgress]);

  const uploadFilesWithProgress = useCallback(async (
    files: UploadFile[],
    uploadOptions: UploadOptions
  ): Promise<UploadResult[]> => {
    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    try {
      const results: UploadResult[] = [];

      // Upload files concurrently (max 3 at a time)
      const concurrentUploads = 3;
      for (let i = 0; i < files.length; i += concurrentUploads) {
        const batch = files.slice(i, i + concurrentUploads);

        const batchPromises = batch.map(async (uploadFile) => {
          if (uploadFile.type === 'image') {
            return contentService.uploadImage(
              uploadFile.file,
              uploadOptions,
              (progress) => updateFileProgress(uploadFile.id, progress)
            );
          } else {
            return contentService.uploadVideo(
              uploadFile.file,
              uploadOptions,
              (progress) => updateFileProgress(uploadFile.id, progress)
            );
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const successfulResults = batchResults
          .filter((result): result is PromiseFulfilledResult<UploadResult> => result.status === 'fulfilled')
          .map(result => result.value);

        results.push(...successfulResults);

        // Handle errors
        const failedResults = batchResults
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .forEach(result => {
            console.error('Upload failed:', result.reason);
            toast({
              title: "Upload Failed",
              description: result.reason.message || "An error occurred during upload",
              variant: "destructive"
            });
          });
      }

      setUploadResults(results);

      if (results.length > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${results.length} of ${files.length} files`,
        });

        if (options.onUploadComplete) {
          options.onUploadComplete(results);
        }
      }

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });

      if (options.onUploadError) {
        options.onUploadError(error instanceof Error ? error : new Error(errorMessage));
      }

      throw error;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [updateFileProgress, toast, options]);

  const removeFile = useCallback((fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadFiles(prev => prev.filter(f => f.progress.status !== 'completed'));
  }, []);

  const retryFile = useCallback(async (fileId: string, uploadOptions: UploadOptions) => {
    const fileToRetry = uploadFiles.find(f => f.id === fileId);
    if (!fileToRetry) return;

    // Reset progress
    updateFileProgress(fileId, {
      loaded: 0,
      total: fileToRetry.file.size,
      percentage: 0,
      status: 'pending'
    });

    // Retry upload
    try {
      const result = await (fileToRetry.type === 'image'
        ? contentService.uploadImage(fileToRetry.file, uploadOptions, (progress) => updateFileProgress(fileId, progress))
        : contentService.uploadVideo(fileToRetry.file, uploadOptions, (progress) => updateFileProgress(fileId, progress))
      );

      setUploadResults(prev => [...prev.filter(r => r.id !== fileId), result]);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [uploadFiles, updateFileProgress]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
  }, []);

  const pauseFile = useCallback((fileId: string) => {
    updateFileProgress(fileId, {
      ...uploadFiles.find(f => f.id === fileId)!.progress,
      status: 'cancelled'
    });
  }, [uploadFiles, updateFileProgress]);

  const resumeFile = useCallback((fileId: string) => {
    updateFileProgress(fileId, {
      ...uploadFiles.find(f => f.id === fileId)!.progress,
      status: 'pending'
    });
  }, [uploadFiles, updateFileProgress]);

  return {
    uploadFiles,
    isUploading,
    uploadResults,
    addFiles,
    upload: uploadFilesWithProgress,
    removeFile,
    clearCompleted,
    retryFile,
    cancelUpload,
    pauseFile,
    resumeFile
  };
}