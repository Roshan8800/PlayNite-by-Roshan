/**
 * @fileOverview Smart navigation component
 *
 * Intelligent navigation component that adapts to user behavior,
 * provides contextual recommendations, and integrates with analytics.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Film,
  History,
  Image as ImageIcon,
  Book,
  ShieldAlert,
  BadgePercent,
  Info,
  Settings,
  User,
  TrendingUp,
  Clock,
  Zap,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNavigation } from '../hooks/useNavigation';
import { ContextualRecommendation } from '../types';

interface SmartNavigationProps {
  className?: string;
  showRecommendations?: boolean;
  showPerformance?: boolean;
  compact?: boolean;
}

const menuItems = [
  { href: '/home', label: 'Home', icon: Home, category: 'main' },
  { href: '/reels', label: 'Reels', icon: Film, category: 'main' },
  { href: '/stories', label: 'Stories', icon: History, category: 'main' },
  { href: '/images', label: 'Images', icon: ImageIcon, category: 'main' },
];

const contentItems = [
  { href: '/study', label: 'Study', icon: Book, category: 'content' },
  { href: '/18plus', label: '18+ Content', icon: ShieldAlert, category: 'content' },
];

const secondaryItems = [
  { href: '/premium', label: 'Premium', icon: BadgePercent, category: 'account' },
  { href: '/about', label: 'About', icon: Info, category: 'info' },
  { href: '/settings', label: 'Settings', icon: Settings, category: 'account' },
];

export function SmartNavigation({
  className = '',
  showRecommendations = true,
  showPerformance = false,
  compact = false
}: SmartNavigationProps) {
  const pathname = usePathname();
  const [recommendations, setRecommendations] = useState<ContextualRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentRoute,
    context,
    preferences,
    analytics,
    getRecommendedRoutes,
    getPerformanceMetrics,
    isRouteActive,
    navigate
  } = useNavigation({
    enableTracking: true,
    enablePrefetching: true,
    enableContextualNavigation: true
  });

  // Load recommendations on mount and route change
  useEffect(() => {
    loadRecommendations();
  }, [currentRoute, context.userId]);

  const loadRecommendations = async () => {
    if (!showRecommendations) return;

    setIsLoading(true);
    try {
      // Get AI-powered recommendations based on context
      const recommendedRoutes = getRecommendedRoutes();

      const contextualRecommendations: ContextualRecommendation[] = recommendedRoutes.map((route, index) => ({
        recommendationId: `rec_${Date.now()}_${index}`,
        type: 'route',
        title: `Visit ${route.replace('/', '').replace('-', ' ')}`,
        description: `Based on your ${context.timeOfDay} activity pattern`,
        route,
        confidence: 0.8 - (index * 0.1), // Decreasing confidence
        relevance: 0.9 - (index * 0.05),
        contextTriggers: [context.timeOfDay, context.deviceType],
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }));

      setRecommendations(contextualRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = async (route: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      await navigate(route, {
        metadata: {
          source: 'SmartNavigation',
          recommendation: recommendations.some(r => r.route === route)
        }
      });
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const performanceMetrics = getPerformanceMetrics();

  const renderMenuItem = (item: any, index: number) => {
    const isActive = isRouteActive(item.href);
    const Icon = item.icon;

    return (
      <div
        key={item.href}
        className="animate-in slide-in-from-left-5 fade-in"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <Link href={item.href} onClick={(e) => handleNavigate(item.href, e)}>
          <Button
            variant={isActive ? "default" : "ghost"}
            className={`w-full justify-start gap-3 h-12 transition-all duration-200 ${
              isActive ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            <Icon className="h-5 w-5" />
            {!compact && <span className="flex-1 text-left">{item.label}</span>}

            {/* Show engagement indicators for active routes */}
            {isActive && analytics?.metrics && (
              <div className="flex items-center gap-1">
                {analytics.metrics.totalNavigations > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    Hot
                  </Badge>
                )}
              </div>
            )}
          </Button>
        </Link>
      </div>
    );
  };

  const renderRecommendation = (recommendation: ContextualRecommendation, index: number) => (
    <div
      key={recommendation.recommendationId}
      className="animate-in slide-in-from-bottom-5 fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Card className="mb-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleNavigate(recommendation.route!)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{recommendation.title}</p>
                <p className="text-xs text-muted-foreground">{recommendation.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {Math.round(recommendation.confidence * 100)}%
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Smart Navigation</h2>
        </div>

        {/* Current context indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              context.deviceType === 'mobile' ? 'bg-blue-500' :
              context.deviceType === 'tablet' ? 'bg-green-500' : 'bg-purple-500'
            }`} />
            <span className="capitalize">{context.deviceType}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span className="capitalize">{context.timeOfDay}</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-4 space-y-6">
        {/* Primary Menu */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Main
          </h3>
          <div className="space-y-1">
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </div>

        {/* Content Sections */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Content
          </h3>
          <div className="space-y-1">
            {contentItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </div>

        {/* Account & Settings */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Account
          </h3>
          <div className="space-y-1">
            {secondaryItems.map((item, index) => renderMenuItem(item, index))}
          </div>
        </div>

        {/* Smart Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recommended for You
              </h3>
            </div>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, index) => renderRecommendation(rec, index))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {showPerformance && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Performance
            </h3>
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Load Time</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(performanceMetrics.averageLoadTime)}ms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Cache Hit</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(performanceMetrics.cacheHitRate * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v1.0.0</span>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isLoading ? 'Loading...' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmartNavigation;