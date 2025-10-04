'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Filter,
  Search,
  X,
  Heart,
  MessageSquare,
  Users,
  Trophy,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import type { Notification as NotificationType } from '@/lib/types/social';

interface MobileNotificationCenterProps {
  notifications: NotificationType[];
  unreadCount: number;
  onNotificationClick: (notification: NotificationType) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onSettingsClick: () => void;
  isLoading?: boolean;
}

const priorityStyles = {
  low: 'border-l-blue-500',
  normal: 'border-l-gray-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const priorityColors = {
  low: 'text-blue-600 bg-blue-50',
  normal: 'text-gray-600 bg-gray-50',
  high: 'text-orange-600 bg-orange-50',
  urgent: 'text-red-600 bg-red-50',
};

const typeIcons = {
  like: Heart,
  comment: MessageSquare,
  follow: Users,
  friend_request: Users,
  mention: '@',
  tag: '🏷️',
  share: '📤',
  system: Settings,
  achievement: Trophy,
  milestone: Trophy,
};

export function MobileNotificationCenter({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onSettingsClick,
  isLoading = false,
}: MobileNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter notifications for mobile view
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (activeTab === 'mentions') {
      filtered = filtered.filter(n => n.type === 'mention' || n.type === 'tag');
    } else if (activeTab === 'social') {
      filtered = filtered.filter(n => ['like', 'comment', 'follow', 'friend_request'].includes(n.type));
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [notifications, activeTab, searchTerm]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const handleNotificationClick = (notification: NotificationType) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <SheetTitle className="text-lg font-semibold">Notifications</SheetTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Read all
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-2">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
                <TabsTrigger value="mentions" className="text-xs">@</TabsTrigger>
                <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="flex-1 mt-0">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Bell className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {searchTerm ? 'No results found' : 'No notifications'}
                    </h3>
                    <p className="text-xs text-gray-500 text-center">
                      {searchTerm ?
                        'Try adjusting your search terms' :
                        "We'll notify you when something happens"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredNotifications.map((notification) => (
                      <MobileNotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkAsRead={() => onMarkAsRead(notification.id)}
                        onDelete={() => onDeleteNotification(notification.id)}
                        formatTimeAgo={formatTimeAgo}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile Notification Card Component
interface MobileNotificationCardProps {
  notification: NotificationType;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}

function MobileNotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  formatTimeAgo,
}: MobileNotificationCardProps) {
  const getTypeIcon = (type: NotificationType['type']) => {
    const icon = typeIcons[type];
    return typeof icon === 'string' ? icon : React.createElement(icon as any, { className: "w-4 h-4" });
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-200
        ${!notification.isRead ? 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200' : 'bg-white dark:bg-gray-900 border-gray-200'}
        active:scale-95 ${priorityStyles[notification.priority]}
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
          ${priorityColors[notification.priority]}
        `}>
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`
                text-sm font-medium leading-tight truncate pr-2
                ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}
              `}>
                {notification.title}
              </h4>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {notification.category}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(notification.createdAt)}
                  </span>
                </div>

                {/* Priority indicator */}
                <div className={`
                  w-2 h-2 rounded-full
                  ${notification.priority === 'urgent' ? 'bg-red-500' :
                    notification.priority === 'high' ? 'bg-orange-500' :
                    notification.priority === 'normal' ? 'bg-gray-500' :
                    'bg-blue-500'}
                `} />
              </div>
            </div>
          </div>

          {/* Group indicator */}
          {notification.groupCount && notification.groupCount > 1 && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                +{notification.groupCount - 1} more
              </Badge>
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
        )}
      </div>

      {/* Swipe Actions (for future implementation) */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="h-7 w-7 p-0 bg-green-100 hover:bg-green-200 text-green-700"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 bg-red-100 hover:bg-red-200 text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact Notification Badge for Mobile Header
export function MobileNotificationBadge({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick: () => void;
}) {
  if (unreadCount === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative h-8 w-8 rounded-full bg-red-100 hover:bg-red-200"
    >
      <Bell className="h-4 w-4 text-red-600" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </Badge>
    </Button>
  );
}