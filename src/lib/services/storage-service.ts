import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from '../firebase';
import { UploadProgress } from './content-service';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';
import Debug from 'debug';
const debug = Debug('playnite:storage-service');

export interface StorageUploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  cacheControl?: string;
}

export interface StorageUploadResult {
  url: string;
  path: string;
  bucket: string;
  size: number;
  contentType: string;
}

export class StorageService {
  /**
    * Upload a file to Firebase Storage with progress tracking
    */
  async uploadFile(
    file: File | Blob,
    options: StorageUploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<StorageUploadResult> {
    const startTime = performance.now();
    const {
      folder = 'uploads',
      fileName,
      contentType = file.type,
      cacheControl = 'public, max-age=31536000' // 1 year cache
    } = options;

    debug('uploadFile called with params:', {
      fileSize: file.size,
      fileType: file.type,
      folder,
      fileName,
      contentType,
      cacheControl
    });

    logInfo('File upload operation started', {
      component: 'storage-service',
      operation: 'uploadFile',
      metadata: {
        fileSize: file.size,
        fileType: file.type,
        folder,
        contentType,
        hasCustomFileName: !!fileName
      }
    });

    try {
      // Generate unique filename if not provided
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file instanceof File ? file.name.split('.').pop() : 'bin';
      const finalFileName = fileName || `${timestamp}_${randomId}.${extension}`;

      debug('Generated filename:', { finalFileName, extension });

      // Create storage reference
      const path = `${folder}/${finalFileName}`;
      const storageRef = ref(storage, path);

      // Create metadata
      const metadata = {
        contentType,
        cacheControl,
        customMetadata: {
          originalName: file instanceof File ? file.name : 'unknown',
          uploadedAt: new Date().toISOString(),
          size: file.size.toString()
        }
      };

      debug('Created storage metadata:', metadata);

      return new Promise((resolve, reject) => {
        // Create upload task
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        // Track progress
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress: UploadProgress = {
              loaded: snapshot.bytesTransferred,
              total: snapshot.totalBytes,
              percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              status: 'uploading'
            };

            debug('Upload progress:', progress);

            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            const duration = performance.now() - startTime;
            logError(error, {
              category: ErrorCategory.FILE_SYSTEM,
              severity: ErrorSeverity.HIGH,
              component: 'storage-service',
              action: 'uploadFile',
              metadata: {
                fileSize: file.size,
                fileType: file.type,
                path,
                duration,
                errorCode: error.code,
                errorMessage: error.message
              }
            });

            debug('Upload failed:', { error: error.message, path });
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              debug('Upload completed, getting download URL');

              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

              const duration = performance.now() - startTime;
              const result: StorageUploadResult = {
                url: downloadURL,
                path,
                bucket: storageRef.bucket,
                size: uploadTask.snapshot.totalBytes,
                contentType
              };

              logInfo('File upload completed successfully', {
                component: 'storage-service',
                operation: 'uploadFile',
                metadata: {
                  path,
                  fileSize: result.size,
                  contentType: result.contentType,
                  duration,
                  downloadURL: downloadURL.substring(0, 50) + '...' // Log partial URL for security
                }
              });

              debug('Upload successful:', {
                path,
                size: result.size,
                duration,
                urlLength: downloadURL.length
              });

              resolve(result);
            } catch (error) {
              const duration = performance.now() - startTime;
              logError(error, {
                category: ErrorCategory.EXTERNAL_API,
                severity: ErrorSeverity.HIGH,
                component: 'storage-service',
                action: 'uploadFile',
                metadata: {
                  fileSize: file.size,
                  fileType: file.type,
                  path,
                  duration,
                  errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
              });

              debug('Failed to get download URL:', { error: error instanceof Error ? error.message : error, path });
              reject(new Error(`Failed to get download URL: ${error}`));
            }
          }
        );
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.FILE_SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        component: 'storage-service',
        action: 'uploadFile',
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          folder,
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      debug('Upload setup failed:', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Upload multiple files concurrently
   */
  async uploadMultipleFiles(
    files: Array<{ file: File | Blob; options?: StorageUploadOptions }>,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<StorageUploadResult[]> {
    const startTime = performance.now();

    debug('uploadMultipleFiles called:', {
      fileCount: files.length,
      totalSize: files.reduce((sum, { file }) => sum + file.size, 0)
    });

    logInfo('Batch file upload operation started', {
      component: 'storage-service',
      operation: 'uploadMultipleFiles',
      metadata: {
        fileCount: files.length,
        totalSize: files.reduce((sum, { file }) => sum + file.size, 0),
        hasProgressCallback: !!onProgress
      }
    });

    const uploadPromises = files.map(async ({ file, options = {} }, index) => {
      return this.uploadFile(file, options, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      });
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successful: StorageUploadResult[] = [];
      const failed: string[] = [];
      const duration = performance.now() - startTime;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
          debug(`File ${index + 1} uploaded successfully`);
        } else {
          failed.push(`File ${index + 1}: ${result.reason.message}`);
          debug(`File ${index + 1} failed:`, result.reason.message);
        }
      });

      if (failed.length > 0) {
        logError(new Error(`Batch upload partially failed: ${failed.length}/${files.length} files failed`), {
          category: ErrorCategory.FILE_SYSTEM,
          severity: failed.length === files.length ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
          component: 'storage-service',
          action: 'uploadMultipleFiles',
          metadata: {
            totalFiles: files.length,
            successfulFiles: successful.length,
            failedFiles: failed.length,
            failedReasons: failed,
            duration,
            totalSize: files.reduce((sum, { file }) => sum + file.size, 0)
          }
        });
      }

      logInfo('Batch file upload completed', {
        component: 'storage-service',
        operation: 'uploadMultipleFiles',
        metadata: {
          totalFiles: files.length,
          successfulFiles: successful.length,
          failedFiles: failed.length,
          duration,
          successRate: `${successful.length}/${files.length}`
        }
      });

      debug('Batch upload completed:', {
        successful: successful.length,
        failed: failed.length,
        duration
      });

      return successful;
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.FILE_SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        component: 'storage-service',
        action: 'uploadMultipleFiles',
        metadata: {
          fileCount: files.length,
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      debug('Batch upload failed:', error instanceof Error ? error.message : error);
      throw new Error(`Batch upload failed: ${error}`);
    }
  }

  /**
   * Delete a file from Firebase Storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string) {
    try {
      const storageRef = ref(storage, path);
      const [metadata, downloadURL] = await Promise.all([
        getMetadata(storageRef),
        getDownloadURL(storageRef)
      ]);
      return { ...metadata, downloadURL };
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Generate optimized image URLs for different sizes
   */
  generateImageVariants(originalUrl: string, sizes: number[] = [400, 800, 1200, 1920]): { [key: number]: string } {
    const variants: { [key: number]: string } = {};

    sizes.forEach(size => {
      // For Firebase Storage, we can use URL parameters for resizing
      // This is a simplified approach - in production, you'd use Firebase's image resizing or a CDN
      variants[size] = `${originalUrl}?width=${size}&quality=80`;
    });

    return variants;
  }

  /**
   * Generate thumbnail URL from video
   */
  generateThumbnailUrl(videoUrl: string, timestamp: number = 1): string {
    // Extract the base URL and add thumbnail parameters
    const url = new URL(videoUrl);
    url.searchParams.set('thumbnail', timestamp.toString());
    return url.toString();
  }

  /**
   * Validate storage configuration
   */
  async validateStorageAccess(): Promise<boolean> {
    try {
      // Try to access storage bucket info to validate configuration
      const testRef = ref(storage, '.test-access');
      await getDownloadURL(testRef);
      return true;
    } catch (error) {
      console.error('Storage access validation failed:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics (if available)
   */
  async getStorageStats(): Promise<{
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
  } | null> {
    try {
      // Firebase doesn't provide direct storage stats
      // This would need to be implemented server-side or with a custom solution
      return null;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();