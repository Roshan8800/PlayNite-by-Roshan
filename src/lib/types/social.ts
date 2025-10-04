// Social Features Types and Interfaces

export interface SocialUser {
  id: string;
  firebaseId: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  isPrivate: boolean;
  joinedDate: string;
  lastActive: string;
  location?: string;
  website?: string;

  // Social stats
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesCount: number;

  // Social connections
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isFriend?: boolean;
  mutualFriendsCount?: number;

  // Profile settings
  allowFriendRequests: boolean;
  allowTagging: boolean;
  allowMentions: boolean;

  // Achievement properties
  lastPostDate?: string;
  postingStreak?: number;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  status: 'active' | 'pending' | 'blocked';
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  respondedAt?: string;
  message?: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'active' | 'blocked';
  createdAt: string;
  closeFriend: boolean;
}

export interface Comment {
  id: string;
  contentId: string; // Image, Video, or Post ID
  contentType: 'image' | 'video' | 'post';
  authorId: string;
  text: string;
  parentId?: string | undefined; // For nested comments
  mentions: string[]; // User IDs mentioned in comment
  hashtags: string[];
  createdAt: string;
  updatedAt?: string;
  edited: boolean;

  // Engagement
  likesCount: number;
  repliesCount: number;
  isLiked?: boolean;

  // Moderation
  isApproved: boolean;
  isReported: boolean;
  reportsCount: number;

  // Nested structure
  replies?: Comment[];
  author?: SocialUser;
}

export interface Like {
  id: string;
  contentId: string;
  contentType: 'image' | 'video' | 'post' | 'comment';
  userId: string;
  createdAt: string;
}

export interface Share {
  id: string;
  contentId: string;
  contentType: 'image' | 'video' | 'post';
  userId: string;
  platform?: 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'copy_link';
  createdAt: string;
}

export interface Bookmark {
  id: string;
  contentId: string;
  contentType: 'image' | 'video' | 'post';
  userId: string;
  collectionId?: string;
  createdAt: string;
}

export interface BookmarkCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt?: string;
  itemsCount: number;
}

export interface Report {
  id: string;
  contentId: string;
  contentType: 'image' | 'video' | 'post' | 'comment' | 'user';
  reporterId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'violence' | 'nudity' | 'hate_speech' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Tag {
  id: string;
  contentId: string;
  contentType: 'image' | 'video' | 'post';
  userId: string; // User who tagged
  taggedUserId: string; // User being tagged
  position?: {
    x: number;
    y: number;
  };
  createdAt: string;
  approved: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'mention' | 'tag' | 'share' | 'system' | 'achievement' | 'milestone';
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;

  // Enhanced notification features
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'social' | 'system' | 'achievement' | 'marketing';
  expiresAt?: string;
  actionUrl?: string;
  imageUrl?: string;
  groupId?: string; // For grouping similar notifications
  isGrouped: boolean;
  groupCount?: number;

  // Notification settings
  sound?: string;
  vibration?: boolean;
  silent?: boolean;

  // Delivery channels
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms?: boolean;
  };

  // User preferences
  preferences: {
    allowPreview: boolean;
    allowSound: boolean;
    allowVibration: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
  };
}

// Notification Preferences and Settings
export interface NotificationPreferences {
  userId: string;
  globalSettings: {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    previewEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    doNotDisturb: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };

  // Notification type preferences
  types: {
    like: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    comment: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    follow: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    friend_request: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    mention: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    tag: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    share: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    system: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    achievement: { enabled: boolean; sound?: string; channels: Notification['channels'] };
    milestone: { enabled: boolean; sound?: string; channels: Notification['channels'] };
  };

  // User-specific preferences
  mutedUsers: string[];
  snoozedUsers: string[];
  priorityUsers: string[];

  updatedAt: string;
}

// Notification Management
export interface NotificationFilter {
  types?: Notification['type'][];
  categories?: Notification['category'][];
  priorities?: Notification['priority'][];
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface NotificationBulkAction {
  action: 'mark_read' | 'mark_unread' | 'delete' | 'archive' | 'snooze';
  notificationIds: string[];
  snoozeUntil?: string;
}

// Notification Analytics
export interface NotificationAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;

  byType: Record<Notification['type'], {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    avgTimeToRead: number; // in minutes
  }>;

  byChannel: {
    inApp: { delivered: number; read: number; clicked: number };
    push: { delivered: number; read: number; clicked: number };
    email: { delivered: number; read: number; clicked: number };
  };

