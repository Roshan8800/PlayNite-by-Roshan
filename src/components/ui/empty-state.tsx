'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, Users, Video, MessageCircle, Bell, Image, Music, Heart, 
  Bookmark, Settings, Wifi, WifiOff, RefreshCw, Plus, TrendingUp, 
  Clock, Filter, X 
} from 'lucide-react';

export type EmptyStateType = 
  | 'no-content' | 'no-search-results' | 'no-notifications' | 'no-followers' 
  | 'no-following' | 'no-videos' | 'no-reels' | 'no-comments' | 'no-likes' 
  | 'no-bookmarks' | 'no-stories' | 'no-music' | 'no-images' | 'network-error' 
  | 'loading' | 'no-data' | 'custom';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: EmptyStateAction[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  customContent?: React.ReactNode;
  onRetry?: () => void;
  isLoading?: boolean;
}

const emptyStateConfig = {
  'no-content': {
    icon: <TrendingUp className="w-12 h-12 text-gray-400" />,
    title: 'No content yet',
    description: 'Be the first to share something amazing with the community.',
    defaultActions: [
      { label: 'Create Post', onClick: () => {}, icon: <Plus className="w-4 h-4" /> }
    ]
  },
  'no-search-results': {
    icon: <Search className="w-12 h-12 text-gray-400" />,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    defaultActions: [
      { label: 'Clear Filters', onClick: () => {}, icon: <X className="w-4 h-4" /> }
    ]
  },
  'no-notifications': {
    icon: <Bell className="w-12 h-12 text-gray-400" />,
    title: 'No notifications',
    description: 'You\'re all caught up! We\'ll notify you when something happens.',
    defaultActions: []
  },
  'no-followers': {
    icon: <Users className="w-12 h-12 text-gray-400" />,
    title: 'No followers yet',
    description: 'Share great content to start building your community.',
    defaultActions: [
      { label: 'Find People', onClick: () => {}, icon: <Search className="w-4 h-4" /> }
    ]
  },
  'no-following': {
    icon: <Users className="w-12 h-12 text-gray-400" />,
    title: 'Not following anyone',
    description: 'Follow people to see their content in your feed.',
    defaultActions: [
      { label: 'Discover', onClick: () => {}, icon: <TrendingUp className="w-4 h-4" /> }
    ]
  },
  'no-videos': {
    icon: <Video className="w-12 h-12 text-gray-400" />,
    title: 'No videos yet',
    description: 'Upload your first video to get started.',
    defaultActions: [
      { label: 'Upload Video', onClick: () => {}, icon: <Plus className="w-4 h-4" /> }
    ]
  },
  'no-reels': {
    icon: <Video className="w-12 h-12 text-gray-400" />,
    title: 'No reels yet',
    description: 'Create short, engaging videos to share with your audience.',
    defaultActions: [
      { label: 'Create Reel', onClick: () => {}, icon: <Plus className="w-4 h-4" /> }
    ]
  },
  'no-comments': {
    icon: <MessageCircle className="w-12 h-12 text-gray-400" />,
    title: 'No comments yet',
    description: 'Be the first to share your thoughts.',
    defaultActions: [
      { label: 'Add Comment', onClick: () => {}, icon: <MessageCircle className="w-4 h-4" /> }
    ]
  },
  'no-likes': {
    icon: <Heart className="w-12 h-12 text-gray-400" />,
    title: 'No likes yet',
    description: 'Content you\'ve liked will appear here.',
    defaultActions: []
  },
  'no-bookmarks': {
    icon: <Bookmark className="w-12 h-12 text-gray-400" />,
    title: 'No bookmarks',
    description: 'Save posts for later by tapping the bookmark icon.',
    defaultActions: [
      { label: 'Explore', onClick: () => {}, icon: <TrendingUp className="w-4 h-4" /> }
    ]
  },
  'no-stories': {
    icon: <Clock className="w-12 h-12 text-gray-400" />,
    title: 'No stories yet',
    description: 'Share moments from your day with quick stories.',
    defaultActions: [
      { label: 'Add Story', onClick: () => {}, icon: <Plus className="w-4 h-4" /> }
    ]
  },
  'no-music': {
    icon: <Music className="w-12 h-12 text-gray-400" />,
    title: 'No music found',
    description: 'Search for your favorite songs or artists.',
    defaultActions: [
      { label: 'Browse Music', onClick: () => {}, icon: <Music className="w-4 h-4" /> }
    ]
  },
  'no-images': {
    icon: <Image className="w-12 h-12 text-gray-400" />,
    title: 'No images found',
    description: 'Upload some images to get started.',
    defaultActions: [
      { label: 'Upload Images', onClick: () => {}, icon: <Plus className="w-4 h-4" /> }
    ]
  },
  'network-error': {
    icon: <WifiOff className="w-12 h-12 text-red-400" />,
    title: 'Connection problem',
    description: 'Please check your internet connection and try again.',
    defaultActions: [
      { label: 'Try Again', onClick: () => {}, icon: <RefreshCw className="w-4 h-4" />, variant: 'default' as const }
    ]
  },
  'loading': {
    icon: <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />,
    title: 'Loading...',
    description: 'Please wait while we fetch your content.',
    defaultActions: []
  },
  'no-data': {
    icon: <Settings className="w-12 h-12 text-gray-400" />,
    title: 'No data available',
    description: 'The data you\'re looking for isn\'t available right now.',
    defaultActions: [
      { label: 'Refresh', onClick: () => {}, icon: <RefreshCw className="w-4 h-4" /> }
    ]
  }
};

export function EmptyState({
  type,
  title,
  description,
  icon,
  actions = [],
  className = '',
  size = 'md',
  customContent,
  onRetry,
  isLoading = false
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  };

  if (type === 'custom') {
    if (customContent) {
      return (
        <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}>
          {customContent}
        </div>
      );
    }
    return null;
  }

  const config = emptyStateConfig[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;
  const displayActions = actions.length > 0 ? actions : config.defaultActions;

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} px-6`}>
        <div className="mb-4">
          {displayIcon}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {displayTitle}
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-sm">
          {displayDescription}
        </p>

        {displayActions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {displayActions.map((action: EmptyStateAction, index: number) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  action.icon
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {onRetry && type === 'network-error' && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isLoading}
            className="flex items-center gap-2 mt-4"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            {isLoading ? 'Retrying...' : 'Check Connection'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized empty state components for common use cases
export function NoContentEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      type="no-content"
      actions={onCreate ? [{ label: 'Create Post', onClick: onCreate, icon: <Plus className="w-4 h-4" /> }] : []}
    />
  );
}

export function NoSearchResultsEmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      type="no-search-results"
      actions={onClearFilters ? [{ label: 'Clear Filters', onClick: onClearFilters, icon: <X className="w-4 h-4" /> }] : []}
    />
  );
}

export function NetworkErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      type="network-error"
      onRetry={onRetry}
    />
  );
}

export function LoadingEmptyState() {
  return <EmptyState type="loading" />;
}
