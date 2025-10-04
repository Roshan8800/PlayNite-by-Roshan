// Social Integration Service - Connect notifications with social features
import { socialService } from './social-service';
import { notificationService } from './notification-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  SocialUser,
  Like,
  Comment,
  Follow,
  FriendRequest,
  Notification as NotificationType,
} from '../types/social';

export class SocialIntegrationService {
  private static instance: SocialIntegrationService;

  private constructor() {}

  public static getInstance(): SocialIntegrationService {
    if (!SocialIntegrationService.instance) {
      SocialIntegrationService.instance = new SocialIntegrationService();
    }
    return SocialIntegrationService.instance;
  }

  // ==================== LIKE INTEGRATION ====================

  async handleLikeNotification(
    contentId: string,
    contentType: 'image' | 'video' | 'post' | 'comment',
    userId: string,
    contentOwnerId: string
  ): Promise<void> {
    try {
      // Get content owner info
      const ownerResult = await socialService.getUser(contentOwnerId);
      if (!ownerResult.success) return;

      const owner = ownerResult.data;

      // Get liker info
      const likerResult = await socialService.getUser(userId);
      if (!likerResult.success) return;

      const liker = likerResult.data;

      // Create notification
      await notificationService.createNotification(
        contentOwnerId,
        'like',
        `${liker.name} liked your ${contentType}`,
        `${liker.name} liked your ${contentType}. ${this.getContentPreview(contentId, contentType)}`,
        {
          contentId,
          contentType,
          likerId: userId,
          likerName: liker.name,
          likerAvatar: liker.avatar,
        },
        {
          priority: 'normal',
          actionUrl: this.getContentUrl(contentId, contentType),
          imageUrl: this.getContentImage(contentId, contentType),
        }
      );

      // Check for achievement/milestone
      await this.checkLikeMilestone(contentOwnerId, contentId, contentType);
    } catch (error) {
      console.error('Failed to handle like notification:', error);
    }
  }

  // ==================== COMMENT INTEGRATION ====================

  async handleCommentNotification(
    contentId: string,
    contentType: 'image' | 'video' | 'post',
    authorId: string,
    contentOwnerId: string,
    commentText: string,
    mentions: string[] = []
  ): Promise<void> {
    try {
      // Get content owner info
      const ownerResult = await socialService.getUser(contentOwnerId);
      if (!ownerResult.success) return;

      const owner = ownerResult.data;

      // Get commenter info
      const commenterResult = await socialService.getUser(authorId);
      if (!commenterResult.success) return;

      const commenter = commenterResult.data;

      // Create notification for content owner
      await notificationService.createNotification(
        contentOwnerId,
        'comment',
        `${commenter.name} commented on your ${contentType}`,
        `${commenter.name}: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
        {
          contentId,
          contentType,
          commentAuthorId: authorId,
          commentAuthorName: commenter.name,
          commentAuthorAvatar: commenter.avatar,
          commentText,
        },
        {
          priority: 'normal',
          actionUrl: this.getContentUrl(contentId, contentType),
          imageUrl: this.getContentImage(contentId, contentType),
        }
      );

      // Create notifications for mentions
      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== contentOwnerId && mentionedUserId !== authorId) {
          await notificationService.createNotification(
            mentionedUserId,
            'mention',
            `${commenter.name} mentioned you`,
            `${commenter.name} mentioned you in a comment: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
            {
              contentId,
              contentType,
              mentionerId: authorId,
              mentionerName: commenter.name,
              commentText,
            },
            {
              priority: 'high',
              actionUrl: this.getContentUrl(contentId, contentType),
            }
          );
        }
      }

