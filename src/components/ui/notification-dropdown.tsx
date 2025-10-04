'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Settings, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import type { Notification as NotificationType } from '@/lib/types/social';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface NotificationDropdownProps {
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
  low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  normal: 'text-gray-600 bg-gray-50 dark:bg-gray-950/20',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
  urgent: 'text-red-600 bg-red-50 dark:bg-red-950/20',
};

export function NotificationDropdown({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onSettingsClick,
  isLoading = false,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Component lifecycle logging
  useEffect(() => {
    logInfo('NotificationDropdown component mounted', {
      component: 'NotificationDropdown',
      metadata: {
        initialNotificationsCount: notifications.length,
        initialUnreadCount: unreadCount,
        isLoading
      }
    });

    return () => {
      logInfo('NotificationDropdown component unmounted', {
        component: 'NotificationDropdown',
        metadata: {
          finalIsOpen: isOpen,
          finalNotificationsCount: notifications.length,
          finalUnreadCount: unreadCount
        }
      });
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        logInfo('NotificationDropdown closed by outside click', {
          component: 'NotificationDropdown',
          action: 'handleClickOutside',
          metadata: {
            wasOpen: isOpen,
            notificationsCount: notifications.length,
            unreadCount
          }
        });
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, notifications.length, unreadCount]);

   const handleNotificationClick = (notification: NotificationType) => {
    try {
      logInfo('User interaction - notification click', {
        component: 'NotificationDropdown',
        action: 'handleNotificationClick',
        metadata: {
          notificationId: notification.id,
          notificationTitle: notification.title,
          notificationType: notification.type,
          notificationPriority: notification.priority,
          wasRead: notification.isRead,
          isOpen,
          totalNotifications: notifications.length,
          unreadCount
        }
      });

      if (!notification.isRead) {
        onMarkAsRead(notification.id);

        logInfo('Notification marked as read during click', {
          component: 'NotificationDropdown',
          action: 'handleNotificationClick',
          metadata: {
            notificationId: notification.id,
            result: 'marked_as_read'
          }
        });
      }

      onNotificationClick(notification);
      setIsOpen(false);

      logInfo('Notification click handled successfully', {
        component: 'NotificationDropdown',
        action: 'handleNotificationClick',
        metadata: {
          result: 'success',
          notificationId: notification.id,
          dropdownClosed: true
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        component: 'NotificationDropdown',
        action: 'handleNotificationClick',
        metadata: {
          notificationId: notification.id,
          wasRead: notification.isRead,
          hasOnMarkAsRead: !!onMarkAsRead,
          hasOnNotificationClick: !!onNotificationClick
        }
      });
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
    <div ref={dropdownRef} className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-80 max-h-96 p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
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

          {/* Notifications List */}
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
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

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Individual Notification Item Component
interface NotificationItemProps {
  notification: NotificationType;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  formatTimeAgo,
}: NotificationItemProps) {
  return (
    <div
      className={`
        p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer
        transition-colors duration-150 relative
        ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
        ${priorityStyles[notification.priority]}
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar/Icon */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${priorityColors[notification.priority]}
        `}>
          {notification.type === 'like' && '👍'}
          {notification.type === 'comment' && '💬'}
          {notification.type === 'follow' && '👤'}
          {notification.type === 'friend_request' && '🤝'}
          {notification.type === 'mention' && '@'}
          {notification.type === 'tag' && '🏷️'}
          {notification.type === 'achievement' && '🏆'}
          {notification.type === 'milestone' && '🎯'}
          {notification.type === 'system' && '⚙️'}
          {notification.type === 'share' && '📤'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`
                text-sm leading-tight
                ${!notification.isRead ? 'font-semibold' : 'font-normal'}
                text-gray-900 dark:text-gray-100
              `}>
                {notification.title}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {notification.category}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
        )}
      </div>
    </div>
  );
}