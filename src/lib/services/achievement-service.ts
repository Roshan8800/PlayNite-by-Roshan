// Achievement System Service - Track and notify users of milestones and achievements
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { notificationService } from './notification-service';
import type {
  Achievement,
  Milestone,
  SocialUser,
  Notification as NotificationType,
} from '../types/social';

export class AchievementService {
  private static instance: AchievementService;

  private constructor() {}

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  // ==================== ACHIEVEMENT DEFINITIONS ====================

  private readonly achievementDefinitions = {
    // Follower milestones
    follower_bronze: {
      id: 'follower_bronze',
      title: 'Rising Star',
      description: 'Reached 10 followers',
      icon: '⭐',
      badge: 'bronze_medal',
      points: 10,
      rarity: 'common' as const,
      type: 'follower_milestone' as const,
      threshold: 10,
    },
    follower_silver: {
      id: 'follower_silver',
      title: 'Popular Creator',
      description: 'Reached 50 followers',
      icon: '🌟',
      badge: 'silver_medal',
      points: 25,
      rarity: 'common' as const,
      type: 'follower_milestone' as const,
      threshold: 50,
    },
    follower_gold: {
      id: 'follower_gold',
      title: 'Influencer',
      description: 'Reached 100 followers',
      icon: '👑',
      badge: 'gold_medal',
      points: 50,
      rarity: 'rare' as const,
      type: 'follower_milestone' as const,
      threshold: 100,
    },
    follower_platinum: {
      id: 'follower_platinum',
      title: 'Social Media Star',
      description: 'Reached 500 followers',
      icon: '💫',
      badge: 'platinum_medal',
      points: 100,
      rarity: 'rare' as const,
      type: 'follower_milestone' as const,
      threshold: 500,
    },
    follower_diamond: {
      id: 'follower_diamond',
      title: 'Celebrity Status',
      description: 'Reached 1000 followers',
      icon: '💎',
      badge: 'diamond_medal',
      points: 200,
      rarity: 'epic' as const,
      type: 'follower_milestone' as const,
      threshold: 1000,
    },

    // Post milestones
    post_bronze: {
      id: 'post_bronze',
      title: 'Content Creator',
      description: 'Published 10 posts',
      icon: '📝',
      badge: 'bronze_pen',
      points: 15,
      rarity: 'common' as const,
      type: 'post_milestone' as const,
      threshold: 10,
    },
    post_silver: {
      id: 'post_silver',
      title: 'Prolific Writer',
      description: 'Published 50 posts',
      icon: '✍️',
      badge: 'silver_pen',
      points: 40,
      rarity: 'common' as const,
      type: 'post_milestone' as const,
      threshold: 50,
    },
    post_gold: {
      id: 'post_gold',
      title: 'Content Machine',
      description: 'Published 100 posts',
      icon: '📚',
      badge: 'gold_pen',
      points: 75,
      rarity: 'rare' as const,
      type: 'post_milestone' as const,
      threshold: 100,
    },

    // Engagement milestones
    likes_bronze: {
      id: 'likes_bronze',
      title: 'First Likes',
      description: 'Received 10 likes on your content',
      icon: '❤️',
      badge: 'bronze_heart',
      points: 10,
      rarity: 'common' as const,
      type: 'engagement_milestone' as const,
      threshold: 10,
    },
    likes_silver: {
      id: 'likes_silver',
      title: 'Popular Content',
      description: 'Received 100 likes on your content',
      icon: '💖',
      badge: 'silver_heart',
      points: 30,
      rarity: 'common' as const,
      type: 'engagement_milestone' as const,
      threshold: 100,
    },
    likes_gold: {
      id: 'likes_gold',
      title: 'Viral Sensation',
      description: 'Received 500 likes on your content',
      icon: '💕',
      badge: 'gold_heart',
      points: 75,
      rarity: 'rare' as const,
      type: 'engagement_milestone' as const,
      threshold: 500,
    },

    // Comment milestones
    comments_bronze: {
      id: 'comments_bronze',
      title: 'Conversation Starter',
      description: 'Received 5 comments on your content',
      icon: '💬',
      badge: 'bronze_chat',
      points: 10,
      rarity: 'common' as const,
      type: 'engagement_milestone' as const,
      threshold: 5,
    },
    comments_silver: {
      id: 'comments_silver',
      title: 'Community Builder',
      description: 'Received 25 comments on your content',
      icon: '🗣️',
      badge: 'silver_chat',
      points: 25,
      rarity: 'common' as const,
      type: 'engagement_milestone' as const,
      threshold: 25,
    },

    // Special achievements
    streak_7: {
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Posted content for 7 days in a row',
      icon: '🔥',
      badge: 'fire_streak',
      points: 50,
      rarity: 'rare' as const,
      type: 'streak' as const,
      threshold: 7,
    },
    streak_30: {
      id: 'streak_30',
      title: 'Month Master',
      description: 'Posted content for 30 days in a row',
      icon: '🚀',
      badge: 'rocket_streak',
      points: 150,
      rarity: 'epic' as const,
      type: 'streak' as const,
      threshold: 30,
    },
    first_follower: {
      id: 'first_follower',
      title: 'Welcome to the Community',
      description: 'Got your first follower',
      icon: '🎉',
      badge: 'welcome',
      points: 5,
      rarity: 'common' as const,
      type: 'special' as const,
      threshold: 1,
    },
  };