      // Check for comment milestone
      await this.checkCommentMilestone(contentOwnerId, contentId, contentType);
    } catch (error) {
      console.error('Failed to handle comment notification:', error);
    }
  }

  // ==================== FOLLOW INTEGRATION ====================

  async handleFollowNotification(
    followerId: string,
    followingId: string
  ): Promise<void> {
    try {
      // Get follower info
      const followerResult = await socialService.getUser(followerId);
      if (!followerResult.success) return;

      const follower = followerResult.data;

      // Get following user info
      const followingResult = await socialService.getUser(followingId);
      if (!followingResult.success) return;

      const following = followingResult.data;

      // Create notification
      await notificationService.createNotification(
        followingId,
        'follow',
        `${follower.name} started following you`,
        `${follower.name} (@${follower.username}) is now following you.`,
        {
          followerId,
          followerName: follower.name,
          followerUsername: follower.username,
          followerAvatar: follower.avatar,
        },
        {
          priority: 'normal',
          actionUrl: `/profile/${follower.username}`,
          imageUrl: follower.avatar,
        }
      );

      // Check for follower milestone
      await this.checkFollowerMilestone(followingId);
    } catch (error) {
      console.error('Failed to handle follow notification:', error);
    }
  }

  // ==================== FRIEND REQUEST INTEGRATION ====================

  async handleFriendRequestNotification(
    senderId: string,
    receiverId: string,
    message?: string
  ): Promise<void> {
    try {
      // Get sender info
      const senderResult = await socialService.getUser(senderId);
      if (!senderResult.success) return;

      const sender = senderResult.data;

      // Create notification
      await notificationService.createNotification(
        receiverId,
        'friend_request',
        `${sender.name} sent you a friend request`,
        message || `${sender.name} wants to be your friend.`,
        {
          senderId,
          senderName: sender.name,
          senderUsername: sender.username,
          senderAvatar: sender.avatar,
          requestMessage: message,
        },
        {
          priority: 'high',
          actionUrl: `/profile/${sender.username}`,
          imageUrl: sender.avatar,
        }
      );
    } catch (error) {
      console.error('Failed to handle friend request notification:', error);
    }
  }

  // ==================== TAG INTEGRATION ====================

  async handleTagNotification(
    contentId: string,
    contentType: 'image' | 'video' | 'post',
    taggerId: string,
    taggedUserId: string,
    position?: { x: number; y: number }
  ): Promise<void> {
    try {
      // Get tagger info
      const taggerResult = await socialService.getUser(taggerId);
      if (!taggerResult.success) return;

      const tagger = taggerResult.data;

      // Create notification
      await notificationService.createNotification(
        taggedUserId,
        'tag',
        `${tagger.name} tagged you in a ${contentType}`,
        `${tagger.name} tagged you in their ${contentType}.`,
        {
          contentId,
          contentType,
          taggerId,
          taggerName: tagger.name,
          taggerAvatar: tagger.avatar,
          position,
        },
        {
          priority: 'high',
          actionUrl: this.getContentUrl(contentId, contentType),
          imageUrl: this.getContentImage(contentId, contentType),
        }
      );
    } catch (error) {
      console.error('Failed to handle tag notification:', error);
    }
  }

  // ==================== SHARE INTEGRATION ====================

  async handleShareNotification(
    contentId: string,
    contentType: 'image' | 'video' | 'post',
    sharerId: string,
    contentOwnerId: string
  ): Promise<void> {
    try {
      // Get sharer info
      const sharerResult = await socialService.getUser(sharerId);
      if (!sharerResult.success) return;

      const sharer = sharerResult.data;

      // Create notification
      await notificationService.createNotification(
        contentOwnerId,
        'share',
        `${sharer.name} shared your ${contentType}`,
        `${sharer.name} shared your ${contentType} with others.`,
        {
          contentId,
          contentType,
          sharerId,
          sharerName: sharer.name,
          sharerAvatar: sharer.avatar,
        },
        {
          priority: 'normal',
          actionUrl: this.getContentUrl(contentId, contentType),
          imageUrl: this.getContentImage(contentId, contentType),
        }
      );
    } catch (error) {
      console.error('Failed to handle share notification:', error);
    }
  }

  // ==================== MILESTONE INTEGRATION ====================

  private async checkLikeMilestone(
    userId: string,
    contentId: string,
    contentType: string
  ): Promise<void> {
    try {
      // Get current like count for content
      const contentRef = doc(db, `${contentType}s`, contentId);
      const contentDoc = await getDoc(contentRef);

      if (contentDoc.exists()) {
        const contentData = contentDoc.data();
        const likesCount = contentData.likesCount || 0;

        // Check for milestones (10, 50, 100, 500, 1000 likes)
        const milestones = [10, 50, 100, 500, 1000];
        const achievedMilestone = milestones.find(m => likesCount === m);

        if (achievedMilestone) {
          await notificationService.createNotification(
            userId,
            'milestone',
            `🎉 ${achievedMilestone} likes milestone!`,
            `Your ${contentType} reached ${achievedMilestone} likes! Amazing engagement!`,
            {
              contentId,
              contentType,
              likesCount: achievedMilestone,
              milestoneType: 'likes',
            },
            {
              priority: 'high',
              category: 'achievement',
              actionUrl: this.getContentUrl(contentId, contentType),
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to check like milestone:', error);
    }
  }

  private async checkCommentMilestone(
    userId: string,
    contentId: string,
    contentType: string
  ): Promise<void> {
    try {
      // Get current comment count for content
      const contentRef = doc(db, `${contentType}s`, contentId);
      const contentDoc = await getDoc(contentRef);

      if (contentDoc.exists()) {
        const contentData = contentDoc.data();
        const commentsCount = contentData.commentsCount || 0;

        // Check for milestones (5, 25, 50, 100 comments)
        const milestones = [5, 25, 50, 100];
        const achievedMilestone = milestones.find(m => commentsCount === m);

        if (achievedMilestone) {
          await notificationService.createNotification(
            userId,
            'milestone',
            `💬 ${achievedMilestone} comments milestone!`,
            `Your ${contentType} sparked ${achievedMilestone} comments! Great conversation!`,
            {
              contentId,
              contentType,
              commentsCount: achievedMilestone,
              milestoneType: 'comments',
            },
            {
              priority: 'high',
              category: 'achievement',
              actionUrl: this.getContentUrl(contentId, contentType),
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to check comment milestone:', error);
    }
  }

  private async checkFollowerMilestone(userId: string): Promise<void> {
    try {
      // Get current follower count
      const userResult = await socialService.getUser(userId);
      if (!userResult.success) return;

      const user = userResult.data;
      const followersCount = user.followersCount;

      // Check for milestones (10, 50, 100, 500, 1000, 5000 followers)
      const milestones = [10, 50, 100, 500, 1000, 5000];
      const achievedMilestone = milestones.find(m => followersCount === m);

      if (achievedMilestone) {
        await notificationService.createNotification(
          userId,
          'milestone',
          `🎉 ${achievedMilestone} followers milestone!`,
          `Congratulations! You now have ${achievedMilestone} followers!`,
          {
            followersCount: achievedMilestone,
            milestoneType: 'followers',
          },
          {
            priority: 'high',
            category: 'achievement',
            actionUrl: `/profile/${user.username}`,
          }
        );
      }
    } catch (error) {
      console.error('Failed to check follower milestone:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  private getContentPreview(contentId: string, contentType: string): string {
    // Return a preview of the content (first few words)
    switch (contentType) {
      case 'post':
        return "Check out what they posted!";
      case 'image':
        return "They liked your photo!";
      case 'video':
        return "They liked your video!";
      case 'comment':
        return "They liked your comment!";
      default:
        return "They liked your content!";
    }
  }

  private getContentUrl(contentId: string, contentType: string): string {
    switch (contentType) {
      case 'post':
        return `/posts/${contentId}`;
      case 'image':
        return `/images/${contentId}`;
      case 'video':
        return `/videos/${contentId}`;
      case 'comment':
        return `/comments/${contentId}`;
      default:
        return `/content/${contentId}`;
    }
  }

  private getContentImage(contentId: string, contentType: string): string | undefined {
    // Return thumbnail or preview image URL for the content
    // This would typically fetch from your content service
    return undefined;
  }

  // ==================== BATCH OPERATIONS ====================

  async handleMultipleLikes(
    likes: Array<{
      contentId: string;
      contentType: 'image' | 'video' | 'post' | 'comment';
      userId: string;
      contentOwnerId: string;
    }>
  ): Promise<void> {
    // Group likes by content owner to avoid spam
    const likesByOwner = likes.reduce((acc, like) => {
      if (!acc[like.contentOwnerId]) {
        acc[like.contentOwnerId] = [];
      }
      acc[like.contentOwnerId].push(like);
      return acc;
    }, {} as Record<string, typeof likes>);

    for (const [ownerId, ownerLikes] of Object.entries(likesByOwner)) {
      if (ownerLikes.length === 1) {
        // Single like - create individual notification
        await this.handleLikeNotification(
          ownerLikes[0].contentId,
          ownerLikes[0].contentType,
          ownerLikes[0].userId,
          ownerId
        );
      } else {
        // Multiple likes - create grouped notification
        const likers = await Promise.all(
          ownerLikes.map(async (like) => {
            const userResult = await socialService.getUser(like.userId);
            return userResult.success ? userResult.data : null;
          })
        );

        const validLikers = likers.filter(Boolean) as SocialUser[];
        const firstLiker = validLikers[0];
        const otherCount = validLikers.length - 1;

        await notificationService.createNotification(
          ownerId,
          'like',
          `${firstLiker.name} and ${otherCount} others liked your content`,
          `${firstLiker.name} and ${otherCount} others liked your ${ownerLikes[0].contentType}.`,
          {
            contentIds: ownerLikes.map(l => l.contentId),
            contentType: ownerLikes[0].contentType,
            likers: validLikers.map(l => ({ id: l.id, name: l.name, avatar: l.avatar })),
            likesCount: ownerLikes.length,
          },
          {
            priority: 'normal',
            isGrouped: true,
            groupCount: ownerLikes.length,
            actionUrl: this.getContentUrl(ownerLikes[0].contentId, ownerLikes[0].contentType),
          }
        );
      }
    }
  }

  // ==================== REAL-TIME INTEGRATION ====================

  async setupSocialRealtimeIntegration(userId: string): Promise<void> {
    try {
      // Subscribe to social activities that should trigger notifications
      socialService.subscribeToNotifications(userId, async (update) => {
        const notification = update.data;

        // Handle different notification types
        switch (notification.type) {
          case 'like':
            await this.handleLikeNotification(
              notification.data.contentId,
              notification.data.contentType,
              notification.data.likerId,
              notification.userId
            );
            break;

          case 'comment':
            await this.handleCommentNotification(
              notification.data.contentId,
              notification.data.contentType,
              notification.data.commentAuthorId,
              notification.userId,
              notification.data.commentText,
              notification.data.mentions
            );
            break;

          case 'follow':
            await this.handleFollowNotification(
              notification.data.followerId,
              notification.userId
            );
            break;

          case 'friend_request':
            await this.handleFriendRequestNotification(
              notification.data.senderId,
              notification.userId,
              notification.data.requestMessage
            );
            break;

          case 'mention':
            await notificationService.createNotification(
              notification.userId,
              'mention',
              'You were mentioned',
              notification.message,
              notification.data,
              { priority: 'high' }
            );
            break;

          case 'tag':
            await this.handleTagNotification(
              notification.data.contentId,
              notification.data.contentType,
              notification.data.taggerId,
              notification.userId,
              notification.data.position
            );
            break;
        }
      });
    } catch (error) {
      console.error('Failed to setup social realtime integration:', error);
    }
  }

  // ==================== ANALYTICS INTEGRATION ====================

  async trackNotificationEngagement(
    notificationId: string,
    action: 'viewed' | 'clicked' | 'dismissed' | 'shared',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Track engagement for analytics
      const engagementData = {
        notificationId,
        action,
        timestamp: new Date().toISOString(),
        metadata,
      };

      // Send to analytics service (implement based on your analytics setup)
      console.log('Notification engagement tracked:', engagementData);
    } catch (error) {
      console.error('Failed to track notification engagement:', error);
    }
  }
}

// Export singleton instance
export const socialIntegrationService = SocialIntegrationService.getInstance();