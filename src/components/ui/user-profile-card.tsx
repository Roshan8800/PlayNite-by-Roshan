
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/services/social-service';
import { SocialUser } from '@/lib/types/social';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Users,
  UserPlus,
  UserCheck,
  MessageCircle,
  Settings,
  Loader2,
  Verified
} from 'lucide-react';
import { FollowButton } from './follow-button';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface UserProfileCardProps {
  userId: string;
  showActions?: boolean;
  className?: string;
}

export function UserProfileCard({ userId, showActions = true, className = '' }: UserProfileCardProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState<SocialUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mutualFriends, setMutualFriends] = useState<SocialUser[]>([]);
  const [isLoadingMutual, setIsLoadingMutual] = useState(false);

  // Component lifecycle logging
  useEffect(() => {
    logInfo('UserProfileCard component mounted', {
      component: 'UserProfileCard',
      metadata: {
        userId,
        showActions,
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.uid
      }
    });

    return () => {
      logInfo('UserProfileCard component unmounted', {
        component: 'UserProfileCard',
        metadata: {
          finalUserId: userId,
          finalUser: user ? { id: user.id, name: user.name } : null,
          hadMutualFriends: mutualFriends.length > 0
        }
      });
    };
  }, []);

  useEffect(() => {
    logInfo('UserProfileCard userId changed', {
      component: 'UserProfileCard',
      action: 'userIdChange',
      metadata: {
        newUserId: userId,
        previousUser: user ? { id: user.id, name: user.name } : null
      }
    });

    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);

      logInfo('Loading user profile', {
        component: 'UserProfileCard',
        action: 'loadUserProfile',
        metadata: {
          userId,
          currentUserId: currentUser?.uid,
          isOwnProfile: currentUser?.uid === userId
        }
      });

      const response = await socialService.getUser(userId);

      if (response.success) {
        setUser(response.data);

        logInfo('User profile loaded successfully', {
          component: 'UserProfileCard',
          action: 'loadUserProfile',
          metadata: {
            result: 'success',
            userId,
            userName: response.data.name,
            userVerified: response.data.verified,
            willLoadMutualFriends: currentUser && currentUser.uid !== userId
          }
        });

        // Load mutual friends if viewing someone else's profile
        if (currentUser && currentUser.uid !== userId) {
          loadMutualFriends();
        }
      } else {
        logError(new Error('Failed to load user profile - response not successful'), {
          category: ErrorCategory.EXTERNAL_API,
          severity: ErrorSeverity.HIGH,
          component: 'UserProfileCard',
          action: 'loadUserProfile',
          metadata: {
            userId,
            responseSuccess: response.success
          }
        });
      }
    } catch (error: any) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'UserProfileCard',
        action: 'loadUserProfile',
        metadata: {
          userId,
          currentUserId: currentUser?.uid
        }
      });

      toast({
        title: "Error loading profile",
        description: error.message || "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMutualFriends = async () => {
    if (!currentUser) return;

    try {
      setIsLoadingMutual(true);
      // This would require a more complex query to find mutual friends
      // For now, we'll just show a placeholder
      setMutualFriends([]);
    } catch (error) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.LOW,
        component: 'UserProfileCard',
        action: 'loadMutualFriends',
        metadata: {
          userId,
          currentUserId: currentUser?.uid,
          isOwnProfile: currentUser?.uid === userId
        }
      });
    } finally {
      setIsLoadingMutual(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            User not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOwnProfile = currentUser?.uid === user.id;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-2xl">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {/* Name and verification */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              {user.verified && (
                <Verified className="h-5 w-5 text-blue-500" />
              )}
            </div>

            {/* Username */}
            <p className="text-muted-foreground mb-2">@{user.username}</p>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm mb-3">{user.bio}</p>
            )}

            {/* Location and website */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Website
                  </a>
                </div>
              )}
            </div>

            {/* Join date */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              Joined {formatDistanceToNow(new Date(user.joinedDate), { addSuffix: true })}
            </div>

            {/* Social stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-medium">{user.followingCount.toLocaleString()}</span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-medium">{user.followersCount.toLocaleString()}</span>
                <span className="text-muted-foreground">Followers</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">{user.postsCount.toLocaleString()}</span>
                <span className="text-muted-foreground">Posts</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex flex-col gap-2">
              {isOwnProfile ? (
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <FollowButton user={user} />
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Mutual friends section */}
      {!isOwnProfile && mutualFriends.length > 0 && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Mutual Friends</h3>
            {isLoadingMutual ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading mutual friends...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {mutualFriends.slice(0, 3).map((friend) => (
                  <Avatar key={friend.id} className="h-8 w-8">
                    <AvatarImage src={friend.avatar} />
                    <AvatarFallback className="text-xs">
                      {friend.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {mutualFriends.length > 3 && (
                  <span className="text-sm text-muted-foreground">
                    +{mutualFriends.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Social activity indicators */}
      <CardContent className="pt-0">
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last active</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}