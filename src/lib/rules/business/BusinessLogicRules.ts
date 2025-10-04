import { RuleDefinition, RuleContext, ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * Business logic validation rules for follows, friendships, sharing, and engagement limits
 */
export class BusinessLogicRules {
  /**
   * Rule: Follow/unfollow rate limiting and validation
   */
  static readonly FOLLOW_LIMITS: RuleDefinition = {
    id: 'business_follow_limits',
    name: 'Follow/Unfollow Rate Limiting',
    description: 'Manages follow/unfollow actions to prevent spam and maintain platform health',
    category: 'business',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['follow', 'unfollow']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.follow',
        config: {
          maxFollowsPerDay: 200,
          maxFollowsPerHour: 50,
          maxUnfollowsPerDay: 100,
          maxUnfollowsPerHour: 25,
          requireMinProfileAge: 7, // days
          checkMutualFollows: true,
          preventRapidFollowUnfollow: true,
          cooldownPeriod: 300000 // 5 minutes between follow/unfollow
        }
      }
    ],
    tags: ['follow', 'rate-limit', 'spam']
  };

  /**
   * Rule: Friendship request management
   */
  static readonly FRIENDSHIP_REQUESTS: RuleDefinition = {
    id: 'business_friendship_requests',
    name: 'Friendship Request Management',
    description: 'Manages friendship requests and relationships',
    category: 'business',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['send_friend_request', 'accept_friend_request', 'decline_friend_request']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.friendship',
        config: {
          maxPendingRequests: 1000,
          maxRequestsPerDay: 50,
          requireMutualFriends: false,
          preventSelfFriend: true,
          checkExistingRelationship: true,
          minAccountAge: 1, // days
          maxFriendCount: 5000
        }
      }
    ],
    tags: ['friendship', 'relationships', 'social']
  };

  /**
   * Rule: Content sharing and engagement limits
   */
  static readonly CONTENT_SHARING: RuleDefinition = {
    id: 'business_content_sharing',
    name: 'Content Sharing and Engagement Limits',
    description: 'Manages content sharing, likes, comments, and other engagements',
    category: 'business',
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['share', 'like', 'comment', 'repost']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.engagement',
        config: {
          maxSharesPerDay: 100,
          maxLikesPerDay: 500,
          maxCommentsPerDay: 200,
          maxRepostsPerDay: 50,
          requireOriginalContent: false,
          checkContentAge: true,
          preventSelfEngagement: true,
          maxEngagementPerContent: 10
        }
      }
    ],
    tags: ['sharing', 'engagement', 'limits']
  };

  /**
   * Rule: Content visibility and privacy rules
   */
  static readonly CONTENT_VISIBILITY: RuleDefinition = {
    id: 'business_content_visibility',
    name: 'Content Visibility and Privacy Rules',
    description: 'Manages content visibility based on privacy settings and relationships',
    category: 'business',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['view_content', 'access_profile', 'view_friends_list']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.access',
        config: {
          respectPrivacySettings: true,
          requireFriendshipForPrivate: true,
          allowPublicContent: true,
          checkBlockedUsers: true,
          checkAgeRestrictions: true,
          requireVerificationForSensitive: false
        }
      }
    ],
    tags: ['visibility', 'privacy', 'access']
  };

  /**
   * Rule: Platform usage limits and quotas
   */
  static readonly USAGE_LIMITS: RuleDefinition = {
    id: 'business_usage_limits',
    name: 'Platform Usage Limits and Quotas',
    description: 'Manages platform usage limits and quotas for fair usage',
    category: 'business',
    priority: 75,
    enabled: true,
    conditions: [
      {
        field: 'data.user.tier',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.usage',
        config: {
          freeTierLimits: {
            maxPostsPerDay: 5,
            maxStorageGB: 1,
            maxFriends: 100,
            maxGroups: 5
          },
          premiumTierLimits: {
            maxPostsPerDay: 50,
            maxStorageGB: 100,
            maxFriends: 5000,
            maxGroups: 50
          },
          enterpriseTierLimits: {
            maxPostsPerDay: -1, // unlimited
            maxStorageGB: 1000,
            maxFriends: -1,
            maxGroups: -1
          },
          checkQuotaExceeded: true,
          allowGracePeriod: true
        }
      }
    ],
    tags: ['usage', 'limits', 'quotas', 'tiers']
  };

  /**
   * Rule: Content recommendation and discovery rules
   */
  static readonly CONTENT_DISCOVERY: RuleDefinition = {
    id: 'business_content_discovery',
    name: 'Content Discovery and Recommendation Rules',
    description: 'Manages content discovery, recommendations, and algorithmic behavior',
    category: 'business',
    priority: 70,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['get_recommendations', 'search_content', 'discover_content']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.discovery',
        config: {
          respectUserPreferences: true,
          filterBlockedContent: true,
          applyAgeRestrictions: true,
          diversifyRecommendations: true,
          maxRecommendations: 100,
          includeSponsoredContent: true,
          respectContentFilters: true
        }
      }
    ],
    tags: ['discovery', 'recommendations', 'algorithm']
  };

  /**
   * Rule: Social graph and network effects
   */
  static readonly SOCIAL_GRAPH: RuleDefinition = {
    id: 'business_social_graph',
    name: 'Social Graph and Network Effects',
    description: 'Manages social connections and network-based features',
    category: 'business',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['suggest_friends', 'find_mutual_friends', 'network_analysis']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.network',
        config: {
          requireMutualConnections: false,
          maxSuggestions: 50,
          respectPrivacySettings: true,
          preventStalkingBehavior: true,
          checkConnectionStrength: true,
          includeConnectionContext: true
        }
      }
    ],
    tags: ['social-graph', 'network', 'connections']
  };

  /**
   * Rule: Platform health and quality metrics
   */
  static readonly PLATFORM_HEALTH: RuleDefinition = {
    id: 'business_platform_health',
    name: 'Platform Health and Quality Metrics',
    description: 'Monitors and maintains platform health and content quality',
    category: 'business',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.content.quality_score',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.platform',
        config: {
          minQualityThreshold: 0.7,
          maxSpamRatio: 0.1,
          requireHumanModeration: false,
          enableAutomatedActions: true,
          trackEngagementMetrics: true,
          monitorUserBehavior: true
        }
      }
    ],
    tags: ['health', 'quality', 'metrics', 'monitoring']
  };

  /**
   * Get all business logic rules
   */
  static getAllRules(): RuleDefinition[] {
    return [
      this.FOLLOW_LIMITS,
      this.FRIENDSHIP_REQUESTS,
      this.CONTENT_SHARING,
      this.CONTENT_VISIBILITY,
      this.USAGE_LIMITS,
      this.CONTENT_DISCOVERY,
      this.SOCIAL_GRAPH,
      this.PLATFORM_HEALTH
    ];
  }

  /**
   * Get rules by tag
   */
  static getRulesByTag(tag: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.tags?.includes(tag)
    );
  }

  /**
   * Get rules by category
   */
  static getRulesByCategory(category: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.category === category
    );
  }
}

