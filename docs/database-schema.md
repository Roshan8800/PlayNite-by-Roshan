# Database Schema and Data Models

## Overview

PlayNite's database architecture uses Cloud Firestore as the primary NoSQL database, with Firebase Realtime Database for real-time features. The schema is designed for scalability, performance, and flexible data relationships.

## Database Architecture

### Primary Database: Cloud Firestore

**Firestore Features Utilized**
- **Document Collections**: Main data organization
- **Subcollections**: Hierarchical data relationships
- **Real-time Listeners**: Live data synchronization
- **Offline Support**: Offline data persistence
- **Security Rules**: Granular access control

### Secondary Database: Realtime Database

**Real-time Features**
- **Live Presence**: User online status
- **Real-time Counters**: Live like/comment counts
- **Instant Notifications**: Real-time notification delivery
- **Live Activity Feeds**: Real-time content updates

## Core Collections Schema

### 1. Users Collection

**Primary User Data**
```typescript
interface UserDocument {
  // Authentication
  uid: string;                    // Firebase Auth UID
  email: string;
  emailVerified: boolean;

  // Profile Information
  username: string;               // Unique username
  displayName: string;
  bio?: string;
  avatar?: string;                // Storage URL
  coverImage?: string;            // Storage URL

  // Social Metrics
  followersCount: number;         // Denormalized count
  followingCount: number;         // Denormalized count
  friendsCount: number;           // Denormalized count
  postsCount: number;             // Denormalized count

  // Account Status
  verified: boolean;              // Email verification + manual
  isPrivate: boolean;             // Private account flag
  isActive: boolean;              // Account status
  role: 'user' | 'moderator' | 'admin';

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;

  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: NotificationSettings;
  };
}
```

**Users Subcollections**
- **posts**: User's content posts
- **followers**: Users following this user
- **following**: Users this user follows
- **notifications**: User notifications
- **settings**: Detailed user preferences

### 2. Content Collections

#### Images Collection
```typescript
interface ImageDocument {
  // Content Identification
  id: string;
  userId: string;                 // Content creator

  // Content Data
  title?: string;
  description?: string;
  url: string;                    // Storage URL
  thumbnailUrl?: string;          // Thumbnail storage URL

  // Media Information
  metadata: {
    width: number;
    height: number;
    size: number;                 // File size in bytes
    format: string;               // jpg, png, webp, etc.
    colorProfile?: string;
    hasAlpha?: boolean;
  };

  // Organization
  tags: string[];                 // AI-generated and user tags
  category: string;               // photos, art, nature, etc.
  isPublic: boolean;              // Visibility setting

  // Engagement Metrics
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  bookmarksCount: number;
  sharesCount: number;

  // Moderation
  isApproved: boolean;            // Admin approval status
  isFlagged: boolean;             // User reports
  reportsCount: number;
  moderationScore: number;        // AI moderation confidence

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
```

#### Videos Collection
```typescript
interface VideoDocument {
  // Content Identification
  id: string;
  userId: string;

  // Content Data
  title?: string;
  description?: string;
  url: string;                    // Storage URL
  thumbnailUrl?: string;          // Thumbnail storage URL

  // Media Information
  metadata: {
    width: number;
    height: number;
    duration: number;             // Duration in seconds
    size: number;                 // File size in bytes
    format: string;               // mp4, webm, mov, etc.
    codec: string;                // H.264, VP9, etc.
    bitrate: number;              // Video bitrate
    frameRate: number;            // FPS
  };

  // Organization
  tags: string[];
  category: string;               // reels, tutorials, entertainment
  isPublic: boolean;

  // Engagement Metrics
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  savesCount: number;
  watchTime: number;              // Total watch time in seconds
  completionRate: number;         // Average completion percentage

  // Streaming Information
  streamingUrl?: string;          // HLS/DASH manifest URL
  qualities: string[];            // Available quality options
  thumbnailTimestamps: number[];  // Thumbnail generation points

  // Moderation
  isApproved: boolean;
  isFlagged: boolean;
  reportsCount: number;
  moderationScore: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
```

