// Social Service - Comprehensive social media functionality
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  SocialUser,
  Follow,
  FriendRequest,
  Friendship,
  Comment,
  Like,
  Share,
  Bookmark,
  BookmarkCollection,
  Report,
  Tag,
  Notification,
  Activity,
  SocialStats,
  FeedItem,
  TrendingTopic,
  UserSuggestion,
  SocialApiResponse,
  PaginatedSocialResponse,
  SocialFilters,
  PaginationParams,
  CreateCommentData,
  UpdateCommentData,
  SendFriendRequestData,
  UpdateProfileData,
  SocialRealtimeUpdate,
  SocialSubscriptionCallback,
  SocialError,
} from '../types/social';

export class SocialService {
  private static instance: SocialService;
  private subscriptions: Map<string, () => void> = new Map();

  private constructor() {}

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  // ==================== USER MANAGEMENT ====================

  async getUser(userId: string): Promise<SocialApiResponse<SocialUser>> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new SocialError({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404,
        });
      }

      const userData = userDoc.data() as SocialUser;
      return {
        data: userData,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: UpdateProfileData): Promise<SocialApiResponse<SocialUser>> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(userRef, updateData);

      // Get updated user data
      const updatedUser = await this.getUser(userId);

      // Create activity
      await this.createActivity(userId, 'post', undefined, undefined, {
        type: 'profile_update',
        fields: Object.keys(data),
      });

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async getUsers(filters?: SocialFilters & PaginationParams): Promise<PaginatedSocialResponse<SocialUser>> {
    try {
      const constraints: QueryConstraint[] = [];
      let usersQuery = collection(db, 'users');

      if (filters?.search) {
        // For search, we'd need a separate search collection or use Algolia
        // For now, we'll get all users and filter client-side
      }

      if (filters?.verified !== undefined) {
        constraints.push(where('verified', '==', filters.verified));
      }

      constraints.push(orderBy('followersCount', 'desc'));
      constraints.push(limit(filters?.limit || 20));

      const q = query(usersQuery, ...constraints);
      const querySnapshot = await getDocs(q);

      let users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SocialUser[];

      // Client-side filtering for search
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        users = users.filter(user =>
          user.name.toLowerCase().includes(searchTerm) ||
          user.username.toLowerCase().includes(searchTerm) ||
          user.bio?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        data: users,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: users.length,
          totalPages: Math.ceil(users.length / (filters?.limit || 20)),
          hasNext: users.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== FOLLOW SYSTEM ====================

  async followUser(followerId: string, followingId: string): Promise<SocialApiResponse<{ following: boolean }>> {
    try {
      if (followerId === followingId) {
        throw new SocialError({
          message: 'Cannot follow yourself',
          code: 'CANNOT_FOLLOW_SELF',
          statusCode: 400,
        });
      }

      // Check if already following
      const existingFollow = await this.getFollow(followerId, followingId);
      if (existingFollow.data) {
        throw new SocialError({
          message: 'Already following this user',
          code: 'ALREADY_FOLLOWING',
          statusCode: 400,
        });
      }

      // Create follow relationship
      const followData: Omit<Follow, 'id'> = {
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      const followRef = await addDoc(collection(db, 'follows'), followData);

      // Update follower/following counts
      await this.updateFollowCounts(followerId, followingId, 'increment');

      // Create notification
      await this.createNotification(followingId, 'follow', 'New follower', `${followerId} started following you`, {
        followerId,
        type: 'follow',
      });

      // Create activity
      await this.createActivity(followerId, 'follow', undefined, undefined, {
        followedUserId: followingId,
      });

      return {
        data: { following: true },
        success: true,
        message: 'Successfully followed user',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<SocialApiResponse<{ following: boolean }>> {
    try {
      const follow = await this.getFollow(followerId, followingId);
      if (!follow.data) {
        throw new SocialError({
          message: 'Not following this user',
          code: 'NOT_FOLLOWING',
          statusCode: 400,
        });
      }

      // Delete follow relationship
      await deleteDoc(doc(db, 'follows', follow.data.id));

      // Update counts
      await this.updateFollowCounts(followerId, followingId, 'decrement');

      return {
        data: { following: false },
        success: true,
        message: 'Successfully unfollowed user',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getFollow(followerId: string, followingId: string): Promise<SocialApiResponse<Follow | null>> {
    try {
      const followsQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', followerId),
        where('followingId', '==', followingId),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(followsQuery);
      if (querySnapshot.empty) {
        return {
          data: null,
          success: true,
          timestamp: new Date().toISOString(),
        };
      }

      const followDoc = querySnapshot.docs[0];
      return {
        data: {
          id: followDoc.id,
          ...followDoc.data(),
        } as Follow,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getFollowers(userId: string, filters?: PaginationParams): Promise<PaginatedSocialResponse<SocialUser>> {
    try {
      const followersQuery = query(
        collection(db, 'follows'),
        where('followingId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(followersQuery);
      const followerIds = querySnapshot.docs.map(doc => doc.data().followerId);

      // Get user data for followers
      const followers = await Promise.all(
        followerIds.map(id => this.getUser(id))
      );

      return {
        data: followers.map(f => f.data).filter(Boolean) as SocialUser[],
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: followerIds.length,
          totalPages: Math.ceil(followerIds.length / (filters?.limit || 20)),
          hasNext: followerIds.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getFollowing(userId: string, filters?: PaginationParams): Promise<PaginatedSocialResponse<SocialUser>> {
    try {
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(followingQuery);
      const followingIds = querySnapshot.docs.map(doc => doc.data().followingId);

      // Get user data for following
      const following = await Promise.all(
        followingIds.map(id => this.getUser(id))
      );

      return {
        data: following.map(f => f.data).filter(Boolean) as SocialUser[],
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: followingIds.length,
          totalPages: Math.ceil(followingIds.length / (filters?.limit || 20)),
          hasNext: followingIds.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  private async updateFollowCounts(followerId: string, followingId: string, operation: 'increment' | 'decrement'): Promise<void> {
    const batch = writeBatch(db);
    const incrementValue = operation === 'increment' ? 1 : -1;

    // Update follower's following count
    const followerRef = doc(db, 'users', followerId);
    batch.update(followerRef, {
      followingCount: increment(incrementValue),
    });

    // Update following's followers count
    const followingRef = doc(db, 'users', followingId);
    batch.update(followingRef, {
      followersCount: increment(incrementValue),
    });

    await batch.commit();
  }

  // ==================== FRIENDS SYSTEM ====================

  async sendFriendRequest(senderId: string, receiverId: string, data?: SendFriendRequestData): Promise<SocialApiResponse<FriendRequest>> {
    try {
      if (senderId === receiverId) {
        throw new SocialError({
          message: 'Cannot send friend request to yourself',
          code: 'CANNOT_FRIEND_SELF',
          statusCode: 400,
        });
      }

      // Check if already friends or request exists
      const existingRequest = await this.getFriendRequest(senderId, receiverId);
      if (existingRequest.data) {
        throw new SocialError({
          message: 'Friend request already exists',
          code: 'REQUEST_EXISTS',
          statusCode: 400,
        });
      }

      const requestData: Omit<FriendRequest, 'id'> = {
        senderId,
        receiverId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: data?.message,
      };

      const requestRef = await addDoc(collection(db, 'friendRequests'), requestData);

      // Create notification
      await this.createNotification(receiverId, 'friend_request', 'New friend request', `${senderId} sent you a friend request`, {
        senderId,
        requestId: requestRef.id,
      });

      return {
        data: {
          id: requestRef.id,
          ...requestData,
        },
        success: true,
        message: 'Friend request sent',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async respondToFriendRequest(requestId: string, response: 'accepted' | 'declined'): Promise<SocialApiResponse<Friendship>> {
    try {
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      if (!requestDoc.exists()) {
        throw new SocialError({
          message: 'Friend request not found',
          code: 'REQUEST_NOT_FOUND',
          statusCode: 404,
        });
      }

      const requestData = requestDoc.data() as FriendRequest;

      if (response === 'accepted') {
        // Create friendship
        const friendshipData: Omit<Friendship, 'id'> = {
          user1Id: requestData.senderId,
          user2Id: requestData.receiverId,
          status: 'active',
          createdAt: new Date().toISOString(),
          closeFriend: false,
        };

        const friendshipRef = await addDoc(collection(db, 'friendships'), friendshipData);

        // Update request status
        await updateDoc(doc(db, 'friendRequests', requestId), {
          status: 'accepted',
          respondedAt: new Date().toISOString(),
        });

        // Create notifications
        await this.createNotification(requestData.senderId, 'friend_request', 'Friend request accepted', `${requestData.receiverId} accepted your friend request`, {
          friendId: requestData.receiverId,
        });

        return {
          data: {
            id: friendshipRef.id,
            ...friendshipData,
          },
          success: true,
          message: 'Friend request accepted',
          timestamp: new Date().toISOString(),
        };
      } else {
        // Decline request
        await updateDoc(doc(db, 'friendRequests', requestId), {
          status: 'declined',
          respondedAt: new Date().toISOString(),
        });

        return {
          data: {
            id: 'declined',
            user1Id: requestData.senderId,
            user2Id: requestData.receiverId,
            status: 'active',
            createdAt: new Date().toISOString(),
            closeFriend: false,
          },
          success: true,
          message: 'Friend request declined',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      throw error;
    }
  }

  async getFriendRequest(senderId: string, receiverId: string): Promise<SocialApiResponse<FriendRequest | null>> {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(requestsQuery);
      if (querySnapshot.empty) {
        return {
          data: null,
          success: true,
          timestamp: new Date().toISOString(),
        };
      }

      const requestDoc = querySnapshot.docs[0];
      return {
        data: {
          id: requestDoc.id,
          ...requestDoc.data(),
        } as FriendRequest,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getFriends(userId: string, filters?: PaginationParams): Promise<PaginatedSocialResponse<SocialUser>> {
    try {
      const friendshipsQuery = query(
        collection(db, 'friendships'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(friendshipsQuery);
      const friendships = querySnapshot.docs.map(doc => doc.data()) as Friendship[];

      // Get friend IDs (both directions)
      const friendIds = friendships
        .filter(f => f.user1Id === userId || f.user2Id === userId)
        .map(f => f.user1Id === userId ? f.user2Id : f.user1Id);

      // Get user data for friends
      const friends = await Promise.all(
        friendIds.map(id => this.getUser(id))
      );

      return {
        data: friends.map(f => f.data).filter(Boolean) as SocialUser[],
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: friendIds.length,
          totalPages: Math.ceil(friendIds.length / (filters?.limit || 20)),
          hasNext: friendIds.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== COMMENTS SYSTEM ====================

  async createComment(contentId: string, contentType: 'image' | 'video' | 'post', authorId: string, data: CreateCommentData): Promise<SocialApiResponse<Comment>> {
    try {
      const commentData = {
        contentId,
        contentType,
        authorId,
        text: data.text,
        parentId: data.parentId,
        mentions: data.mentions || [],
        hashtags: this.extractHashtags(data.text),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        edited: false,
        likesCount: 0,
        repliesCount: 0,
        isApproved: true,
        isReported: false,
        reportsCount: 0,
      };

      const commentRef = await addDoc(collection(db, 'comments'), commentData);

      // Update comment count on content
      await this.updateCommentCount(contentId, contentType, 'increment');

      // Create notifications for mentions
      if (data.mentions && data.mentions.length > 0) {
        await Promise.all(
          data.mentions.map(userId =>
            this.createNotification(userId, 'mention', 'You were mentioned', `Someone mentioned you in a comment`, {
              commentId: commentRef.id,
              contentId,
              contentType,
            })
          )
        );
      }

      // Create activity
      await this.createActivity(authorId, 'comment', contentId, contentType, {
        commentId: commentRef.id,
        text: data.text,
      });

      const result: Comment = {
        id: commentRef.id,
        ...commentData,
      };

      return {
        data: result,
        success: true,
        message: 'Comment created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getComments(contentId: string, contentType: 'image' | 'video' | 'post', filters?: PaginationParams): Promise<PaginatedSocialResponse<Comment>> {
    try {
      const commentsQuery = query(
        collection(db, 'comments'),
        where('contentId', '==', contentId),
        where('contentType', '==', contentType),
        where('isApproved', '==', true),
        where('parentId', '==', null), // Only top-level comments
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(commentsQuery);
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await this.getCommentReplies(comment.id);
          return {
            ...comment,
            replies: replies.data,
          };
        })
      );

      return {
        data: commentsWithReplies,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: comments.length,
          totalPages: Math.ceil(comments.length / (filters?.limit || 20)),
          hasNext: comments.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async getCommentReplies(commentId: string): Promise<SocialApiResponse<Comment[]>> {
    try {
      const repliesQuery = query(
        collection(db, 'comments'),
        where('parentId', '==', commentId),
        where('isApproved', '==', true),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(repliesQuery);
      const replies = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      return {
        data: replies,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async likeComment(commentId: string, userId: string): Promise<SocialApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) {
        throw new SocialError({
          message: 'Comment not found',
          code: 'COMMENT_NOT_FOUND',
          statusCode: 404,
        });
      }

      const commentData = commentDoc.data() as Comment;
      const isLiked = commentData.likesCount > 0; // Simplified - in real app, check if user liked

      if (isLiked) {
        // Unlike
        await updateDoc(commentRef, {
          likesCount: increment(-1),
        });

        return {
          data: { liked: false, likesCount: commentData.likesCount - 1 },
          success: true,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Like
        await updateDoc(commentRef, {
          likesCount: increment(1),
        });

        // Create notification for comment author
        await this.createNotification(commentData.authorId, 'like', 'Someone liked your comment', `Your comment received a like`, {
          commentId,
          userId,
        });

        return {
          data: { liked: true, likesCount: commentData.likesCount + 1 },
          success: true,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      throw error;
    }
  }

  private async updateCommentCount(contentId: string, contentType: string, operation: 'increment' | 'decrement'): Promise<void> {
    const incrementValue = operation === 'increment' ? 1 : -1;
    const contentRef = doc(db, contentType + 's', contentId); // images, videos, or posts

    await updateDoc(contentRef, {
      commentsCount: increment(incrementValue),
    });
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // ==================== LIKES SYSTEM ====================

  async likeContent(contentId: string, contentType: 'image' | 'video' | 'post', userId: string): Promise<SocialApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      const contentRef = doc(db, contentType + 's', contentId);
      const contentDoc = await getDoc(contentRef);

      if (!contentDoc.exists()) {
        throw new SocialError({
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND',
          statusCode: 404,
        });
      }

      const contentData = contentDoc.data();
      const currentLikes = contentData.likesCount || 0;

      // Check if already liked (simplified - in real app, check likes collection)
      const isLiked = Math.random() > 0.7; // Placeholder

      if (isLiked) {
        // Unlike
        await updateDoc(contentRef, {
          likesCount: increment(-1),
        });

        return {
          data: { liked: false, likesCount: currentLikes - 1 },
          success: true,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Like
        await updateDoc(contentRef, {
          likesCount: increment(1),
        });

        // Create notification for content owner
        await this.createNotification(contentData.userId, 'like', 'Someone liked your content', `Your ${contentType} received a like`, {
          contentId,
          contentType,
          userId,
        });

        // Create activity
        await this.createActivity(userId, 'like', contentId, contentType);

        return {
          data: { liked: true, likesCount: currentLikes + 1 },
          success: true,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // ==================== NOTIFICATIONS ====================

  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const notificationData: Omit<Notification, 'id'> = {
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: 'normal',
        category: this.getNotificationCategory(type),
        isGrouped: false,
        channels: {
          inApp: true,
          push: true,
          email: false,
        },
        preferences: {
          allowPreview: true,
          allowSound: true,
          allowVibration: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        },
      };

      await addDoc(collection(db, 'notifications'), notificationData);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  private getNotificationCategory(type: Notification['type']): Notification['category'] {
    switch (type) {
      case 'like':
      case 'comment':
      case 'follow':
      case 'friend_request':
      case 'mention':
      case 'tag':
      case 'share':
        return 'social';
      case 'achievement':
      case 'milestone':
        return 'achievement';
      case 'system':
        return 'system';
      default:
        return 'social';
    }
  }

  async getNotifications(userId: string, filters?: PaginationParams): Promise<PaginatedSocialResponse<Notification>> {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      return {
        data: notifications,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: notifications.length,
          totalPages: Math.ceil(notifications.length / (filters?.limit || 20)),
          hasNext: notifications.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<SocialApiResponse<Notification>> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date().toISOString(),
      });

      const updatedDoc = await getDoc(notificationRef);
      return {
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        } as Notification,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== ACTIVITY SYSTEM ====================

  async createActivity(
    userId: string,
    type: Activity['type'],
    contentId?: string,
    contentType?: 'image' | 'video' | 'post',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const activityData: Omit<Activity, 'id'> = {
        userId,
        type,
        contentId,
        contentType,
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        visibility: 'public',
      };

      await addDoc(collection(db, 'activities'), activityData);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  }

  async getActivityFeed(userId: string, filters?: PaginationParams): Promise<PaginatedSocialResponse<Activity>> {
    try {
      // Get activities from followed users and friends
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(filters?.limit || 20)
      );

      const querySnapshot = await getDocs(activitiesQuery);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];

      return {
        data: activities,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          total: activities.length,
          totalPages: Math.ceil(activities.length / (filters?.limit || 20)),
          hasNext: activities.length === (filters?.limit || 20),
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToUserUpdates(userId: string, callback: SocialSubscriptionCallback<SocialUser>): () => void {
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const update: SocialRealtimeUpdate<SocialUser> = {
          type: 'update',
          data: { id: doc.id, ...doc.data() } as SocialUser,
          timestamp: new Date().toISOString(),
          userId,
        };
        callback(update);
      }
    });

    this.subscriptions.set(`user-${userId}`, unsubscribe);
    return unsubscribe;
  }

  subscribeToNotifications(userId: string, callback: SocialSubscriptionCallback<Notification>): () => void {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const update: SocialRealtimeUpdate<Notification> = {
            type: 'create',
            data: { id: change.doc.id, ...change.doc.data() } as Notification,
            timestamp: new Date().toISOString(),
            userId,
          };
          callback(update);
        }
      });
    });

    this.subscriptions.set(`notifications-${userId}`, unsubscribe);
    return unsubscribe;
  }

  unsubscribe(subscriptionKey: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionKey);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const socialService = SocialService.getInstance();