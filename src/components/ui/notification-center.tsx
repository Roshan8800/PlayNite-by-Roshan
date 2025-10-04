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
  MoreHorizontal,
  Archive,
  Clock,
  AlertCircle,
  Info,
  Trophy,
  Users,
  MessageSquare,
  Heart,
  Share,
  Tag,
  AtSign,
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import type { Notification as NotificationType, NotificationFilter } from '@/lib/types/social';

interface NotificationCenterProps {
  notifications: NotificationType[];
  onNotificationClick: (notification: NotificationType) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onBulkAction: (action: string, ids: string[]) => void;
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
  low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  normal: 'text-gray-600 bg-gray-50 dark:bg-gray-950/20',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
  urgent: 'text-red-600 bg-red-50 dark:bg-red-950/20',
};

const typeIcons = {
  like: Heart,
  comment: MessageSquare,
  follow: Users,
  friend_request: Users,
  mention: AtSign,
  tag: Tag,
  share: Share,
  system: Settings,
  achievement: Trophy,
  milestone: Trophy,
};

export function NotificationCenter({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onBulkAction,
  onSettingsClick,
  isLoading = false,
}: NotificationCenterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (activeTab === 'mentions') {
      filtered = filtered.filter(n => n.type === 'mention' || n.type === 'tag');
    } else if (activeTab === 'social') {
      filtered = filtered.filter(n => ['like', 'comment', 'follow', 'friend_request'].includes(n.type));
    } else if (activeTab === 'achievements') {
      filtered = filtered.filter(n => ['achievement', 'milestone'].includes(n.type));
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (filter.types?.length) {
      filtered = filtered.filter(n => filter.types!.includes(n.type));
    }

    // Apply priority filter
    if (filter.priorities?.length) {
      filtered = filtered.filter(n => filter.priorities!.includes(n.priority));
    }

    return filtered;
  }, [notifications, activeTab, searchTerm, filter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const selectedCount = selectedNotifications.size;

  const handleSelectNotification = (id: string, isSelected: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (isSelected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCount === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedCount > 0) {
      onBulkAction(action, Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return notificationDate.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stay updated with your social activity
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Badge variant="destructive">
              {unreadCount} unread
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={onSettingsClick}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={filter.priorities?.[0] || 'all'}
            onValueChange={(value) =>
              setFilter(prev => ({
                ...prev,
                priorities: value === 'all' ? undefined : [value as any]
              }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.types?.[0] || 'all'}
            onValueChange={(value) =>
              setFilter(prev => ({
                ...prev,
                types: value === 'all' ? undefined : [value as any]
              }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="like">Likes</SelectItem>
              <SelectItem value="comment">Comments</SelectItem>
              <SelectItem value="follow">Follows</SelectItem>
              <SelectItem value="mention">Mentions</SelectItem>
              <SelectItem value="achievement">Achievements</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
              <span className="text-sm font-medium">
                {selectedCount} notification{selectedCount > 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('mark_read')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchTerm || filter.types || filter.priorities ?
                    'No notifications match your filters' :
                    activeTab === 'unread' ? 'No unread notifications' :
                    'No notifications yet'
                  }
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filter.types || filter.priorities ?
                    'Try adjusting your search or filter criteria' :
                    "We'll notify you when something happens"
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Select All / Mark All Read */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCount === filteredNotifications.length && filteredNotifications.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Select all</span>
                  </label>

                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onMarkAllAsRead}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Mark all as read
                    </Button>
                  )}
                </div>

                {/* Notifications */}
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onSelect={(selected) => handleSelectNotification(notification.id, selected)}
                    onClick={() => onNotificationClick(notification)}
                    onMarkAsRead={() => onMarkAsRead(notification.id)}
                    onDelete={() => onDeleteNotification(notification.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual Notification Card Component
interface NotificationCardProps {
  notification: NotificationType;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}

function NotificationCard({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
  formatTimeAgo,
}: NotificationCardProps) {
  const TypeIcon = typeIcons[notification.type] || Bell;

  return (
    <div
      className={`
        group relative p-4 border rounded-lg transition-all duration-200 cursor-pointer
        ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
        ${priorityStyles[notification.priority]}
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {/* Selection Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${priorityColors[notification.priority]}
        `}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`
                  text-sm font-semibold truncate
                  ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {notification.title}
                </h4>

                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}

                <Badge variant="outline" className="text-xs">
                  {notification.priority}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatTimeAgo(notification.createdAt)}</span>
                <Badge variant="secondary" className="text-xs">
                  {notification.category}
                </Badge>
                {notification.groupCount && notification.groupCount > 1 && (
                  <Badge variant="outline" className="text-xs">
                    +{notification.groupCount - 1} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    // Snooze functionality
                  }}>
                    <Clock className="h-4 w-4 mr-2" />
                    Snooze
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}