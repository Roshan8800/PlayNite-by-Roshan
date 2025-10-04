"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { VideoPlayer } from '@/components/ui/video-player';
import { videoStreamingService } from '@/lib/services/video-streaming-service';
import { videoManagementService } from '@/lib/services/video-management-service';
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreVertical,
  Send,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Facebook,
  Twitter,
  Instagram,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

export interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    user: {
      id: string;
      name: string;
      avatar: string;
      verified: boolean;
    };
    stats: {
      likes: number;
      comments: number;
      shares: number;
      views: number;
      saved: boolean;
    };
    uploadDate: string;
    duration: string;
  } | null;
  relatedVideos?: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    duration: string;
    views: number;
  }>;
  autoPlay?: boolean;
  soundEnabled?: boolean;
  onVideoChange?: (videoId: string) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  video,
  relatedVideos = [],
  autoPlay = true,
  soundEnabled = false,
  onVideoChange
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([
    {
      id: '1',
      user: { name: 'John Doe', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
      content: 'Amazing video! Really enjoyed watching this.',
      timestamp: '2 hours ago',
      likes: 12
    },
    {
      id: '2',
      user: { name: 'Jane Smith', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face' },
      content: 'Great content! Keep it up 🔥',
      timestamp: '1 hour ago',
      likes: 8
    }
  ]);

  // Component lifecycle logging
  useEffect(() => {
    logInfo('VideoModal component mounted', {
      component: 'VideoModal',
      metadata: {
        hasVideo: !!video,
        videoId: video?.id,
        autoPlay,
        soundEnabled,
        relatedVideosCount: relatedVideos?.length || 0
      }
    });

    return () => {
      logInfo('VideoModal component unmounted', {
        component: 'VideoModal',
        metadata: {
          finalVideoId: video?.id,
          finalVideoIndex: currentVideoIndex,
          totalComments: comments.length,
          wasLiked: liked,
          wasSaved: saved
        }
      });
    };
  }, []);

  // Reset state when video changes
  useEffect(() => {
    if (video) {
      logInfo('VideoModal video changed', {
        component: 'VideoModal',
        action: 'videoChange',
        metadata: {
          newVideoId: video.id,
          newVideoTitle: video.title,
          previousVideoId: video.id // This would be the old video ID in a real scenario
        }
      });

      setLiked(false);
      setSaved(video.stats.saved);
      setCurrentVideoIndex(0);
      setShowComments(false);
      setComment('');
    }
  }, [video]);

  if (!video) return null;

  const handleLike = () => {
    try {
      const newLikedState = !liked;

      logInfo('User interaction - like video', {
        component: 'VideoModal',
        action: 'handleLike',
        metadata: {
          videoId: video.id,
          videoTitle: video.title,
          previousState: liked,
          newState: newLikedState,
          currentLikes: video.stats.likes
        }
      });

      setLiked(newLikedState);
      videoManagementService.updateVideoAnalytics(video.id, 'like');

      logInfo('Video like completed', {
        component: 'VideoModal',
        action: 'handleLike',
        metadata: {
          result: 'success',
          finalState: newLikedState,
          videoId: video.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoModal',
        action: 'handleLike',
        metadata: {
          videoId: video.id,
          currentState: liked
        }
      });
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    videoManagementService.updateVideoAnalytics(video.id, 'save');
  };

  const handleShare = async (platform?: string) => {
    const url = window.location.href;
    const text = `Check out this video: ${video.title}`;

    try {
      logInfo('User interaction - share video', {
        component: 'VideoModal',
        action: 'handleShare',
        metadata: {
          videoId: video.id,
          videoTitle: video.title,
          platform: platform || 'native',
          url: url.substring(0, 50) + '...',
          hasNavigatorShare: !!navigator.share
        }
      });

      switch (platform) {
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
          break;
        case 'copy':
          navigator.clipboard.writeText(url);
          break;
        default:
          if (navigator.share) {
            await navigator.share({ title: video.title, text, url });
          }
      }

      setShowShareMenu(false);
      videoManagementService.updateVideoAnalytics(video.id, 'share');

      logInfo('Video share completed', {
        component: 'VideoModal',
        action: 'handleShare',
        metadata: {
          result: 'success',
          platform: platform || 'native',
          videoId: video.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoModal',
        action: 'handleShare',
        metadata: {
          videoId: video.id,
          platform: platform || 'native',
          hasNavigatorShare: !!navigator.share
        }
      });
    }
  };

  const handleComment = () => {
    if (!comment.trim()) return;

    try {
      logInfo('User interaction - add comment', {
        component: 'VideoModal',
        action: 'handleComment',
        metadata: {
          videoId: video.id,
          commentLength: comment.length,
          currentCommentsCount: comments.length,
          hasContent: !!comment.trim()
        }
      });

      const newComment = {
        id: Date.now().toString(),
        user: { name: 'You', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&crop=face' },
        content: comment,
        timestamp: 'now',
        likes: 0
      };

      setComments(prev => [newComment, ...prev]);
      setComment('');
      videoManagementService.updateVideoAnalytics(video.id, 'comment');

      logInfo('Comment added successfully', {
        component: 'VideoModal',
        action: 'handleComment',
        metadata: {
          result: 'success',
          newCommentId: newComment.id,
          newCommentsCount: comments.length + 1,
          videoId: video.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'VideoModal',
        action: 'handleComment',
        metadata: {
          videoId: video.id,
          commentLength: comment.length,
          currentCommentsCount: comments.length
        }
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const currentVideo = relatedVideos[currentVideoIndex] || video;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black overflow-hidden">
        <div className="flex h-full">
          {/* Video Player Section */}
          <div className="flex-1 relative bg-black">
            <VideoPlayer
              src={currentVideo.id === video.id ? video.videoUrl : video.videoUrl}
              poster={currentVideo.thumbnailUrl}
              title={currentVideo.title}
              autoPlay={autoPlay}
              muted={!soundEnabled}
              controls={true}
              showTitle={false}
              enableKeyboardShortcuts={true}
              enablePictureInPicture={true}
              className="w-full h-full"
              onPlay={() => {
                videoManagementService.updateVideoAnalytics(currentVideo.id, 'view', {
                  watchTime: 0,
                  duration: currentVideo.duration
                });
              }}
              onTimeUpdate={(currentTime, duration) => {
                if (currentTime > 0) {
                  videoManagementService.updateVideoAnalytics(currentVideo.id, 'view', {
                    watchTime: currentTime,
                    duration: duration
                  });
                }
              }}
              onEnded={() => {
                videoManagementService.updateVideoAnalytics(currentVideo.id, 'view', {
                  watchTime: parseFloat(currentVideo.duration),
                  duration: parseFloat(currentVideo.duration)
                });

                // Auto-play next video if available
                if (currentVideoIndex < relatedVideos.length - 1) {
                  setCurrentVideoIndex(prev => prev + 1);
                  onVideoChange?.(relatedVideos[currentVideoIndex + 1].id);
                }
              }}
            />

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-2">{currentVideo.title}</h2>
                <p className="text-gray-300 mb-4 line-clamp-2">
                  {currentVideo.id === video.id ? video.description : 'Related video content'}
                </p>

                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={video.user.avatar} alt={video.user.name} />
                    <AvatarFallback>{video.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{video.user.name}</span>
                      {video.user.verified && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {formatNumber(video.stats.views)} views • {new Date(video.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={`text-white hover:bg-white/20 ${liked ? 'text-red-500' : ''}`}
                    >
                      <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                      <span className="ml-2">{formatNumber((video.stats.likes + (liked ? 1 : 0)))}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                      className="text-white hover:bg-white/20"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="ml-2">{formatNumber(video.stats.comments + comments.length)}</span>
                    </Button>

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="text-white hover:bg-white/20"
                      >
                        <Share className="w-5 h-5" />
                        <span className="ml-2">{formatNumber(video.stats.shares)}</span>
                      </Button>

                      {showShareMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-black/90 rounded-lg p-2 min-w-48">
                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/20 rounded transition-colors"
                          >
                            <Twitter className="w-4 h-4" />
                            Share on Twitter
                          </button>
                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/20 rounded transition-colors"
                          >
                            <Facebook className="w-4 h-4" />
                            Share on Facebook
                          </button>
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/20 rounded transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      className={`text-white hover:bg-white/20 ${saved ? 'text-primary' : ''}`}
                    >
                      <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-background border-l flex flex-col">
            {/* Comments Section */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Comments</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Comment Input */}
                <div className="flex gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&crop=face" />
                    <AvatarFallback>Y</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleComment}
                        disabled={!comment.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                        <AvatarFallback>{comment.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm mb-2">{comment.content}</p>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Heart className="w-3 h-3 mr-1" />
                            {comment.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Related Videos */}
            {relatedVideos.length > 0 && (
              <>
                <Separator />
                <div className="p-4">
                  <h3 className="font-semibold mb-4">Related Videos</h3>
                  <div className="space-y-3">
                    {relatedVideos.slice(0, 5).map((relatedVideo, index) => (
                      <div
                        key={relatedVideo.id}
                        className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
                        onClick={() => {
                          setCurrentVideoIndex(index);
                          onVideoChange?.(relatedVideo.id);
                        }}
                      >
                        <div className="relative w-24 aspect-video rounded overflow-hidden">
                          <img
                            src={relatedVideo.thumbnailUrl}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                            {relatedVideo.duration}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">{relatedVideo.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(relatedVideo.views)} views
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;