#### Stories Collection
```typescript
interface StoryDocument {
  // Story Identification
  id: string;
  userId: string;

  // Story Content
  segments: StorySegment[];       // Multiple media segments
  expiresAt: Timestamp;           // Auto-expiry timestamp
  isActive: boolean;              // Active status flag

  // Engagement
  viewsCount: number;
  uniqueViewsCount: number;       // Unique viewers
  engagementRate: number;         // Interaction rate

  // Story Metadata
  category?: string;
  isPublic: boolean;
  allowReplies: boolean;          // Allow story replies

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface StorySegment {
  id: string;
  type: 'image' | 'video';
  url: string;                    // Media storage URL
  thumbnailUrl?: string;
  duration?: number;              // Display duration for images
  text?: string;                  // Overlay text
  order: number;                  // Display order
  createdAt: Timestamp;
}
```

### 3. Social Interaction Collections

#### Follows Collection
```typescript
interface FollowDocument {
  id: string;
  followerId: string;             // User initiating follow
  followingId: string;            // User being followed
  createdAt: Timestamp;
  status: 'active' | 'pending' | 'blocked';

  // Notification Settings
  notificationSettings: {
    newContent: boolean;
    likes: boolean;
    comments: boolean;
  };
}
```

#### Friendships Collection
```typescript
interface FriendshipDocument {
  id: string;
  user1Id: string;                // Friendship initiator
  user2Id: string;                // Friendship recipient
  status: 'active' | 'blocked' | 'pending';
  createdAt: Timestamp;
  closeFriend: boolean;            // Close friend designation
  interactionScore: number;       // Relationship strength
}
```

#### Comments Collection
```typescript
interface CommentDocument {
  id: string;
  contentId: string;              // Image, video, or post ID
  contentType: 'image' | 'video' | 'post';
  authorId: string;               // Comment author

  // Comment Content
  text: string;
  parentId?: string;              // For nested replies
  mentions: string[];             // Mentioned user IDs
  hashtags: string[];             // Extracted hashtags

  // Engagement
  likesCount: number;
  repliesCount: number;
  isLiked: boolean;               // Denormalized for performance

  // Moderation
  isApproved: boolean;
  isFlagged: boolean;
  reportsCount: number;
  edited: boolean;                // Edit history flag

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editedAt?: Timestamp;
}
```

#### Likes Collection
```typescript
interface LikeDocument {
  id: string;
  userId: string;                 // User who liked
  contentId: string;              // Liked content ID
  contentType: 'image' | 'video' | 'post' | 'comment';
  createdAt: Timestamp;
  source?: string;                // Where like originated
}
```

### 4. Notifications Collection

```typescript
interface NotificationDocument {
  id: string;
  userId: string;                 // Notification recipient

  // Notification Content
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'mention' | 'achievement';
  title: string;
  message: string;
  data: Record<string, any>;      // Context-specific data

  // Notification State
  isRead: boolean;
  readAt?: Timestamp;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'social' | 'achievement' | 'system' | 'marketing';

  // Grouping
  isGrouped: boolean;
  groupId?: string;               // For similar notifications

  // Delivery Channels
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms?: boolean;
  };

  // User Preferences
  preferences: {
    allowPreview: boolean;
    allowSound: boolean;
    allowVibration: boolean;
    quietHours: {
      enabled: boolean;
      start: string;              // HH:MM format
      end: string;
    };
  };

  // Expiration
  expiresAt?: Timestamp;          // Auto-expiry for temporary notifications

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5. Activities Collection

```typescript
interface ActivityDocument {
  id: string;
  userId: string;                 // Activity performer

  // Activity Details
  type: 'post' | 'like' | 'comment' | 'follow' | 'share' | 'achievement';
  contentId?: string;             // Related content ID
  contentType?: 'image' | 'video' | 'post';

