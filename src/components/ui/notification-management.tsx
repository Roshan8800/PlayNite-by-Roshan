'use client';

import React, { useState, useMemo } from 'react';
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Clock,
  Check,
  CheckCheck,
  Filter,
  Search,
  MoreHorizontal,
  Calendar,
  User,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import { Label } from './label';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
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
import { Checkbox } from './checkbox';
import { Alert, AlertDescription } from './alert';
import type { Notification as NotificationType, NotificationFilter } from '@/lib/types/social';

interface NotificationManagementProps {
  notifications: NotificationType[];
  onBulkAction: (action: string, notificationIds: string[], options?: any) => void;
  onNotificationClick: (notification: NotificationType) => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  isLoading?: boolean;
}

const priorityStyles = {
  low: 'border-l-blue-500',
  normal: 'border-l-gray-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const statusStyles = {
  read: 'opacity-60',
  unread: '',
  archived: 'opacity-40',
  snoozed: 'opacity-50',
};

export function NotificationManagement({
  notifications,
  onBulkAction,
  onNotificationClick,
  onMarkAsRead,
  onDeleteNotification,
  isLoading = false,
}: NotificationManagementProps) {
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [activeTab, setActiveTab] = useState('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeDuration, setSnoozeDuration] = useState('1h');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(n => (n as any).archived);
    } else if (activeTab === 'snoozed') {
      filtered = filtered.filter(n => (n as any).snoozed);
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

  const selectedCount = selectedNotifications.size;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const archivedCount = notifications.filter(n => (n as any).archived).length;
  const snoozedCount = notifications.filter(n => (n as any).snoozed).length;

  const handleSelectNotification = (id: string, isSelected: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (isSelected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedNotifications(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedCount === filteredNotifications.length) {
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string, options?: any) => {
    if (selectedCount > 0) {
      onBulkAction(action, Array.from(selectedNotifications), options);
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
    }
  };

  const handleSnooze = () => {
    const duration = parseSnoozeDuration(snoozeDuration);
    handleBulkAction('snooze', { snoozeUntil: duration });
    setSnoozeDialogOpen(false);
  };

  const parseSnoozeDuration = (duration: string): string => {
    const now = new Date();
    switch (duration) {
      case '30m':
        now.setMinutes(now.getMinutes() + 30);
        break;
      case '1h':
        now.setHours(now.getHours() + 1);
        break;
      case '4h':
        now.setHours(now.getHours() + 4);
        break;
      case '1d':
        now.setDate(now.getDate() + 1);
        break;
      case '1w':
        now.setDate(now.getDate() + 7);
        break;
      default:
        now.setHours(now.getHours() + 1);
    }
    return now.toISOString();
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organize and manage your notifications
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline">{notifications.length} total</Badge>
          <Badge variant="secondary">{unreadCount} unread</Badge>
          <Badge variant="outline">{archivedCount} archived</Badge>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="font-medium">
                  {selectedCount} notification{selectedCount > 1 ? 's' : ''} selected
                </span>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('mark_read')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Read
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('mark_unread')}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark Unread
                  </Button>

                  <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Snooze
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Snooze Notifications</DialogTitle>
                        <DialogDescription>
                          Temporarily hide selected notifications for a specified duration
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Snooze Duration</Label>
                          <Select value={snoozeDuration} onValueChange={setSnoozeDuration}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30m">30 minutes</SelectItem>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="4h">4 hours</SelectItem>
                              <SelectItem value="1d">1 day</SelectItem>
                              <SelectItem value="1w">1 week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSnooze}>
                          Snooze
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('archive')}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedNotifications(new Set());
                  setShowBulkActions(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedCount})</TabsTrigger>
          <TabsTrigger value="snoozed">Snoozed ({snoozedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedCount === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm font-medium">Select all visible</Label>
            </div>

            {activeTab === 'unread' && unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('mark_read', filteredNotifications.filter(n => !n.isRead).map(n => n.id))}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}

            {activeTab === 'archived' && archivedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('unarchive', filteredNotifications.filter(n => (n as any).archived).map(n => n.id))}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive all
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No notifications found
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filter.types || filter.priorities ?
                    'Try adjusting your search or filter criteria' :
                    "No notifications match the current tab"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <NotificationManagementCard
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
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual Notification Management Card
interface NotificationManagementCardProps {
  notification: NotificationType;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}

function NotificationManagementCard({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
  formatTimeAgo,
}: NotificationManagementCardProps) {
  const isArchived = (notification as any).archived;
  const isSnoozed = (notification as any).snoozed;
  const snoozeUntil = (notification as any).snoozeUntil;

  return (
    <Card
      className={`
        relative transition-all duration-200 cursor-pointer
        ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
        ${isArchived ? 'opacity-60' : ''}
        ${isSnoozed ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        hover:shadow-md ${priorityStyles[notification.priority]}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Status Indicators */}
          <div className="flex-shrink-0 flex flex-col space-y-1">
            {isArchived && (
              <Badge variant="outline" className="text-xs">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            )}
            {isSnoozed && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Snoozed
              </Badge>
            )}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
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

                  <Badge variant="outline" className="text-xs">
                    {notification.priority}
                  </Badge>

                  <Badge variant="secondary" className="text-xs">
                    {notification.category}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {notification.message}
                </p>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatTimeAgo(notification.createdAt)}</span>
                  {notification.readAt && (
                    <span>Read {formatTimeAgo(notification.readAt)}</span>
                  )}
                  {isSnoozed && snoozeUntil && (
                    <span>Until {new Date(snoozeUntil).toLocaleString()}</span>
                  )}
                  {notification.groupCount && notification.groupCount > 1 && (
                    <Badge variant="outline" className="text-xs">
                      +{notification.groupCount - 1} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.isRead && !isArchived && (
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

                    {!isArchived ? (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onBulkAction('archive', [notification.id]);
                      }}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onBulkAction('unarchive', [notification.id]);
                      }}>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Unarchive
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      // Snooze single notification
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
      </CardContent>
    </Card>
  );
}