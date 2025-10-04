'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info, Bell } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import type { Notification as NotificationType } from '@/lib/types/social';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

interface NotificationToastProps {
  notification: NotificationType;
  onClose: () => void;
  onMarkAsRead?: () => void;
  onClick?: () => void;
  autoHide?: boolean;
  duration?: number;
}

const priorityStyles = {
  low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  normal: 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20',
  high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
  urgent: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
};

const priorityIcons = {
  low: Info,
  normal: Bell,
  high: AlertCircle,
  urgent: AlertCircle,
};

export function NotificationToast({
  notification,
  onClose,
  onMarkAsRead,
  onClick,
  autoHide = true,
  duration = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);

  const PriorityIcon = priorityIcons[notification.priority];

  // Component lifecycle logging
  useEffect(() => {
    logInfo('NotificationToast component mounted', {
      component: 'NotificationToast',
      metadata: {
        notificationId: notification.id,
        notificationTitle: notification.title,
        priority: notification.priority,
        category: notification.category,
        isRead: notification.isRead,
        autoHide,
        duration
      }
    });

    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      logInfo('NotificationToast component unmounted', {
        component: 'NotificationToast',
        metadata: {
          notificationId: notification.id,
          finalTimeLeft: timeLeft,
          wasVisible: isVisible
        }
      });
    };
  }, []);

  // Monitor auto-hide behavior
  useEffect(() => {
    if (autoHide && timeLeft === 0) {
      logInfo('Notification auto-hidden', {
        component: 'NotificationToast',
        action: 'autoHide',
        metadata: {
          notificationId: notification.id,
          duration,
          priority: notification.priority
        }
      });
    }
  }, [timeLeft, autoHide]);

  useEffect(() => {
    if (!autoHide) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          setIsVisible(false);
          setTimeout(onClose, 300); // Wait for fade out animation
          clearInterval(interval);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [autoHide, onClose]);

  const handleClose = () => {
    try {
      logInfo('User interaction - close notification', {
        component: 'NotificationToast',
        action: 'handleClose',
        metadata: {
          notificationId: notification.id,
          notificationTitle: notification.title,
          priority: notification.priority,
          timeLeft,
          wasAutoHide: timeLeft === 0
        }
      });

      setIsVisible(false);
      setTimeout(onClose, 300);

      logInfo('Notification closed successfully', {
        component: 'NotificationToast',
        action: 'handleClose',
        metadata: {
          result: 'success',
          notificationId: notification.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'NotificationToast',
        action: 'handleClose',
        metadata: {
          notificationId: notification.id,
          timeLeft
        }
      });
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      logInfo('User interaction - mark notification as read', {
        component: 'NotificationToast',
        action: 'handleMarkAsRead',
        metadata: {
          notificationId: notification.id,
          notificationTitle: notification.title,
          currentReadState: notification.isRead,
          priority: notification.priority
        }
      });

      onMarkAsRead?.();

      logInfo('Notification marked as read successfully', {
        component: 'NotificationToast',
        action: 'handleMarkAsRead',
        metadata: {
          result: 'success',
          notificationId: notification.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'NotificationToast',
        action: 'handleMarkAsRead',
        metadata: {
          notificationId: notification.id,
          currentReadState: notification.isRead
        }
      });
    }
  };

  const handleClick = () => {
    try {
      logInfo('User interaction - click notification', {
        component: 'NotificationToast',
        action: 'handleClick',
        metadata: {
          notificationId: notification.id,
          notificationTitle: notification.title,
          priority: notification.priority,
          category: notification.category,
          isRead: notification.isRead
        }
      });

      onClick?.();
      handleClose();

      logInfo('Notification click handled successfully', {
        component: 'NotificationToast',
        action: 'handleClick',
        metadata: {
          result: 'success',
          notificationId: notification.id
        }
      });
    } catch (error) {
      logError(error, {
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.LOW,
        component: 'NotificationToast',
        action: 'handleClick',
        metadata: {
          notificationId: notification.id,
          hasOnClick: !!onClick
        }
      });
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg cursor-pointer transition-all duration-200
          hover:shadow-xl hover:scale-[1.02]
          ${priorityStyles[notification.priority]}
        `}
        onClick={handleClick}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                  notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                  notification.priority === 'normal' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-100 text-blue-600'}
              `}>
                <PriorityIcon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {notification.message}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {notification.category}
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 ml-2">
              {!notification.isRead && onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar for auto-hide */}
          {autoHide && (
            <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                style={{ width: `${(timeLeft / duration) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Toast Container Component
interface NotificationToastContainerProps {
  notifications: NotificationType[];
  onNotificationClose: (id: string) => void;
  onNotificationRead: (id: string) => void;
  onNotificationClick: (notification: NotificationType) => void;
}

export function NotificationToastContainer({
  notifications,
  onNotificationClose,
  onNotificationRead,
  onNotificationClick,
}: NotificationToastContainerProps) {
  // Show only the latest 3 notifications
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index,
          }}
        >
          <NotificationToast
            notification={notification}
            onClose={() => onNotificationClose(notification.id)}
            onMarkAsRead={() => onNotificationRead(notification.id)}
            onClick={() => onNotificationClick(notification)}
            autoHide={!notification.priority || notification.priority !== 'urgent'}
            duration={notification.priority === 'urgent' ? 10000 : 5000}
          />
        </div>
      ))}
    </div>
  );
}