  // Activity Metadata
  metadata: Record<string, any>;  // Type-specific data
  visibility: 'public' | 'friends' | 'private';

  // Engagement
  engagementScore: number;        // Algorithm ranking score

  // Timestamps
  createdAt: Timestamp;
  expiresAt?: Timestamp;          // For temporary activities
}
```

## Database Relationships

### Collection Relationships

**User-Centric Relationships**
```
Users ──┬── Posts (subcollection)
        ├── Followers (subcollection)
        ├── Following (subcollection)
        ├── Notifications (subcollection)
        ├── Settings (subcollection)
        └── Activities (global collection)
```

**Content-Centric Relationships**
```
Images ──┬── Comments (filtered by contentId)
Videos ──┼── Likes (filtered by contentId)
Stories ─┘── Activities (filtered by contentId)
```

**Social Relationships**
```
Users ──┬── Follows (followerId/followingId)
        ├── Friendships (user1Id/user2Id)
        └── Notifications (userId)
```

## Indexing Strategy

### Firestore Indexes

**Single Field Indexes**
```typescript
// User queries
{ collection: 'users', fields: [{ fieldPath: 'username', order: 'ASCENDING' }] }
{ collection: 'users', fields: [{ fieldPath: 'verified', order: 'ASCENDING' }] }
{ collection: 'users', fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }] }

// Content queries
{ collection: 'images', fields: [{ fieldPath: 'category', order: 'ASCENDING' }] }
{ collection: 'images', fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }] }
{ collection: 'images', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }] }
{ collection: 'videos', fields: [{ fieldPath: 'duration', order: 'ASCENDING' }] }

// Social queries
{ collection: 'follows', fields: [{ fieldPath: 'followerId', order: 'ASCENDING' }] }
{ collection: 'follows', fields: [{ fieldPath: 'followingId', order: 'ASCENDING' }] }
{ collection: 'comments', fields: [{ fieldPath: 'contentId', order: 'ASCENDING' }] }
```

**Composite Indexes**
```typescript
// Complex content queries
{ collection: 'images', fields: [
  { fieldPath: 'category', order: 'ASCENDING' },
  { fieldPath: 'createdAt', order: 'DESCENDING' }
]}

// Social engagement queries
{ collection: 'comments', fields: [
  { fieldPath: 'contentId', order: 'ASCENDING' },
  { fieldPath: 'createdAt', order: 'DESCENDING' }
]}

// User activity queries
{ collection: 'activities', fields: [
  { fieldPath: 'userId', order: 'ASCENDING' },
  { fieldPath: 'createdAt', order: 'DESCENDING' }
]}
```

## Real-time Database Schema

### Real-time Data Structure

**Live User Presence**
```typescript
{
  users: {
    userId: {
      status: 'online' | 'away' | 'offline',
      lastSeen: timestamp,
      currentPage?: string,
      deviceInfo?: {
        type: 'desktop' | 'mobile' | 'tablet',
        browser?: string,
        os?: string
      }
    }
  }
}
```

**Live Counters**
```typescript
{
  counters: {
    content: {
      imageId: {
        likes: number,
        comments: number,
        views: number
      },
      videoId: {
        likes: number,
        comments: number,
        views: number
      }
    },
    social: {
      userId: {
        followers: number,
        following: number,
        notifications: number
      }
    }
  }
}
```

**Live Activity Feed**
```typescript
{
  feeds: {
    userId: {
      activities: [
        {
          id: string,
          type: string,
          timestamp: number,
          data: any
        }
      ],
      lastUpdated: timestamp
    }
  }
}
```

## Data Consistency Patterns

### Denormalization Strategy

**Count Denormalization**
- User follower/following counts stored in user document
- Content like/comment counts stored in content document
- Real-time counter updates for immediate UI feedback

**Data Duplication**
- User basic info duplicated in activity documents
- Content metadata duplicated in notification data
- Optimized for read performance over write consistency

### Transaction Patterns

**Atomic Operations**
```typescript
// Follow user with count updates
const followTransaction = async (followerId: string, followingId: string) => {
  return runTransaction(db, async (transaction) => {
    // Create follow relationship
    const followRef = doc(collection(db, 'follows'));
    transaction.set(followRef, {
      followerId,
      followingId,
      createdAt: serverTimestamp()
    });

    // Update counts atomically
    const followerRef = doc(db, 'users', followerId);
    const followingRef = doc(db, 'users', followingId);

    transaction.update(followerRef, {
      followingCount: increment(1)
    });
    transaction.update(followingRef, {
      followersCount: increment(1)
    });
  });
};
```

## Security Rules

### Firestore Security Rules

**User Document Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && resource.data.isPublic == true;
    }

    // Content access rules
    match /images/{imageId} {
      allow read: if request.auth != null && (
        resource.data.isPublic == true ||
        resource.data.userId == request.auth.uid
      );
      allow write: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    // Social interaction rules
    match /follows/{followId} {
      allow read, write: if request.auth != null;
      allow create: if request.auth.uid == request.resource.data.followerId;
    }
  }
}
```

