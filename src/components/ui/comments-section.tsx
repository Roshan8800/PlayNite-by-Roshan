"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/services/social-service';
import { Comment, SocialUser, CreateCommentData } from '@/lib/types/social';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Heart,
  MoreHorizontal,
  Reply,
  Flag,
  Loader2
} from 'lucide-react';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface CommentsSectionProps {
  contentId: string;
  contentType: 'image' | 'video' | 'post';
  className?: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onLike: (commentId: string) => void;
  depth?: number;
  contentId: string;
  contentType: string;
}

function CommentItem({ comment, onReply, onLike, depth = 0, contentId, contentType }: CommentItemProps) {
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [showReplies, setShowReplies] = useState(depth === 0);

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      await onLike(comment.id);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'CommentsSection',
        action: 'handleLikeComment',
        metadata: {
          commentId: comment.id,
          contentId,
          contentType,
          currentLikesCount: likesCount,
          isLiked
        }
      });
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-12 mt-3' : 'mb-4'}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author?.avatar} />
          <AvatarFallback>
            {comment.author?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {comment.author?.name || 'Unknown User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            <p className="text-sm mb-2">{comment.text}</p>

            {/* Comment actions */}
            <div className="flex items-center gap-4 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`h-auto p-1 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {likesCount}
              </Button>

              {depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id)}
                  className="h-auto p-1 text-muted-foreground"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-muted-foreground"
              >
                <Flag className="h-3 w-3 mr-1" />
                Report
              </Button>
            </div>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="h-auto p-1 text-xs text-muted-foreground mb-2"
              >
                {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Button>

              {showReplies && (
                <div className="space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      onReply={onReply}
                      onLike={onLike}
                      depth={depth + 1}
                      contentId={contentId}
                      contentType={contentType}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentsSection({ contentId, contentType, className = '' }: CommentsSectionProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Component lifecycle logging
  useEffect(() => {
    logInfo('CommentsSection component mounted', {
      component: 'CommentsSection',
      metadata: {
        contentId,
        contentType,
        hasCurrentUser: !!currentUser,
        userId: currentUser?.uid
      }
    });

    return () => {
      logInfo('CommentsSection component unmounted', {
        component: 'CommentsSection',
        metadata: {
          finalCommentsCount: comments.length,
          contentId,
          contentType,
          hadNewComment: newComment.length > 0,
          hadReply: !!replyingTo
        }
      });
    };
  }, []);

  useEffect(() => {
    logInfo('CommentsSection content changed', {
      component: 'CommentsSection',
      action: 'contentChange',
      metadata: {
        newContentId: contentId,
        newContentType: contentType,
        previousCommentsCount: comments.length
      }
    });

    loadComments();
  }, [contentId, contentType]);

  const loadComments = async () => {
    try {
      setIsLoading(true);

      logInfo('Loading comments', {
        component: 'CommentsSection',
        action: 'loadComments',
        metadata: {
          contentId,
          contentType,
          currentCommentsCount: comments.length
        }
      });

      const response = await socialService.getComments(contentId, contentType);
      if (response.success) {
        setComments(response.data);

        logInfo('Comments loaded successfully', {
          component: 'CommentsSection',
          action: 'loadComments',
          metadata: {
            result: 'success',
            commentsCount: response.data.length,
            contentId,
            contentType
          }
        });
      } else {
        logError(new Error('Failed to load comments - response not successful'), {
          category: ErrorCategory.EXTERNAL_API,
          severity: ErrorSeverity.HIGH,
          component: 'CommentsSection',
          action: 'loadComments',
          metadata: {
            contentId,
            contentType,
            responseSuccess: response.success
          }
        });
      }
    } catch (error: any) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'CommentsSection',
        action: 'loadComments',
        metadata: {
          contentId,
          contentType,
          currentCommentsCount: comments.length
        }
      });

      toast({
        title: "Error loading comments",
        description: error.message || "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUser) {
      logInfo('Comment submission blocked - not authenticated', {
        component: 'CommentsSection',
        action: 'handleSubmitComment',
        metadata: {
          contentId,
          contentType,
          hasCurrentUser: !!currentUser
        }
      });

      toast({
        title: "Authentication required",
        description: "Please sign in to comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      logInfo('Comment submission blocked - empty content', {
        component: 'CommentsSection',
        action: 'handleSubmitComment',
        metadata: {
          contentId,
          contentType,
          commentLength: newComment.length,
          isReplying: !!replyingTo
        }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData: CreateCommentData = {
        text: newComment.trim(),
        parentId: replyingTo || undefined,
      };

      logInfo('Submitting comment', {
        component: 'CommentsSection',
        action: 'handleSubmitComment',
        metadata: {
          contentId,
          contentType,
          commentLength: newComment.length,
          isReplying: !!replyingTo,
          parentId: replyingTo,
          userId: currentUser.uid
        }
      });

      const response = await socialService.createComment(
        contentId,
        contentType,
        currentUser.uid,
        commentData
      );

      if (response.success) {
        setNewComment('');
        setReplyingTo(null);
        setReplyText('');
        await loadComments(); // Reload comments

        logInfo('Comment submitted successfully', {
          component: 'CommentsSection',
          action: 'handleSubmitComment',
          metadata: {
            result: 'success',
            contentId,
            contentType,
            isReplying: !!replyingTo,
            userId: currentUser.uid
          }
        });

        toast({
          title: "Comment posted",
          description: "Your comment has been posted successfully.",
        });
      } else {
        logError(new Error('Failed to submit comment - response not successful'), {
          category: ErrorCategory.EXTERNAL_API,
          severity: ErrorSeverity.HIGH,
          component: 'CommentsSection',
          action: 'handleSubmitComment',
          metadata: {
            contentId,
            contentType,
            commentLength: newComment.length,
            isReplying: !!replyingTo,
            responseSuccess: response.success
          }
        });
      }
    } catch (error: any) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'CommentsSection',
        action: 'handleSubmitComment',
        metadata: {
          contentId,
          contentType,
          commentLength: newComment.length,
          isReplying: !!replyingTo,
          userId: currentUser.uid
        }
      });

      toast({
        title: "Error posting comment",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (parentId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reply.",
        variant: "destructive",
      });
      return;
    }
    setReplyingTo(parentId);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;
    await socialService.likeComment(commentId, currentUser.uid);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comment input */}
      {currentUser && (
        <div className="space-y-3">
          {replyingTo && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Replying to comment</span>
                <Button variant="ghost" size="sm" onClick={cancelReply}>
                  Cancel
                </Button>
              </div>
              <Textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!replyText.trim() || isSubmitting}
                className="mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Reply'
                )}
              </Button>
            </div>
          )}

          {!replyingTo && (
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/1000 characters
                </span>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onLike={handleLikeComment}
              contentId={contentId}
              contentType={contentType}
            />
          ))
        )}
      </div>
    </div>
  );
}