  engagementRate: number;
  clickThroughRate: number;
  optimalSendTime: string;
  topPerformingTypes: Array<{
    type: Notification['type'];
    engagementRate: number;
  }>;
}

// Achievement and Milestone Types
export interface Achievement {
  id: string;
  userId: string;
  type: 'follower_milestone' | 'post_milestone' | 'engagement_milestone' | 'streak' | 'special';
  title: string;
  description: string;
  icon: string;
  badge?: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  isNew: boolean;
  metadata: Record<string, any>;
}

export interface Milestone {
  id: string;
  userId: string;
  type: 'followers' | 'posts' | 'likes' | 'comments' | 'following' | 'engagement';
  threshold: number;
  currentValue: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  reward?: {
    type: 'badge' | 'title' | 'feature' | 'points';
    value: string | number;
  };
}

// Notification Grouping
export interface NotificationGroup {
  id: string;
  userId: string;
  type: Notification['type'];
  title: string;
  summary: string;
  notifications: Notification[];
  count: number;
  latestNotificationAt: string;
  isExpanded: boolean;
  priority: Notification['priority'];
}

// Push Notification Payload
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
}

// WebSocket Message Types
export interface NotificationWebSocketMessage {
  type: 'notification' | 'notification_read' | 'notification_group' | 'notification_settings';
  data: Notification | NotificationBulkAction | NotificationGroup | NotificationPreferences;
  userId: string;
  timestamp: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'post' | 'like' | 'comment' | 'follow' | 'share';
  contentId?: string;
  contentType?: 'image' | 'video' | 'post';
  metadata: Record<string, any>;
  createdAt: string;
  visibility: 'public' | 'friends' | 'private';
}

export interface SocialStats {
  userId: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  sharesReceived: number;
  engagementRate: number;
  lastUpdated: string;
}

export interface FeedItem {
  id: string;
  type: 'post' | 'activity';
  userId: string;
  contentId?: string;
  contentType?: 'image' | 'video' | 'post';
  activity?: Activity;
  createdAt: string;
  score: number; // For algorithmic ranking
}

export interface TrendingTopic {
  id: string;
  hashtag: string;
  count: number;
  trendScore: number;
  category?: string;
  lastUpdated: string;
}

export interface UserSuggestion {
  user: SocialUser;
  reason: 'mutual_friends' | 'similar_interests' | 'location' | 'activity';
  mutualFriendsCount?: number;
  commonInterests?: string[];
  score: number;
}

// API Response Types
export interface SocialApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginatedSocialResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
  message?: string;
  timestamp: string;
}

// Filter and Sort Types
export interface SocialFilters {
  userId?: string;
  contentType?: 'image' | 'video' | 'post' | 'all';
  dateFrom?: string;
  dateTo?: string;
  minLikes?: number;
  maxLikes?: number;
  hashtags?: string[];
  mentions?: string[];
  location?: string;
  verified?: boolean;
  search?: string;
  sortBy?: 'recent' | 'popular' | 'trending' | 'relevant';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Real-time Update Types
export interface SocialRealtimeUpdate<T> {
  type: 'create' | 'update' | 'delete';
  data: T;
  timestamp: string;
  userId: string;
}

export interface SocialSubscriptionCallback<T> {
  (update: SocialRealtimeUpdate<T>): void;
}

// Error Types
export class SocialError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor({ message, code, statusCode, details }: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  }) {
    super(message);
    this.name = 'SocialError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Form Types
export interface CreateCommentData {
  text: string;
  parentId?: string;
  mentions?: string[];
  hashtags?: string[];
}

export interface UpdateCommentData {
  text: string;
  mentions?: string[];
  hashtags?: string[];
}

export interface CreatePostData {
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'mixed';
  visibility: 'public' | 'friends' | 'private';
  allowComments: boolean;
  allowShares: boolean;
  hashtags?: string[];
  mentions?: string[];
  location?: string;
}

export interface SendFriendRequestData {
  message?: string;
}

export interface UpdateProfileData {
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  isPrivate?: boolean;
  allowFriendRequests?: boolean;
  allowTagging?: boolean;
  allowMentions?: boolean;
}

// Analytics Types
export interface SocialAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  followersGained: number;
  followersLost: number;
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  sharesReceived: number;
  engagementRate: number;
  topPosts: Array<{
    contentId: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
  demographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
    interests: Record<string, number>;
  };
}