  // ==================== ACHIEVEMENT TRACKING ====================

  async checkAndAwardAchievements(
    userId: string,
    activityType: 'follower' | 'post' | 'likes' | 'comments' | 'streak',
    currentValue: number,
    metadata?: Record<string, any>
  ): Promise<Achievement[]> {
    try {
      const awardedAchievements: Achievement[] = [];

      // Get user's current stats
      const userStats = await this.getUserStats(userId);

      // Check relevant achievements based on activity type
      const relevantAchievements = this.getRelevantAchievements(activityType, currentValue);

      for (const achievementDef of relevantAchievements) {
        // Check if user already has this achievement
        const existingAchievement = await this.getUserAchievement(userId, achievementDef.id);
        if (existingAchievement) continue;

        // Check if threshold is met
        if (currentValue >= achievementDef.threshold) {
          const achievement = await this.awardAchievement(userId, achievementDef, metadata);
          if (achievement) {
            awardedAchievements.push(achievement);

            // Create notification
            await this.createAchievementNotification(userId, achievement);
          }
        }
      }

      return awardedAchievements;
    } catch (error) {
      console.error('Failed to check and award achievements:', error);
      return [];
    }
  }

  private getRelevantAchievements(
    activityType: string,
    currentValue: number
  ): typeof this.achievementDefinitions[keyof typeof this.achievementDefinitions][] {
    const relevant: typeof this.achievementDefinitions[keyof typeof this.achievementDefinitions][] = [];

    for (const achievement of Object.values(this.achievementDefinitions)) {
      let shouldCheck = false;

      switch (activityType) {
        case 'follower':
          shouldCheck = achievement.type === 'follower_milestone';
          break;
        case 'post':
          shouldCheck = achievement.type === 'post_milestone';
          break;
        case 'likes':
          shouldCheck = achievement.type === 'engagement_milestone' && achievement.id.includes('likes');
          break;
        case 'comments':
          shouldCheck = achievement.type === 'engagement_milestone' && achievement.id.includes('comments');
          break;
        case 'streak':
          shouldCheck = achievement.type === 'streak';
          break;
      }

      if (shouldCheck && currentValue >= achievement.threshold) {
        relevant.push(achievement);
      }
    }

    return relevant;
  }

  private async awardAchievement(
    userId: string,
    achievementDef: typeof this.achievementDefinitions[keyof typeof this.achievementDefinitions],
    metadata?: Record<string, any>
  ): Promise<Achievement | null> {
    try {
      const achievementData: Omit<Achievement, 'id'> = {
        userId,
        type: achievementDef.type,
        title: achievementDef.title,
        description: achievementDef.description,
        icon: achievementDef.icon,
        badge: achievementDef.badge,
        points: achievementDef.points,
        rarity: achievementDef.rarity,
        unlockedAt: new Date().toISOString(),
        isNew: true,
        metadata: metadata || {},
      };

      const achievementRef = await addDoc(collection(db, 'achievements'), achievementData);

      // Update user points
      await updateDoc(doc(db, 'users', userId), {
        totalPoints: increment(achievementDef.points),
        achievementsCount: increment(1),
      });

      return {
        id: achievementRef.id,
        ...achievementData,
      };
    } catch (error) {
      console.error('Failed to award achievement:', error);
      return null;
    }
  }

