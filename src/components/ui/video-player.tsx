"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture,
  SkipBack,
  SkipForward,
  MoreVertical,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

export interface VideoQuality {
  label: string;
  value: string;
  bitrate?: number;
  height?: number;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  qualityOptions?: VideoQuality[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onQualityChange?: (quality: string) => void;
  className?: string;
  showTitle?: boolean;
  enableKeyboardShortcuts?: boolean;
  enablePictureInPicture?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080p', height: 1080 },
    { label: '720p', value: '720p', height: 720 },
    { label: '480p', value: '480p', height: 480 },
    { label: '360p', value: '360p', height: 360 }
  ],
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onError,
  onQualityChange,
  className,
  showTitle = false,
  enableKeyboardShortcuts = true,
  enablePictureInPicture = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);

  // Component lifecycle logging
  useEffect(() => {
    logInfo('VideoPlayer component mounted', {
      component: 'VideoPlayer',
      metadata: {
        src: src.substring(0, 50) + '...',
        title: title || 'No title',
        autoPlay,
        muted,
        loop,
        controls
      }
    });

    return () => {
      logInfo('VideoPlayer component unmounted', {
        component: 'VideoPlayer',
        metadata: {
          finalCurrentTime: currentTime,
          finalDuration: duration,
          finalVolume: volume,
          wasPlaying: isPlaying
        }
      });
    };
  }, []);

  // Performance monitoring for expensive operations
  useEffect(() => {
    const startTime = performance.now();

    // Monitor render performance
    const endTime = performance.now();
    logInfo('VideoPlayer render performance', {
      component: 'VideoPlayer',
      operation: 'render',
      metadata: {
        duration: endTime - startTime,
        propsCount: Object.keys({
          src, poster, title, autoPlay, muted, loop, controls,
          qualityOptions, className, showTitle, enableKeyboardShortcuts, enablePictureInPicture
        }).length
      }
    });
  });

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying && !isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyP':
          e.preventDefault();
          if (enablePictureInPicture && videoRef.current && 'requestPictureInPicture' in videoRef.current) {
            togglePictureInPicture();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboardShortcuts, enablePictureInPicture]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Picture-in-picture handler
  useEffect(() => {
    if (!videoRef.current) return;

    const handlePictureInPictureChange = () => {
      setIsPictureInPicture(!!document.pictureInPictureElement);
    };

    videoRef.current.addEventListener('enterpictureinpicture', handlePictureInPictureChange);
    videoRef.current.addEventListener('leavepictureinpicture', handlePictureInPictureChange);

    return () => {
      videoRef.current?.removeEventListener('enterpictureinpicture', handlePictureInPictureChange);
      videoRef.current?.removeEventListener('leavepictureinpicture', handlePictureInPictureChange);
    };
  }, []);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      setBuffered(videoRef.current.buffered.length > 0 ? videoRef.current.buffered.end(0) : 0);
      onTimeUpdate?.(current, duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    resetControlsTimeout();
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    onPause?.();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  const handleError = () => {
    setError('Failed to load video');
    setIsLoading(false);
    onError?.('Failed to load video');
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const handleProgressChange = (newTime: number[]) => {
    const time = newTime[0];
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Control functions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    try {
      logInfo('User interaction - toggle play', {
        component: 'VideoPlayer',
        action: 'togglePlay',
        metadata: {
          currentState: isPlaying,
          hasVideo: !!videoRef.current,
          currentTime,
          duration
        }
      });

      if (isPlaying) {
        videoRef.current.pause();
        logInfo('Video paused', {
          component: 'VideoPlayer',
          action: 'togglePlay',
          metadata: { result: 'paused', currentTime }
        });
      } else {
        videoRef.current.play();
        logInfo('Video played', {
          component: 'VideoPlayer',
          action: 'togglePlay',
          metadata: { result: 'played', currentTime }
        });
      }
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoPlayer',
        action: 'togglePlay',
        metadata: {
          currentState: isPlaying,
          hasVideo: !!videoRef.current,
          currentTime,
          duration
        }
      });
    }
  }, [isPlaying, currentTime, duration]);

  const toggleMute = () => {
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (newMuted) {
      setVolume(0);
    } else {
      setVolume(videoRef.current.volume || 1);
    }
  };

  const changeVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;

    try {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));

      logInfo('User interaction - skip video', {
        component: 'VideoPlayer',
        action: 'skip',
        metadata: {
          skipSeconds: seconds,
          fromTime: currentTime,
          toTime: newTime,
          duration,
          direction: seconds > 0 ? 'forward' : 'backward'
        }
      });

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      logInfo('Video skip completed', {
        component: 'VideoPlayer',
        action: 'skip',
        metadata: {
          result: 'success',
          finalTime: newTime,
          skipSeconds: seconds
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'VideoPlayer',
        action: 'skip',
        metadata: {
          skipSeconds: seconds,
          currentTime,
          duration,
          hasVideo: !!videoRef.current
        }
      });
    }
  }, [currentTime, duration]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoPlayer',
        action: 'toggleFullscreen',
        metadata: {
          currentState: isFullscreen,
          hasContainer: !!containerRef.current
        }
      });
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current || !enablePictureInPicture || !('requestPictureInPicture' in videoRef.current)) return;

    try {
      if (isPictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        await (videoRef.current as any).requestPictureInPicture();
      }
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoPlayer',
        action: 'togglePictureInPicture',
        metadata: {
          currentState: isPictureInPicture,
          hasVideo: !!videoRef.current,
          enablePictureInPicture,
          supportsPictureInPicture: !!videoRef.current && 'requestPictureInPicture' in videoRef.current
        }
      });
    }
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    onQualityChange?.(quality);
    setShowQualityMenu(false);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const formatTime = useCallback((time: number) => {
    const startTime = performance.now();

    try {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);

      let result: string;
      if (hours > 0) {
        result = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        result = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log performance if it takes too long (threshold: 1ms)
      if (duration > 1) {
        logInfo('Time formatting performance issue', {
          component: 'VideoPlayer',
          operation: 'formatTime',
          metadata: {
            duration,
            inputTime: time,
            output: result
          }
        });
      }

      return result;
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'VideoPlayer',
        action: 'formatTime',
        metadata: { inputTime: time }
      });

      // Fallback formatting
      return '0:00';
    }
  }, []);

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const bufferPercentage = duration ? (buffered / duration) * 100 : 0;

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "relative bg-black rounded-lg overflow-hidden group",
          isFullscreen && "fixed inset-0 z-50",
          className
        )}
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => isPlaying && !isFullscreen && setShowControls(false)}
        onClick={togglePlay}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={isMuted}
          loop={loop}
          playsInline
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-semibold mb-2">Video Error</p>
              <p className="text-sm text-gray-300">{error}</p>
            </div>
          </div>
        )}

        {/* Title Overlay */}
        {showTitle && title && (
          <div className="absolute top-4 left-4 right-4">
            <h3 className="text-white text-lg font-semibold drop-shadow-lg">{title}</h3>
          </div>
        )}

        {/* Controls Overlay */}
        {controls && !error && (
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300",
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {isFullscreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Minimize className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-black/50 text-white border-none">
                  {currentQuality}
                </Badge>
              </div>
            </div>

            {/* Center Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white/50"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleProgressChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/80 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPlaying ? 'Pause' : 'Play'} (Space)</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Skip Back */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(-10);
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipBack className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Skip back 10s (←)</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Skip Forward */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(10);
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipForward className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Skip forward 10s (→)</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMute();
                          }}
                          className="text-white hover:bg-white/20"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mute (M)</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback Rate */}
                  <Select value={playbackRate.toString()} onValueChange={(value) => handlePlaybackRateChange(parseFloat(value))}>
                    <SelectTrigger className="w-16 h-8 bg-black/50 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Quality */}
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQualityMenu(!showQualityMenu);
                          }}
                          className="text-white hover:bg-white/20"
                        >
                          <Settings className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Quality Settings</p>
                      </TooltipContent>
                    </Tooltip>

                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-32">
                        {qualityOptions.map((quality) => (
                          <button
                            key={quality.value}
                            onClick={() => handleQualityChange(quality.value)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm rounded hover:bg-white/20 transition-colors",
                              currentQuality === quality.value ? "text-primary bg-white/20" : "text-white"
                            )}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture in Picture */}
                  {enablePictureInPicture && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePictureInPicture();
                          }}
                          className="text-white hover:bg-white/20"
                        >
                          <PictureInPicture className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Picture-in-picture (P)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Fullscreen */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Fullscreen (F)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Click to hide controls when playing */}
        {isPlaying && showControls && !isFullscreen && (
          <div
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowControls(false)}
              className="text-white hover:bg-white/20"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default VideoPlayer;
