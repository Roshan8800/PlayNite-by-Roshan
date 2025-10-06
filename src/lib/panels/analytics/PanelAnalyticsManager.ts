import {
  PanelType,
  PanelAnalytics,
  PanelAction,
  PerformanceMetrics,
  UserRole,
  Permission
} from '../types';
import { panelManager } from '../core/PanelManager';

/**
 * PanelAnalyticsManager
 * Handles panel usage tracking, performance monitoring, and optimization insights
 */
export class PanelAnalyticsManager {
  private analyticsData: Map<string, PanelAnalytics> = new Map();
  private performanceMetrics: Map<PanelType, PerformanceMetrics> = new Map();
  private userBehaviorProfiles: Map<string, UserBehaviorProfile> = new Map();
  private optimizationRecommendations: OptimizationRecommendation[] = [];

  /**
   * Track panel session analytics
   */
  trackPanelSession(analytics: PanelAnalytics): void {
    const sessionKey = `${analytics.userId}_${analytics.panelType}_${analytics.sessionId}`;
    this.analyticsData.set(sessionKey, analytics);

    // Update performance metrics
    this.updatePerformanceMetrics(analytics.panelType, analytics.performanceMetrics);

    // Update user behavior profile
    this.updateUserBehaviorProfile(analytics);

    // Generate optimization recommendations
    this.generateOptimizationRecommendations(analytics);
  }

  /**
   * Get panel performance metrics
   */
  getPanelPerformanceMetrics(panelType: PanelType): PerformanceMetrics | null {
    return this.performanceMetrics.get(panelType) || null;
  }

  /**
   * Get user behavior profile
   */
  getUserBehaviorProfile(userId: string): UserBehaviorProfile | null {
    return this.userBehaviorProfiles.get(userId) || null;
  }