  private async createAchievementNotification(userId: string, achievement: Achievement): Promise<void> {
    try {
      await notificationService.createNotification(
        userId,
        'achievement',
        `🏆 Achievement Unlocked: ${achievement.title}`,
        achievement.description,
        {
          achievementId: achievement.id,
          achievementType: achievement.type,
          points: achievement.points,
          rarity: achievement.rarity,
        },
        {
          priority: 'high',
          category: 'achievement',
          actionUrl: `/achievements/${achievement.id}`,
          imageUrl: this.getBadgeImage(achievement.badge || 'default'),
        }
      );
    } catch (error) {
      console.error('Failed to create achievement notification:', error);
    }
  }

  // ==================== MILESTONE TRACKING ====================

  async checkMilestones(userId: string): Promise<Milestone[]> {
    try {
      const userStats = await this.getUserStats(userId);
      const milestones: Milestone[] = [];

      // Define milestone thresholds
      const milestoneThresholds = {
        followers: [10, 50, 100, 500, 1000, 5000],
        posts: [10, 50, 100, 500],
        likes: [10, 100, 500, 1000],
        comments: [5, 25, 50, 100],
        following: [10, 50, 100],
        engagement: [50, 200, 500, 1000],
      };

      // Check each milestone type
      for (const [type, thresholds] of Object.entries(milestoneThresholds)) {
        const currentValue = userStats[type as keyof typeof userStats] || 0;

        for (const threshold of thresholds) {
          if (currentValue >= threshold) {
            const existingMilestone = await this.getUserMilestone(userId, type, threshold);
            if (!existingMilestone) {
              const milestone = await this.createMilestone(userId, type, threshold, currentValue);
              if (milestone) {
                milestones.push(milestone);

                // Create milestone notification
                await this.createMilestoneNotification(userId, milestone);
              }
            }
          }
        }
      }

      return milestones;
    } catch (error) {
      console.error('Failed to check milestones:', error);
      return [];
    }
  }

  private async createMilestone(
    userId: string,
    type: string,
    threshold: number,
    currentValue: number
  ): Promise<Milestone | null> {
    try {
      const milestoneTitles = {
        followers: `Reached ${threshold} followers`,
        posts: `Published ${threshold} posts`,
        likes: `Received ${threshold} likes`,
        comments: `Got ${threshold} comments`,
        following: `Following ${threshold} users`,
        engagement: `Achieved ${threshold} engagements`,
      };

      const milestoneData: Omit<Milestone, 'id'> = {
        userId,
        type: type as Milestone['type'],
        threshold,
        currentValue,
        title: milestoneTitles[type as keyof typeof milestoneTitles] || `Reached ${threshold} ${type}`,
        description: `Congratulations on reaching ${threshold} ${type}!`,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        reward: {
          type: 'points',
          value: Math.floor(threshold / 10), // Points based on milestone size
        },
      };

      const milestoneRef = await addDoc(collection(db, 'milestones'), milestoneData);

      return {
        id: milestoneRef.id,
        ...milestoneData,
      };
    } catch (error) {
      console.error('Failed to create milestone:', error);
      return null;
    }
  }

  private async createMilestoneNotification(userId: string, milestone: Milestone): Promise<void> {
    try {
      await notificationService.createNotification(
        userId,
        'milestone',
        `🎯 Milestone Reached: ${milestone.title}`,
        milestone.description,
        {
          milestoneId: milestone.id,
          milestoneType: milestone.type,
          threshold: milestone.threshold,
          reward: milestone.reward,
        },
        {
          priority: 'high',
          category: 'achievement',
          actionUrl: `/profile/${userId}?tab=achievements`,
        }
      );
    } catch (error) {
      console.error('Failed to create milestone notification:', error);
    }
  }

  // ==================== STREAK TRACKING ====================

