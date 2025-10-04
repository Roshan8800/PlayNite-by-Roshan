"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/services/social-service';
import { SocialUser } from '@/lib/types/social';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, UserCheck, UserX } from 'lucide-react';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface FollowButtonProps {
  user: SocialUser;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function FollowButton({
  user,
  variant = 'default',
  size = 'default',
  showText = true,
  className = ''
}: FollowButtonProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [followersCount, setFollowersCount] = useState(user.followersCount);

  const handleFollow = async () => {
    if (!currentUser) {
      logInfo('Follow action blocked - not authenticated', {
        component: 'FollowButton',
        action: 'handleFollow',
        metadata: {
          targetUserId: user.id,
          targetUserName: user.name,
          hasCurrentUser: !!currentUser
        }
      });

      toast({
        title: "Authentication required",
        description: "Please sign in to follow users.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';

      logInfo('User interaction - follow/unfollow user', {
        component: 'FollowButton',
        action: 'handleFollow',
        metadata: {
          action,
          targetUserId: user.id,
          targetUserName: user.name,
          currentUserId: currentUser.uid,
          currentState: isFollowing,
          currentFollowersCount: followersCount
        }
      });

      if (isFollowing) {
        await socialService.unfollowUser(currentUser.uid, user.id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));

        logInfo('User unfollowed successfully', {
          component: 'FollowButton',
          action: 'handleFollow',
          metadata: {
            result: 'success',
            action: 'unfollow',
            targetUserId: user.id,
            newFollowersCount: followersCount - 1
          }
        });

        toast({
          title: "Unfollowed",
          description: `You are no longer following ${user.name}`,
        });
      } else {
        await socialService.followUser(currentUser.uid, user.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        logInfo('User followed successfully', {
          component: 'FollowButton',
          action: 'handleFollow',
          metadata: {
            result: 'success',
            action: 'follow',
            targetUserId: user.id,
            newFollowersCount: followersCount + 1
          }
        });

        toast({
          title: "Following",
          description: `You are now following ${user.name}`,
        });
      }
    } catch (error: any) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'FollowButton',
        action: 'handleFollow',
        metadata: {
          action: isFollowing ? 'unfollow' : 'follow',
          targetUserId: user.id,
          currentUserId: currentUser.uid,
          currentState: isFollowing,
          currentFollowersCount: followersCount
        }
      });

      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser || currentUser.uid === user.id) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={isFollowing ? 'outline' : variant}
        size={size}
        onClick={handleFollow}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="h-4 w-4" />
            {showText && 'Following'}
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            {showText && 'Follow'}
          </>
        )}
      </Button>

      {showText && (
        <span className="text-sm text-muted-foreground">
          {followersCount.toLocaleString()} followers
        </span>
      )}
    </div>
  );
}