  /**
   * Get panel usage insights
   */
  getPanelUsageInsights(panelType?: PanelType, timeRange?: { start: Date; end: Date }): PanelUsageInsights {
    const relevantAnalytics = this.getRelevantAnalytics(panelType, timeRange);

    if (relevantAnalytics.length === 0) {
      return this.getEmptyInsights();
    }

    const totalSessions = relevantAnalytics.length;
    const uniqueUsers = new Set(relevantAnalytics.map(a => a.userId)).size;

    // Calculate average session duration
    const completedSessions = relevantAnalytics.filter(a => a.endTime);
    const totalDuration = completedSessions.reduce((sum, a) => {
      return sum + (a.endTime!.getTime() - a.startTime.getTime());
    }, 0);
    const avgSessionDuration = completedSessions.length > 0
      ? totalDuration / completedSessions.length
      : 0;

    // Analyze user actions
    const actionCounts = this.analyzeUserActions(relevantAnalytics);
    const mostCommonActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(relevantAnalytics);

    // Identify peak usage times
    const peakUsageTimes = this.identifyPeakUsageTimes(relevantAnalytics);

    // Performance analysis
    const avgLoadTime = relevantAnalytics.reduce((sum, a) => sum + a.performanceMetrics.loadTime, 0) / relevantAnalytics.length;
    const avgInteractionLatency = relevantAnalytics.reduce((sum, a) => sum + a.performanceMetrics.interactionLatency, 0) / relevantAnalytics.length;
    const avgErrorRate = relevantAnalytics.reduce((sum, a) => sum + a.performanceMetrics.errorRate, 0) / relevantAnalytics.length;
    const avgUserSatisfaction = relevantAnalytics.reduce((sum, a) => sum + (a.performanceMetrics.userSatisfaction ?? 0), 0) / relevantAnalytics.length;

    return {
      totalSessions,
      uniqueUsers,
      avgSessionDuration,
      mostCommonActions,
      engagementScore,
      peakUsageTimes,
      performanceAnalysis: {
        avgLoadTime,
        avgInteractionLatency,
        errorRate: avgErrorRate,
        userSatisfaction: avgUserSatisfaction
      },
      recommendations: this.generateUsageRecommendations(relevantAnalytics)
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(panelType?: PanelType): OptimizationRecommendation[] {
    if (panelType) {
      return this.optimizationRecommendations.filter(r => r.panelType === panelType);
    }
    return this.optimizationRecommendations;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(panelType: PanelType, timeRange: { start: Date; end: Date }): PerformanceReport {
    const analytics = this.getRelevantAnalytics(panelType, timeRange);

    if (analytics.length === 0) {
      return this.getEmptyPerformanceReport();
    }

    const avgLoadTime = analytics.reduce((sum, a) => sum + a.performanceMetrics.loadTime, 0) / analytics.length;
    const avgInteractionLatency = analytics.reduce((sum, a) => sum + a.performanceMetrics.interactionLatency, 0) / analytics.length;
    const avgErrorRate = analytics.reduce((sum, a) => sum + a.performanceMetrics.errorRate, 0) / analytics.length;
    const avgUserSatisfaction = analytics.reduce((sum, a) => sum + (a.performanceMetrics.userSatisfaction ?? 0), 0) / analytics.length;

    // Performance trends
    const performanceTrends = this.calculatePerformanceTrends(analytics);

    // Bottleneck identification
    const bottlenecks = this.identifyPerformanceBottlenecks(analytics);

    // Optimization suggestions
    const optimizationSuggestions = this.generatePerformanceOptimizations(panelType, {
      loadTime: avgLoadTime,
      interactionLatency: avgInteractionLatency,
      errorRate: avgErrorRate,
      userSatisfaction: avgUserSatisfaction
    });

    return {
      panelType,
      timeRange,
      metrics: {
        loadTime: avgLoadTime,
        interactionLatency: avgInteractionLatency,
        errorRate: avgErrorRate,
        userSatisfaction: avgUserSatisfaction
      },
      trends: performanceTrends as PerformanceTrend[],
      bottlenecks,
      optimizationSuggestions,
      generatedAt: new Date()
    };
  }

  /**
   * Track user behavior patterns
   */
  private updateUserBehaviorProfile(analytics: PanelAnalytics): void {
    const userId = analytics.userId;
    const existingProfile = this.userBehaviorProfiles.get(userId);

    const sessionDuration = analytics.endTime
      ? analytics.endTime.getTime() - analytics.startTime.getTime()
      : 0;

    const actionCount = analytics.actions.length;
    const engagementLevel = this.calculateEngagementLevel(sessionDuration, actionCount);

    if (existingProfile) {
      // Update existing profile
      existingProfile.totalSessions += 1;
      existingProfile.totalSessionTime += sessionDuration;
      existingProfile.totalActions += actionCount;
      existingProfile.avgEngagementLevel = (existingProfile.avgEngagementLevel + engagementLevel) / 2;
      existingProfile.lastActivity = new Date();
      existingProfile.preferredPanels.add(analytics.panelType);

      // Update action preferences
      analytics.actions.forEach(action => {
        existingProfile.actionPreferences.set(action.action,
          (existingProfile.actionPreferences.get(action.action) || 0) + 1
        );
      });
    } else {
      // Create new profile
      const profile: UserBehaviorProfile = {
        userId,
        totalSessions: 1,
        totalSessionTime: sessionDuration,
        totalActions: actionCount,
        avgEngagementLevel: engagementLevel,
        preferredPanels: new Set([analytics.panelType]),
        actionPreferences: new Map(),
        firstSeen: new Date(),
        lastActivity: new Date(),
        behaviorPatterns: []
      };

      // Initialize action preferences
      analytics.actions.forEach(action => {
        profile.actionPreferences.set(action.action, 1);
      });

      this.userBehaviorProfiles.set(userId, profile);
    }
  }

  /**
   * Update performance metrics for a panel type
   */
  private updatePerformanceMetrics(panelType: PanelType, metrics: PerformanceMetrics): void {
    const existingMetrics = this.performanceMetrics.get(panelType);

    if (existingMetrics) {
      // Update with weighted average
      const weight = 0.3; // Weight for new data
      existingMetrics.loadTime = (existingMetrics.loadTime * (1 - weight)) + (metrics.loadTime * weight);
      existingMetrics.interactionLatency = (existingMetrics.interactionLatency * (1 - weight)) + (metrics.interactionLatency * weight);
      existingMetrics.errorRate = (existingMetrics.errorRate * (1 - weight)) + (metrics.errorRate * weight);
      existingMetrics.userSatisfaction = ((existingMetrics.userSatisfaction ?? 0) * (1 - weight)) + ((metrics.userSatisfaction ?? 0) * weight);
    } else {
      this.performanceMetrics.set(panelType, { ...metrics });
    }
  }

  /**
   * Generate optimization recommendations based on analytics
   */
  private generateOptimizationRecommendations(analytics: PanelAnalytics): void {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance-based recommendations
    if (analytics.performanceMetrics.loadTime > 3000) { // Slower than 3 seconds
      recommendations.push({
        id: `perf_${analytics.panelType}_${Date.now()}`,
        panelType: analytics.panelType,
        type: 'PERFORMANCE',
        priority: 'HIGH',
        title: 'High Load Time Detected',
        description: `Average load time for ${analytics.panelType} is ${Math.round(analytics.performanceMetrics.loadTime)}ms. Consider optimizing component loading.`,
        impact: 'User experience and engagement',
        effort: 'MEDIUM',
        potentialImprovement: 'Reduce load time by 40-60%',
        timestamp: new Date()
      });
    }

    // Engagement-based recommendations
    if ((analytics.performanceMetrics.userSatisfaction ?? 0) < 70) {
      recommendations.push({
        id: `engage_${analytics.panelType}_${Date.now()}`,
        panelType: analytics.panelType,
        type: 'ENGAGEMENT',
        priority: 'MEDIUM',
        title: 'Low User Satisfaction',
        description: `User satisfaction for ${analytics.panelType} is below acceptable levels. Consider UI/UX improvements.`,
        impact: 'User retention and satisfaction',
        effort: 'HIGH',
        potentialImprovement: 'Increase satisfaction by 25-35%',
        timestamp: new Date()
      });
    }

    // Error rate recommendations
    if (analytics.performanceMetrics.errorRate > 0.05) { // More than 5% error rate
      recommendations.push({
        id: `error_${analytics.panelType}_${Date.now()}`,
        panelType: analytics.panelType,
        type: 'RELIABILITY',
        priority: 'HIGH',
        title: 'High Error Rate',
        description: `Error rate for ${analytics.panelType} is ${Math.round(analytics.performanceMetrics.errorRate * 100)}%. Investigate and fix error sources.`,
        impact: 'System reliability and user trust',
        effort: 'MEDIUM',
        potentialImprovement: 'Reduce errors by 60-80%',
        timestamp: new Date()
      });
    }

    this.optimizationRecommendations.push(...recommendations);

    // Keep only recent recommendations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.optimizationRecommendations = this.optimizationRecommendations.filter(
      r => r.timestamp > thirtyDaysAgo
    );
  }

  /**
   * Helper methods
   */
  private getRelevantAnalytics(panelType?: PanelType, timeRange?: { start: Date; end: Date }): PanelAnalytics[] {
    let analytics = Array.from(this.analyticsData.values());

    if (panelType) {
      analytics = analytics.filter(a => a.panelType === panelType);
    }

    if (timeRange) {
      analytics = analytics.filter(a =>
        a.startTime >= timeRange.start &&
        (!a.endTime || a.endTime <= timeRange.end)
      );
    }

    return analytics;
  }

  private getEmptyInsights(): PanelUsageInsights {
    return {
      totalSessions: 0,
      uniqueUsers: 0,
      avgSessionDuration: 0,
      mostCommonActions: [],
      engagementScore: 0,
      peakUsageTimes: [],
      performanceAnalysis: {
        avgLoadTime: 0,
        avgInteractionLatency: 0,
        errorRate: 0,
        userSatisfaction: 0
      },
      recommendations: []
    };
  }

  private analyzeUserActions(analytics: PanelAnalytics[]): Map<string, number> {
    const actionCounts = new Map<string, number>();

    analytics.forEach(a => {
      a.actions.forEach(action => {
        actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
      });
    });

    return actionCounts;
  }

  private calculateEngagementScore(analytics: PanelAnalytics[]): number {
    if (analytics.length === 0) return 0;

    const totalScore = analytics.reduce((sum, a) => {
      const sessionDuration = a.endTime ? a.endTime.getTime() - a.startTime.getTime() : 0;
      const actionScore = Math.min(a.actions.length * 10, 100);
      const durationScore = Math.min(sessionDuration / 60000 * 5, 100); // 5 points per minute, max 100
      return sum + (actionScore + durationScore) / 2;
    }, 0);

    return Math.round(totalScore / analytics.length);
  }

  private identifyPeakUsageTimes(analytics: PanelAnalytics[]): Array<{ hour: number; count: number }> {
    const hourCounts = new Map<number, number>();

    analytics.forEach(a => {
      const hour = a.startTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private analyzePerformanceTrends(analytics: PanelAnalytics[]): Array<{ date: string; trend: string }> {
    // Group analytics by day and calculate trends
    const dailyMetrics = new Map<string, PerformanceMetrics>();

    analytics.forEach(a => {
      const dayKey = a.startTime.toISOString().split('T')[0];
      const existing = dailyMetrics.get(dayKey);

      if (existing) {
        // Average the metrics
        existing.loadTime = (existing.loadTime + a.performanceMetrics.loadTime) / 2;
        existing.interactionLatency = (existing.interactionLatency + a.performanceMetrics.interactionLatency) / 2;
        existing.errorRate = (existing.errorRate + a.performanceMetrics.errorRate) / 2;
        existing.userSatisfaction = ((existing.userSatisfaction ?? 0) + (a.performanceMetrics.userSatisfaction ?? 0)) / 2;
      } else {
        dailyMetrics.set(dayKey, { ...a.performanceMetrics });
      }
    });

    // Calculate trends (simplified)
    const sortedDays = Array.from(dailyMetrics.entries()).sort();

    return sortedDays.map(([day, metrics], index) => ({
      date: day,
      trend: index > 0 ? this.calculateTrendDirection(sortedDays[index - 1][1], metrics) : 'stable' as const
    }));
  }

  private calculateTrendDirection(previous: PerformanceMetrics, current: PerformanceMetrics): 'improving' | 'degrading' | 'stable' {
    const loadTimeChange = (current.loadTime - previous.loadTime) / previous.loadTime;
    const errorRateChange = (current.errorRate - previous.errorRate) / Math.max(previous.errorRate, 0.001);

    if (Math.abs(loadTimeChange) > 0.1 || Math.abs(errorRateChange) > 0.1) {
      return loadTimeChange > 0 || errorRateChange > 0 ? 'degrading' : 'improving';
    }

    return 'stable';
  }

  private calculateEngagementLevel(sessionDuration: number, actionCount: number): number {
    const durationScore = Math.min(sessionDuration / 60000 * 20, 100); // 20 points per minute
    const actionScore = Math.min(actionCount * 15, 100); // 15 points per action
    return Math.round((durationScore + actionScore) / 2);
  }

  private generateUsageRecommendations(analytics: PanelAnalytics[]): string[] {
    const recommendations: string[] = [];

    if (analytics.length < 10) {
      recommendations.push('Increase user engagement by improving panel discoverability');
    }

    const avgActions = analytics.reduce((sum, a) => sum + a.actions.length, 0) / analytics.length;
    if (avgActions < 3) {
      recommendations.push('Add more interactive elements to increase user engagement');
    }

    const avgSatisfaction = analytics.reduce((sum, a) => sum + (a.performanceMetrics.userSatisfaction ?? 0), 0) / analytics.length;
    if (avgSatisfaction < 70) {
      recommendations.push('Improve user experience to increase satisfaction scores');
    }

    return recommendations;
  }

  private calculatePerformanceTrends(analytics: PanelAnalytics[]): Array<{ date: string; trend: string }> {
    // Simplified trend calculation
    return [];
  }

  private identifyPerformanceBottlenecks(analytics: PanelAnalytics[]): string[] {
    const bottlenecks: string[] = [];

    const avgLoadTime = analytics.reduce((sum, a) => sum + a.performanceMetrics.loadTime, 0) / analytics.length;
    if (avgLoadTime > 3000) {
      bottlenecks.push('Slow initial page load');
    }

    const avgInteractionLatency = analytics.reduce((sum, a) => sum + a.performanceMetrics.interactionLatency, 0) / analytics.length;
    if (avgInteractionLatency > 500) {
      bottlenecks.push('High interaction response time');
    }

    const avgErrorRate = analytics.reduce((sum, a) => sum + a.performanceMetrics.errorRate, 0) / analytics.length;
    if (avgErrorRate > 0.05) {
      bottlenecks.push('Frequent errors during usage');
    }

    return bottlenecks;
  }

  private generatePerformanceOptimizations(panelType: PanelType, metrics: PerformanceMetrics): string[] {
    const optimizations: string[] = [];

    if (metrics.loadTime > 3000) {
      optimizations.push('Implement code splitting and lazy loading for faster initial load');
      optimizations.push('Optimize bundle size by removing unused dependencies');
    }

    if (metrics.interactionLatency > 500) {
      optimizations.push('Optimize event handlers and reduce DOM manipulation');
      optimizations.push('Implement debouncing for frequent user interactions');
    }

    if (metrics.errorRate > 0.05) {
      optimizations.push('Add proper error boundaries and fallback states');
      optimizations.push('Implement retry mechanisms for failed operations');
    }

    if ((metrics.userSatisfaction ?? 0) < 70) {
      optimizations.push('Simplify user interface and reduce cognitive load');
      optimizations.push('Add contextual help and onboarding flows');
    }

    return optimizations;
  }

  private getEmptyPerformanceReport(): PerformanceReport {
    return {
      panelType: PanelType.ADMIN_DASHBOARD,
      timeRange: { start: new Date(), end: new Date() },
      metrics: {
        loadTime: 0,
        interactionLatency: 0,
        errorRate: 0,
        userSatisfaction: 0
      },
      trends: [],
      bottlenecks: [],
      optimizationSuggestions: [],
      generatedAt: new Date()
    };
  }
}

/**
 * Supporting interfaces and types
 */
interface UserBehaviorProfile {
  userId: string;
  totalSessions: number;
  totalSessionTime: number;
  totalActions: number;
  avgEngagementLevel: number;
  preferredPanels: Set<PanelType>;
  actionPreferences: Map<string, number>;
  firstSeen: Date;
  lastActivity: Date;
  behaviorPatterns: string[];
}

interface PanelUsageInsights {
  totalSessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  mostCommonActions: Array<{ action: string; count: number }>;
  engagementScore: number;
  peakUsageTimes: Array<{ hour: number; count: number }>;
  performanceAnalysis: {
    avgLoadTime: number;
    avgInteractionLatency: number;
    errorRate: number;
    userSatisfaction: number;
  };
  recommendations: string[];
}

interface PerformanceTrend {
  date: string;
  trend: 'improving' | 'degrading' | 'stable';
}

interface OptimizationRecommendation {
  id: string;
  panelType: PanelType;
  type: 'PERFORMANCE' | 'ENGAGEMENT' | 'RELIABILITY' | 'USABILITY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialImprovement: string;
  timestamp: Date;
}

interface PerformanceReport {
  panelType: PanelType;
  timeRange: { start: Date; end: Date };
  metrics: PerformanceMetrics;
  trends: PerformanceTrend[];
  bottlenecks: string[];
  optimizationSuggestions: string[];
  generatedAt: Date;
}

// Singleton instance
export const panelAnalyticsManager = new PanelAnalyticsManager();