  async updatePostingStreak(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return;

      const userData = userDoc.data() as SocialUser;
      const lastPostDate = userData.lastPostDate;
      const currentStreak = userData.postingStreak || 0;

      if (!lastPostDate) {
        // First post
        await updateDoc(userRef, {
          lastPostDate: today,
          postingStreak: 1,
        });
      } else {
        const lastPost = new Date(lastPostDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastPost.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          const newStreak = currentStreak + 1;
          await updateDoc(userRef, {
            lastPostDate: today,
            postingStreak: newStreak,
          });

          // Check for streak achievements
          await this.checkAndAwardAchievements(userId, 'streak', newStreak);
        } else if (diffDays > 1) {
          // Streak broken
          await updateDoc(userRef, {
            lastPostDate: today,
            postingStreak: 1,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update posting streak:', error);
    }
  }

  // ==================== ACHIEVEMENT RETRIEVAL ====================

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const achievementsQuery = query(
        collection(db, 'achievements'),
        where('userId', '==', userId),
        orderBy('unlockedAt', 'desc')
      );

      const querySnapshot = await getDocs(achievementsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Achievement[];
    } catch (error) {
      console.error('Failed to get user achievements:', error);
      return [];
    }
  }

  async getUserAchievement(userId: string, achievementId: string): Promise<Achievement | null> {
    try {
      const achievementQuery = query(
        collection(db, 'achievements'),
        where('userId', '==', userId),
        where('achievementId', '==', achievementId)
      );

      const querySnapshot = await getDocs(achievementQuery);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Achievement;
    } catch (error) {
      console.error('Failed to get user achievement:', error);
      return null;
    }
  }

  async getUserMilestones(userId: string): Promise<Milestone[]> {
    try {
      const milestonesQuery = query(
        collection(db, 'milestones'),
        where('userId', '==', userId),
        orderBy('completedAt', 'desc')
      );

      const querySnapshot = await getDocs(milestonesQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Milestone[];
    } catch (error) {
      console.error('Failed to get user milestones:', error);
      return [];
    }
  }

  private async getUserMilestone(userId: string, type: string, threshold: number): Promise<Milestone | null> {
    try {
      const milestoneQuery = query(
        collection(db, 'milestones'),
        where('userId', '==', userId),
        where('type', '==', type),
        where('threshold', '==', threshold)
      );

      const querySnapshot = await getDocs(milestoneQuery);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Milestone;
    } catch (error) {
      console.error('Failed to get user milestone:', error);
      return null;
    }
  }

  private async getUserStats(userId: string): Promise<Record<string, number>> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return {};

      const userData = userDoc.data() as SocialUser;
      return {
        followers: userData.followersCount || 0,
        posts: userData.postsCount || 0,
        likes: userData.likesCount || 0,
        following: userData.followingCount || 0,
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return {};
    }
  }

  private getBadgeImage(badge: string): string {
    // Return URL to badge image
    return `/badges/${badge}.png`;
  }

  // ==================== ACHIEVEMENT ANALYTICS ====================

  async getAchievementStats(userId: string): Promise<{
    totalAchievements: number;
    totalPoints: number;
    rarityBreakdown: Record<Achievement['rarity'], number>;
    typeBreakdown: Record<Achievement['type'], number>;
    recentAchievements: Achievement[];
  }> {
    try {
      const achievements = await this.getUserAchievements(userId);

      const rarityBreakdown = achievements.reduce((acc, achievement) => {
        acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
        return acc;
      }, {} as Record<Achievement['rarity'], number>);

      const typeBreakdown = achievements.reduce((acc, achievement) => {
        acc[achievement.type] = (acc[achievement.type] || 0) + 1;
        return acc;
      }, {} as Record<Achievement['type'], number>);

      const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0);

      return {
        totalAchievements: achievements.length,
        totalPoints,
        rarityBreakdown,
        typeBreakdown,
        recentAchievements: achievements.slice(0, 5),
      };
    } catch (error) {
      console.error('Failed to get achievement stats:', error);
      return {
        totalAchievements: 0,
        totalPoints: 0,
        rarityBreakdown: {
          common: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
        },
        typeBreakdown: {
          follower_milestone: 0,
          post_milestone: 0,
          engagement_milestone: 0,
          streak: 0,
          special: 0,
        },
        recentAchievements: [],
      };
    }
  }
}

// Export singleton instance
export const achievementService = AchievementService.getInstance();