"use client";

import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Video, AlertCircle, CheckCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { Alert, AlertDescription } from './alert';
import { cn } from '@/lib/utils';

export interface UploadFile {
  id: string;
  file: File;
  type: 'image' | 'video';
  progress: {
    loaded: number;
    total: number;
    percentage: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled' | 'paused';
    error?: string;
  };
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

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  onUpload: (files: UploadFile[], options: UploadOptions) => Promise<void>;
  multiple?: boolean;
  maxFiles?: number;
  acceptedTypes?: string;
  maxSize?: number;
  className?: string;
}

interface UploadOptions {
  category?: string;
  tags?: string[];
  title?: string;
  description?: string;
  isPublic?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export function UploadArea({
  onFilesSelected,
  onUpload,
  multiple = true,
  maxFiles = 10,
  acceptedTypes = "image/*,video/*",
  maxSize = 100 * 1024 * 1024, // 100MB
  className
}: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    quality: 'high',
    isPublic: true
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`;
    }

    if (!acceptedTypes.includes(file.type.split('/')[0]) && acceptedTypes !== '*') {
      const acceptedTypesArray = acceptedTypes.split(',');
      const isAccepted = acceptedTypesArray.some(type => {
        const [category, subtype] = type.trim().split('/');
        if (subtype === '*') {
          return file.type.startsWith(category + '/');
        }
        return file.type === type.trim();
      });

      if (!isAccepted) {
        return `File type not supported. Please use: ${acceptedTypes}`;
      }
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`Some files were skipped:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) return;

    // Check max files limit
    if (uploadFiles.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      validFiles.splice(maxFiles - uploadFiles.length);
    }

    // Create upload file objects
    const newUploadFiles: UploadFile[] = await Promise.all(
      validFiles.map(async (file) => {
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        let preview: string | undefined;

        if (type === 'image') {
          preview = await generatePreview(file);
        }

        return {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          type,
          preview,
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
        };
      })
    );

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    onFilesSelected(validFiles);
  }, [uploadFiles.length, maxFiles, maxSize, acceptedTypes, onFilesSelected]);

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
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
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    e.target.value = ''; // Reset input
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.progress.status !== 'completed'));
  };

  const retryFile = (fileId: string) => {
    setUploadFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, progress: { ...f.progress, status: 'pending', error: undefined } }
        : f
    ));
  };

  const pauseFile = (fileId: string) => {
    setUploadFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, progress: { ...f.progress, status: 'paused' } }
        : f
    ));
  };

  const resumeFile = (fileId: string) => {
    setUploadFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, progress: { ...f.progress, status: 'pending' } }
        : f
    ));
  };

  const startUpload = async () => {
    if (uploadFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    try {
      await onUpload(uploadFiles, uploadOptions);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: UploadFile['progress']['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadFile['progress']['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      case 'paused':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragOver ? "Drop files here" : "Drag and drop files here"}
        </h3>
        <p className="text-muted-foreground mb-4">or click to browse files</p>

        <input
          id="file-input"
          type="file"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={handleFileInput}
          className="hidden"
        />

        <Button type="button">
          <ImageIcon className="w-4 h-4 mr-2" />
          Choose Files
        </Button>

        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>Supported formats: JPG, PNG, GIF, WebP, MP4, WebM (max {formatFileSize(maxSize)})</p>
          <p>Maximum {maxFiles} files at once</p>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Queue</h3>
              <div className="flex gap-2">
                {uploadFiles.some(f => f.progress.status === 'completed') && (
                  <Button variant="outline" size="sm" onClick={clearCompleted}>
                    Clear Completed
                  </Button>
                )}
                <Button
                  onClick={startUpload}
                  disabled={isUploading || uploadFiles.every(f => f.progress.status === 'completed')}
                >
                  {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} Files`}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  {/* Preview */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {uploadFile.preview ? (
                      <img
                        src={uploadFile.preview}
                        alt={uploadFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {uploadFile.type === 'image' ? (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Video className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{uploadFile.file.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {uploadFile.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)}
                      {uploadFile.metadata?.width && uploadFile.metadata?.height &&
                        ` • ${uploadFile.metadata.width}×${uploadFile.metadata.height}`
                      }
                      {uploadFile.metadata?.duration &&
                        ` • ${Math.round(uploadFile.metadata.duration)}s`
                      }
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <Progress
                        value={uploadFile.progress.percentage}
                        className="h-2"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(uploadFile.progress.status)}
                          <span className={cn("text-xs", getStatusColor(uploadFile.progress.status))}>
                            {uploadFile.progress.status === 'uploading' && `${Math.round(uploadFile.progress.percentage)}%`}
                            {uploadFile.progress.status === 'processing' && 'Processing...'}
                            {uploadFile.progress.status === 'completed' && 'Completed'}
                            {uploadFile.progress.status === 'error' && (uploadFile.progress.error || 'Error')}
                            {uploadFile.progress.status === 'paused' && 'Paused'}
                            {uploadFile.progress.status === 'pending' && 'Pending'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {uploadFile.progress.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryFile(uploadFile.id)}
                              className="h-6 w-6 p-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}

                          {(uploadFile.progress.status === 'uploading' || uploadFile.progress.status === 'processing') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => pauseFile(uploadFile.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Pause className="w-3 h-3" />
                            </Button>
                          )}

                          {uploadFile.progress.status === 'paused' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resumeFile(uploadFile.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Options */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quality</label>
                <select
                  value={uploadOptions.quality}
                  onChange={(e) => setUploadOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Low (faster upload)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (best quality)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select
                  value={uploadOptions.category || ''}
                  onChange={(e) => setUploadOptions(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select category</option>
                  <option value="photos">Photos</option>
                  <option value="art">Art</option>
                  <option value="ai-generated">AI Generated</option>
                  <option value="screenshots">Screenshots</option>
                  <option value="memes">Memes</option>
                  <option value="wallpapers">Wallpapers</option>
                  <option value="reels">Reels</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}