"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/services/social-service';
import { Activity, SocialUser } from '@/lib/types/social';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Loader2,
  Users,
  UserPlus,
  Image as ImageIcon,
  Video,
  FileText
} from 'lucide-react';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface SocialFeedProps {
  feedType?: 'following' | 'friends' | 'global' | 'trending';
  className?: string;
}

interface FeedActivityProps {
  activity: Activity;
  user?: SocialUser;
}

function FeedActivity({ activity, user }: FeedActivityProps) {
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'post':
        return activity.contentType === 'image' ? ImageIcon :
               activity.contentType === 'video' ? Video : FileText;
      case 'like':
        return Heart;
      case 'comment':
        return MessageCircle;
      case 'follow':
        return UserPlus;
      case 'share':
        return Share;
      default:
        return FileText;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'post':
        return `posted a new ${activity.contentType}`;
      case 'like':
        return 'liked a post';
      case 'comment':
        return 'commented on a post';
      case 'follow':
        return 'started following someone';
      case 'share':
        return 'shared a post';
      default:
        return 'did something';
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'post':
        return 'text-blue-500';
      case 'like':
        return 'text-red-500';
      case 'comment':
        return 'text-green-500';
      case 'follow':
        return 'text-purple-500';
      case 'share':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const Icon = getActivityIcon();

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full bg-muted ${getActivityColor()}`}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <span className="font-medium text-sm">
                {user?.name || 'Unknown User'}
              </span>

              <span className="text-sm text-muted-foreground">
                {getActivityText()}
              </span>

              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>

            {activity.contentId && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Content preview would go here...
                </p>
              </div>
            )}

            {/* Activity actions */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                {likesCount}
              </Button>

              <Button variant="ghost" size="sm" className="h-auto p-1">
                <MessageCircle className="h-3 w-3 mr-1" />
                Reply
              </Button>

              <Button variant="ghost" size="sm" className="h-auto p-1">
                <Share className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="h-auto p-1">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialFeed({ feedType = 'following', className = '' }: SocialFeedProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<Map<string, SocialUser>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Component lifecycle logging
  useEffect(() => {
    logInfo('SocialFeed component mounted', {
      component: 'SocialFeed',
      metadata: {
        feedType,
        hasCurrentUser: !!currentUser,
        userId: currentUser?.uid
      }
    });

    return () => {
      logInfo('SocialFeed component unmounted', {
        component: 'SocialFeed',
        metadata: {
          finalActivitiesCount: activities.length,
          finalUsersCount: users.size,
          feedType,
          currentPage: page
        }
      });
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      logInfo('SocialFeed feed type or user changed', {
        component: 'SocialFeed',
        action: 'feedChange',
        metadata: {
          newFeedType: feedType,
          userId: currentUser.uid,
          previousActivitiesCount: activities.length
        }
      });

      loadFeed();
    }
  }, [currentUser, feedType]);

  const loadFeed = async (loadMore = false) => {
    if (!currentUser) return;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      logInfo('Loading social feed', {
        component: 'SocialFeed',
        action: 'loadFeed',
        metadata: {
          loadMore,
          currentPage: loadMore ? page + 1 : 1,
          feedType,
          userId: currentUser.uid,
          currentActivitiesCount: activities.length
        }
      });

      const response = await socialService.getActivityFeed(currentUser.uid, {
        page: loadMore ? page + 1 : 1,
        limit: 20,
      });

      if (response.success) {
        const newActivities = response.data;

        logInfo('Social feed loaded successfully', {
          component: 'SocialFeed',
          action: 'loadFeed',
          metadata: {
            result: 'success',
            activitiesCount: newActivities.length,
            loadMore,
            newTotalCount: loadMore ? activities.length + newActivities.length : newActivities.length,
            feedType,
            userId: currentUser.uid
          }
        });

        if (loadMore) {
          setActivities(prev => [...prev, ...newActivities]);
          setPage(prev => prev + 1);
        } else {
          setActivities(newActivities);
          setPage(1);
        }

        setHasMore(newActivities.length === 20);

        // Load user data for activities
        await loadUserData(newActivities);
      } else {
        logError(new Error('Failed to load feed - response not successful'), {
          category: ErrorCategory.EXTERNAL_API,
          severity: ErrorSeverity.HIGH,
          component: 'SocialFeed',
          action: 'loadFeed',
          metadata: {
            loadMore,
            feedType,
            userId: currentUser.uid,
            responseSuccess: response.success
          }
        });
      }
    } catch (error: any) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'SocialFeed',
        action: 'loadFeed',
        metadata: {
          loadMore,
          feedType,
          userId: currentUser.uid,
          currentActivitiesCount: activities.length
        }
      });

      toast({
        title: "Error loading feed",
        description: error.message || "Failed to load feed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadUserData = async (activities: Activity[]) => {
    const userIds = [...new Set(activities.map(a => a.userId))];

    try {
      logInfo('Loading user data for activities', {
        component: 'SocialFeed',
        action: 'loadUserData',
        metadata: {
          activitiesCount: activities.length,
          uniqueUserIdsCount: userIds.length,
          userIds: userIds.slice(0, 10) // Log first 10 for context
        }
      });

      const userPromises = userIds.map(async (userId) => {
        try {
          const response = await socialService.getUser(userId);
          return response.success ? response.data : null;
        } catch (error) {
          logError(error, {
            category: ErrorCategory.EXTERNAL_API,
            severity: ErrorSeverity.LOW,
            component: 'SocialFeed',
            action: 'loadUserData',
            metadata: {
              userId,
              activitiesCount: activities.length
            }
          });
          return null;
        }
      });

      const usersData = await Promise.all(userPromises);
      const usersMap = new Map<string, SocialUser>();

      usersData.forEach(user => {
        if (user) {
          usersMap.set(user.id, user);
        }
      });

      logInfo('User data loaded successfully', {
        component: 'SocialFeed',
        action: 'loadUserData',
        metadata: {
          result: 'success',
          loadedUsersCount: usersMap.size,
          totalUserIds: userIds.length,
          successRate: usersMap.size / userIds.length
        }
      });

      setUsers(usersMap);
    } catch (error) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.MEDIUM,
        component: 'SocialFeed',
        action: 'loadUserData',
        metadata: {
          activitiesCount: activities.length,
          userIdsCount: userIds.length
        }
      });
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      logInfo('User interaction - load more activities', {
        component: 'SocialFeed',
        action: 'handleLoadMore',
        metadata: {
          currentActivitiesCount: activities.length,
          currentPage: page,
          hasMore,
          isLoadingMore,
          feedType
        }
      });

      loadFeed(true);
    } else {
      logInfo('Load more blocked', {
        component: 'SocialFeed',
        action: 'handleLoadMore',
        metadata: {
          reason: !hasMore ? 'no_more_data' : 'already_loading',
          hasMore,
          isLoadingMore,
          currentActivitiesCount: activities.length
        }
      });
    }
  };

  if (!currentUser) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Sign in to see your feed</h3>
        <p className="text-muted-foreground">
          Follow users and friends to see their latest activities and posts.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Feed header */}
      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="capitalize">
          {feedType} Feed
        </Badge>
        <span className="text-sm text-muted-foreground">
          {activities.length} activities
        </span>
      </div>

      {/* Activities feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No activity yet</h3>
          <p className="text-muted-foreground">
            {feedType === 'following'
              ? 'Follow some users to see their activities in your feed.'
              : 'No activities to show at the moment.'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {activities.map((activity) => (
              <FeedActivity
                key={activity.id}
                activity={activity}
                user={users.get(activity.userId)}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}