/**
 * Business logic validation utilities
 */
export class BusinessValidationUtils {
  /**
   * Validate follow action
   */
  static validateFollowAction(followerId: string, followingId: string, config: {
    maxFollowsPerDay?: number;
    maxFollowsPerHour?: number;
    requireMinProfileAge?: number;
    checkMutualFollows?: boolean;
    preventRapidFollowUnfollow?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxFollowsPerDay = 200,
      maxFollowsPerHour = 50,
      requireMinProfileAge = 7,
      checkMutualFollows = true,
      preventRapidFollowUnfollow = true
    } = config;

    // Prevent self-follow
    if (followerId === followingId) {
      errors.push({
        field: 'follow',
        code: 'CANNOT_FOLLOW_SELF',
        message: 'Users cannot follow themselves',
        severity: 'error',
        value: { followerId, followingId }
      });
    }

    // In a real implementation, you'd check:
    // - Follow limits against database/cache
    // - Profile age requirements
    // - Recent follow/unfollow patterns
    // - Mutual follow status

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate friendship request
   */
  static validateFriendshipRequest(fromUserId: string, toUserId: string, config: {
    maxPendingRequests?: number;
    maxRequestsPerDay?: number;
    requireMutualFriends?: boolean;
    checkExistingRelationship?: boolean;
    minAccountAge?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxPendingRequests = 1000,
      maxRequestsPerDay = 50,
      requireMutualFriends = false,
      checkExistingRelationship = true,
      minAccountAge = 1
    } = config;

    // Prevent self-friend request
    if (fromUserId === toUserId) {
      errors.push({
        field: 'friendship',
        code: 'CANNOT_FRIEND_SELF',
        message: 'Users cannot send friend requests to themselves',
        severity: 'error',
        value: { fromUserId, toUserId }
      });
    }

    // In a real implementation, you'd check:
    // - Existing friendship status
    // - Pending request limits
    // - Daily request limits
    // - Account age requirements
    // - Mutual friends requirement

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate content engagement
   */
  static validateContentEngagement(userId: string, contentId: string, engagementType: string, config: {
    maxEngagementsPerDay?: number;
    requireOriginalContent?: boolean;
    checkContentAge?: boolean;
    preventSelfEngagement?: boolean;
    maxEngagementPerContent?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxEngagementsPerDay = 500,
      requireOriginalContent = false,
      checkContentAge = true,
      preventSelfEngagement = true,
      maxEngagementPerContent = 10
    } = config;

    // In a real implementation, you'd check:
    // - Daily engagement limits
    // - Content ownership (prevent self-engagement)
    // - Content age restrictions
    // - Engagement frequency limits
    // - Original content requirements

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check platform usage limits
   */
  static checkUsageLimits(userTier: string, usageType: string, currentUsage: number, config: {
    freeTierLimits?: Record<string, number>;
    premiumTierLimits?: Record<string, number>;
    enterpriseTierLimits?: Record<string, number>;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      freeTierLimits = {
        maxPostsPerDay: 5,
        maxStorageGB: 1,
        maxFriends: 100,
        maxGroups: 5
      },
      premiumTierLimits = {
        maxPostsPerDay: 50,
        maxStorageGB: 100,
        maxFriends: 5000,
        maxGroups: 50
      },
      enterpriseTierLimits = {
        maxPostsPerDay: -1, // unlimited
        maxStorageGB: 1000,
        maxFriends: -1,
        maxGroups: -1
      }
    } = config;

    const limits = {
      free: freeTierLimits,
      premium: premiumTierLimits,
      enterprise: enterpriseTierLimits
    };

    const tierLimits = limits[userTier as keyof typeof limits] || freeTierLimits;
    const limit = tierLimits[usageType];

    if (limit !== undefined && limit !== -1 && currentUsage >= limit) {
      errors.push({
        field: 'usage',
        code: 'USAGE_LIMIT_EXCEEDED',
        message: `Usage limit exceeded for ${usageType} on ${userTier} tier`,
        severity: 'error',
        value: currentUsage,
        constraints: { limit, tier: userTier }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate content visibility
   */
  static validateContentVisibility(viewerId: string, contentOwnerId: string, privacyLevel: string, config: {
    respectPrivacySettings?: boolean;
    requireFriendshipForPrivate?: boolean;
    checkBlockedUsers?: boolean;
    checkAgeRestrictions?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      respectPrivacySettings = true,
      requireFriendshipForPrivate = true,
      checkBlockedUsers = true,
      checkAgeRestrictions = true
    } = config;

    // Prevent self-viewing issues
    if (viewerId === contentOwnerId) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // In a real implementation, you'd check:
    // - Privacy settings compliance
    // - Friendship requirements
    // - Block lists
    // - Age restrictions
    // - Content filters

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}