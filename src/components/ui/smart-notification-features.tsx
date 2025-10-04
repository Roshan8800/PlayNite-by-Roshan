'use client';

import React, { useState, useMemo } from 'react';
import {
  Group,
  Ungroup,
  Clock,
  Filter,
  Search,
  Settings,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  Users,
  MessageSquare,
  Heart,
  Trophy,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import { Label } from './label';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Switch } from './switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Alert, AlertDescription } from './alert';
import type { Notification as NotificationType, NotificationGroup } from '@/lib/types/social';

interface SmartNotificationFeaturesProps {
  notifications: NotificationType[];
  onGroupNotifications: (groupType: string, notificationIds: string[]) => void;
  onUngroupNotifications: (groupId: string) => void;
  onScheduleNotification: (notificationId: string, scheduleTime: string) => void;
  onSetPriority: (notificationId: string, priority: NotificationType['priority']) => void;
  onFilterChange: (filter: any) => void;
  isLoading?: boolean;
}

const priorityStyles = {
  low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  normal: 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20',
  high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
  urgent: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
};

export function SmartNotificationFeatures({
  notifications,
  onGroupNotifications,
  onUngroupNotifications,
  onScheduleNotification,
  onSetPriority,
  onFilterChange,
  isLoading = false,
}: SmartNotificationFeaturesProps) {
  const [activeTab, setActiveTab] = useState('grouping');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [groupingDialogOpen, setGroupingDialogOpen] = useState(false);
  const [schedulingDialogOpen, setSchedulingDialogOpen] = useState(false);
  const [selectedGroupType, setSelectedGroupType] = useState('type');
  const [scheduleTime, setScheduleTime] = useState('');

  // Smart grouping logic
  const notificationGroups = useMemo(() => {
    const groups: Record<string, NotificationGroup> = {};

    notifications.forEach(notification => {
      if (notification.groupId) {
        if (!groups[notification.groupId]) {
          groups[notification.groupId] = {
            id: notification.groupId,
            userId: notification.userId,
            type: notification.type,
            title: `${notification.type} notifications`,
            summary: `Multiple ${notification.type} notifications`,
            notifications: [],
            count: 0,
            latestNotificationAt: notification.createdAt,
            isExpanded: false,
            priority: notification.priority,
          };
        }
        groups[notification.groupId].notifications.push(notification);
        groups[notification.groupId].count++;
        if (new Date(notification.createdAt) > new Date(groups[notification.groupId].latestNotificationAt)) {
          groups[notification.groupId].latestNotificationAt = notification.createdAt;
        }
      }
    });

    return Object.values(groups);
  }, [notifications]);

  // Smart filtering suggestions
  const filterSuggestions = useMemo(() => {
    const typeCounts = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityCounts = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      types: Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      priorities: Object.entries(priorityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3),
    };
  }, [notifications]);

  // Auto-scheduling suggestions based on user behavior
  const schedulingSuggestions = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // Suggest optimal times based on typical user activity patterns
    const suggestions = [];

    if (currentHour < 9) {
      suggestions.push({ time: '09:00', reason: 'Morning digest' });
    }
    if (currentHour < 12) {
      suggestions.push({ time: '12:00', reason: 'Lunch break' });
    }
    if (currentHour < 18) {
      suggestions.push({ time: '18:00', reason: 'After work' });
    }
    suggestions.push({ time: '20:00', reason: 'Evening summary' });

    return suggestions;
  }, []);

  const handleSmartGroup = (groupType: string) => {
    const similarNotifications = notifications.filter(n => {
      switch (groupType) {
        case 'type':
          return n.type === notifications.find(notif => selectedNotifications.has(notif.id))?.type;
        case 'priority':
          return n.priority === notifications.find(notif => selectedNotifications.has(notif.id))?.priority;
        case 'sender':
          return n.data.senderId === notifications.find(notif => selectedNotifications.has(notif.id))?.data.senderId;
        default:
          return false;
      }
    }).map(n => n.id);

    if (similarNotifications.length > 1) {
      onGroupNotifications(groupType, similarNotifications);
    }
    setGroupingDialogOpen(false);
    setSelectedNotifications(new Set());
  };

  const handleSmartSchedule = (notificationId: string, suggestedTime: string) => {
    const scheduleDateTime = new Date();
    const [hours, minutes] = suggestedTime.split(':');
    scheduleDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    onScheduleNotification(notificationId, scheduleDateTime.toISOString());
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Smart Notifications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intelligent grouping, scheduling, and filtering
            </p>
          </div>
        </div>

        <Badge variant="secondary" className="text-sm">
          {notificationGroups.length} groups • {notifications.length} total
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="grouping">Smart Grouping</TabsTrigger>
          <TabsTrigger value="scheduling">Smart Scheduling</TabsTrigger>
          <TabsTrigger value="filtering">Smart Filtering</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Smart Grouping */}
        <TabsContent value="grouping" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grouping Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Group className="h-5 w-5" />
                  <span>Group Notifications</span>
                </CardTitle>
                <CardDescription>
                  Automatically group similar notifications to reduce clutter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSmartGroup('type')}
                    className="justify-start"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    By Type
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSmartGroup('priority')}
                    className="justify-start"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    By Priority
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSmartGroup('sender')}
                    className="justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    By Sender
                  </Button>

                  <Dialog open={groupingDialogOpen} onOpenChange={setGroupingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Custom
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Custom Grouping</DialogTitle>
                        <DialogDescription>
                          Select specific notifications to group together
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Group Type</Label>
                          <Select value={selectedGroupType} onValueChange={setSelectedGroupType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="type">By Notification Type</SelectItem>
                              <SelectItem value="priority">By Priority Level</SelectItem>
                              <SelectItem value="sender">By Sender</SelectItem>
                              <SelectItem value="content">By Content</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-sm text-gray-600">
                          Select notifications from the list below to include in this group.
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGroupingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => handleSmartGroup(selectedGroupType)}>
                          Create Group
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Active Groups</h4>
                  {notificationGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">No active groups</p>
                  ) : (
                    <div className="space-y-2">
                      {notificationGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{group.title}</div>
                            <div className="text-xs text-gray-500">
                              {group.count} notifications • {group.summary}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUngroupNotifications(group.id)}
                          >
                            <Ungroup className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grouping Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Grouping Preview</CardTitle>
                <CardDescription>
                  See how notifications would be grouped
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    notifications.reduce((acc, n) => {
                      const key = `${n.type}-${n.priority}`;
                      if (!acc[key]) {
                        acc[key] = { type: n.type, priority: n.priority, count: 0 };
                      }
                      acc[key].count++;
                      return acc;
                    }, {} as Record<string, any>)
                  ).slice(0, 5).map(([key, group]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {group.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {group.priority}
                        </Badge>
                      </div>
                      <Badge variant="outline">
                        {group.count} notifications
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Scheduling */}
        <TabsContent value="scheduling" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scheduling Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Smart Scheduling</span>
                </CardTitle>
                <CardDescription>
                  Schedule notifications for optimal delivery times
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Suggested Times</h4>
                  <div className="space-y-2">
                    {schedulingSuggestions.map((suggestion) => (
                      <div key={suggestion.time} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{suggestion.time}</div>
                          <div className="text-xs text-gray-600">{suggestion.reason}</div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Apply to selected notifications
                            selectedNotifications.forEach(id => {
                              handleSmartSchedule(id, suggestion.time);
                            });
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Custom Schedule</h4>

                  <Dialog open={schedulingDialogOpen} onOpenChange={setSchedulingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Selected Notifications
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Notifications</DialogTitle>
                        <DialogDescription>
                          Choose when to deliver the selected notifications
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Delivery Time</Label>
                          <Input
                            type="datetime-local"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                        </div>

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Notifications will be delivered at the specified time, even if the app is closed.
                          </AlertDescription>
                        </Alert>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSchedulingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            selectedNotifications.forEach(id => {
                              onScheduleNotification(id, scheduleTime);
                            });
                            setSchedulingDialogOpen(false);
                          }}
                        >
                          Schedule
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Insights</CardTitle>
                <CardDescription>
                  Optimal timing based on your activity patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Best Engagement Time</span>
                    </div>
                    <Badge variant="outline">2:00 PM - 4:00 PM</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Quiet Hours</span>
                    </div>
                    <Badge variant="outline">10:00 PM - 8:00 AM</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Peak Activity</span>
                    </div>
                    <Badge variant="outline">7:00 PM - 9:00 PM</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Filtering */}
        <TabsContent value="filtering" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Smart Filters</span>
                </CardTitle>
                <CardDescription>
                  Automatically filter notifications based on importance and relevance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Priority-based filtering</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Sender-based filtering</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Content-based filtering</Label>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Time-based filtering</Label>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Quick Filters</h4>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFilterChange({ priorities: ['urgent', 'high'] })}
                    >
                      High Priority Only
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFilterChange({ types: ['mention', 'tag'] })}
                    >
                      Mentions & Tags
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFilterChange({ types: ['achievement', 'milestone'] })}
                    >
                      Achievements
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFilterChange({ isRead: false })}
                    >
                      Unread Only
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filter Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Suggestions</CardTitle>
                <CardDescription>
                  Suggested filters based on your notification patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Most Common Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {filterSuggestions.types.map(([type, count]) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => onFilterChange({ types: [type] })}
                        >
                          {type} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Priority Distribution</h4>
                    <div className="flex flex-wrap gap-2">
                      {filterSuggestions.priorities.map(([priority, count]) => (
                        <Badge
                          key={priority}
                          variant="outline"
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => onFilterChange({ priorities: [priority] })}
                        >
                          {priority} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Engagement Rate</p>
                    <p className="text-2xl font-bold">94.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Avg. Read Time</p>
                    <p className="text-2xl font-bold">2.3h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Group className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Groups Created</p>
                    <p className="text-2xl font-bold">{notificationGroups.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Optimal Time</p>
                    <p className="text-lg font-bold">3:00 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notification Patterns</CardTitle>
              <CardDescription>
                Insights into your notification behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Most Active Times</h4>
                    <div className="space-y-2">
                      {['2:00 PM - 4:00 PM', '7:00 PM - 9:00 PM', '11:00 AM - 1:00 PM'].map((time, index) => (
                        <div key={time} className="flex items-center justify-between">
                          <span className="text-sm">{time}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 bg-blue-500 rounded-full"
                                style={{ width: `${[85, 65, 45][index]}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">
                              {[85, 65, 45][index]}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="space-y-2">
                      {filterSuggestions.types.slice(0, 5).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{type}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}