## Performance Optimization

### Query Optimization

**Efficient Data Retrieval**
- **Selective Fields**: Only fetch required fields
- **Pagination**: Limit results with cursor-based pagination
- **Filtering**: Push filters to database level
- **Sorting**: Database-level sorting for consistency

**Caching Strategy**
- **Application Cache**: Short-term memory caching
- **CDN Cache**: Static asset caching
- **Browser Cache**: Long-term client-side caching
- **Database Cache**: Firestore built-in caching

### Scaling Considerations

**Horizontal Scaling**
- **Sharding**: Distribute data across multiple collections
- **Read Replicas**: Multiple read-only instances
- **Edge Computing**: Move computation closer to users
- **Load Distribution**: Intelligent request routing

## Data Migration Strategy

### Version Management

**Schema Versioning**
- **Migration Scripts**: Automated schema updates
- **Backward Compatibility**: Support for old data formats
- **Rollout Strategy**: Gradual migration deployment
- **Rollback Plan**: Quick reversion capabilities

**Migration Process**
1. **Backup**: Full database backup before migration
2. **Test Migration**: Test environment validation
3. **Staged Rollout**: Gradual production deployment
4. **Monitoring**: Post-migration performance monitoring
5. **Cleanup**: Remove deprecated data structures

## Analytics Data Schema

### Analytics Collections

**User Analytics**
```typescript
interface UserAnalyticsDocument {
  userId: string;
  date: string; // YYYY-MM-DD format
  sessions: number;
  sessionDuration: number;
  pageViews: number;
  actions: {
    likes: number;
    comments: number;
    shares: number;
    uploads: number;
  };
  deviceInfo: {
    type: string;
    browser: string;
    os: string;
  };
}
```

**Content Analytics**
```typescript
interface ContentAnalyticsDocument {
  contentId: string;
  contentType: 'image' | 'video' | 'story';
  date: string;
  views: number;
  uniqueViews: number;
  averageWatchTime?: number;
  completionRate?: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  demographics: {
    topCountries: string[];
    topDevices: string[];
    topBrowsers: string[];
  };
}
```

## Future Schema Enhancements

### Planned Improvements
1. **Graph Database Integration**: Advanced relationship modeling
2. **Time Series Collections**: Efficient time-based queries
3. **Geospatial Indexing**: Location-based content queries
4. **Advanced Search**: Full-text search optimization
5. **Blockchain Integration**: Content authenticity tracking

### Schema Evolution
1. **Microservices**: Separate databases per service domain
2. **Event Sourcing**: Event-driven data architecture
3. **CQRS Pattern**: Separate read/write databases
4. **Multi-region**: Global database distribution
5. **Advanced Caching**: Redis integration for complex queries

---

*This database schema documentation provides comprehensive insights into PlayNite's data architecture, covering collections, relationships, security, performance optimization, and future scalability plans.*