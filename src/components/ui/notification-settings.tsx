'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Mail,
  MessageSquare,
  Clock,
  Shield,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';
import { Button } from './button';
import { Switch } from './switch';
import { Label } from './label';
import { Input } from './input';
import { Separator } from './separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import type { NotificationPreferences } from '@/lib/types/social';

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
  onReset?: () => void;
  isLoading?: boolean;
}

const notificationTypes = [
  {
    key: 'like' as const,
    label: 'Likes',
    description: 'When someone likes your content',
    icon: '👍',
    defaultEnabled: true,
  },
  {
    key: 'comment' as const,
    label: 'Comments',
    description: 'When someone comments on your posts',
    icon: '💬',
    defaultEnabled: true,
  },
  {
    key: 'follow' as const,
    label: 'Follows',
    description: 'When someone starts following you',
    icon: '👤',
    defaultEnabled: true,
  },
  {
    key: 'friend_request' as const,
    label: 'Friend Requests',
    description: 'When someone sends you a friend request',
    icon: '🤝',
    defaultEnabled: true,
  },
  {
    key: 'mention' as const,
    label: 'Mentions',
    description: 'When someone mentions you in a post or comment',
    icon: '@',
    defaultEnabled: true,
  },
  {
    key: 'tag' as const,
    label: 'Tags',
    description: 'When someone tags you in content',
    icon: '🏷️',
    defaultEnabled: true,
  },
  {
    key: 'share' as const,
    label: 'Shares',
    description: 'When someone shares your content',
    icon: '📤',
    defaultEnabled: true,
  },
  {
    key: 'achievement' as const,
    label: 'Achievements',
    description: 'When you unlock new achievements',
    icon: '🏆',
    defaultEnabled: true,
  },
  {
    key: 'milestone' as const,
    label: 'Milestones',
    description: 'When you reach follower or engagement milestones',
    icon: '🎯',
    defaultEnabled: true,
  },
  {
    key: 'system' as const,
    label: 'System',
    description: 'App updates, security alerts, and announcements',
    icon: '⚙️',
    defaultEnabled: true,
  },
];

const soundOptions = [
  { value: 'default', label: 'Default' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'success', label: 'Success' },
  { value: 'alert', label: 'Alert' },
  { value: 'none', label: 'None' },
];

export function NotificationSettings({
  preferences,
  onSave,
  onReset,
  isLoading = false,
}: NotificationSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  const updateGlobalSetting = (key: keyof NotificationPreferences['globalSettings'], value: any) => {
    setLocalPreferences(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const updateTypeSetting = (
    type: keyof NotificationPreferences['types'],
    key: 'enabled' | 'sound' | 'channels',
    value: any
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateChannelSetting = (
    type: keyof NotificationPreferences['types'],
    channel: keyof NotificationPreferences['types']['like']['channels'],
    enabled: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          channels: {
            ...prev.types[type].channels,
            [channel]: enabled,
          },
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localPreferences);
    setHasChanges(false);
  };

  const handleReset = () => {
    onReset?.();
    setHasChanges(false);
  };

  const resetTypeToDefault = (type: keyof NotificationPreferences['types']) => {
    const defaultType = notificationTypes.find(t => t.key === type);
    if (defaultType) {
      updateTypeSetting(type, 'enabled', defaultType.defaultEnabled);
      updateTypeSetting(type, 'sound', 'default');
      updateChannelSetting(type, 'inApp', true);
      updateChannelSetting(type, 'push', true);
      updateChannelSetting(type, 'email', false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customize how and when you receive notifications
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="secondary">Unsaved changes</Badge>
          )}

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          <Button onClick={handleSave} disabled={!hasChanges || isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Global Settings */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Global Notification Settings</span>
              </CardTitle>
              <CardDescription>
                Control your overall notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Turn off to disable all notifications
                  </p>
                </div>
                <Switch
                  checked={localPreferences.globalSettings.enabled}
                  onCheckedChange={(enabled) => updateGlobalSetting('enabled', enabled)}
                />
              </div>

              <Separator />

              {/* Sound & Vibration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <span>Sound</span>
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-enabled">Sound Notifications</Label>
                      <Switch
                        id="sound-enabled"
                        checked={localPreferences.globalSettings.soundEnabled}
                        onCheckedChange={(enabled) => updateGlobalSetting('soundEnabled', enabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="vibration-enabled">Vibration</Label>
                      <Switch
                        id="vibration-enabled"
                        checked={localPreferences.globalSettings.vibrationEnabled}
                        onCheckedChange={(enabled) => updateGlobalSetting('vibrationEnabled', enabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="preview-enabled">Show Preview</Label>
                      <Switch
                        id="preview-enabled"
                        checked={localPreferences.globalSettings.previewEnabled}
                        onCheckedChange={(enabled) => updateGlobalSetting('previewEnabled', enabled)}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Channels */}
                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Channels</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-4 w-4" />
                        <Label>In-App</Label>
                      </div>
                      <Switch
                        checked={true}
                        disabled
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-4 w-4" />
                        <Label>Push Notifications</Label>
                      </div>
                      <Switch
                        checked={localPreferences.globalSettings.enabled}
                        onCheckedChange={(enabled) => updateGlobalSetting('enabled', enabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <Label>Email</Label>
                      </div>
                      <Switch
                        checked={localPreferences.globalSettings.enabled}
                        onCheckedChange={(enabled) => updateGlobalSetting('enabled', enabled)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Types */}
        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4">
            {notificationTypes.map((type) => (
              <Card key={type.key}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-2xl">{type.icon}</div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{type.label}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetTypeToDefault(type.key)}
                            className="h-6 px-2 text-xs"
                          >
                            Reset
                          </Button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {type.description}
                        </p>

                        <div className="space-y-4">
                          {/* Enable/Disable */}
                          <div className="flex items-center justify-between">
                            <Label>Enable notifications</Label>
                            <Switch
                              checked={localPreferences.types[type.key]?.enabled ?? type.defaultEnabled}
                              onCheckedChange={(enabled) => updateTypeSetting(type.key, 'enabled', enabled)}
                            />
                          </div>

                          {/* Sound Selection */}
                          <div className="flex items-center justify-between">
                            <Label>Sound</Label>
                            <Select
                              value={localPreferences.types[type.key]?.sound || 'default'}
                              onValueChange={(value) => updateTypeSetting(type.key, 'sound', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {soundOptions.map((sound) => (
                                  <SelectItem key={sound.value} value={sound.value}>
                                    {sound.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Channels */}
                          <div className="space-y-2">
                            <Label>Delivery Channels</Label>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={localPreferences.types[type.key]?.channels.inApp ?? true}
                                  onCheckedChange={(enabled) => updateChannelSetting(type.key, 'inApp', enabled)}
                                />
                                <Monitor className="h-4 w-4" />
                                <Label className="text-sm">In-App</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={localPreferences.types[type.key]?.channels.push ?? true}
                                  onCheckedChange={(enabled) => updateChannelSetting(type.key, 'push', enabled)}
                                />
                                <Smartphone className="h-4 w-4" />
                                <Label className="text-sm">Push</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={localPreferences.types[type.key]?.channels.email ?? false}
                                  onCheckedChange={(enabled) => updateChannelSetting(type.key, 'email', enabled)}
                                />
                                <Mail className="h-4 w-4" />
                                <Label className="text-sm">Email</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Quiet Hours</span>
              </CardTitle>
              <CardDescription>
                Set times when you don't want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Quiet Hours</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically mute notifications during specified hours
                  </p>
                </div>
                <Switch
                  checked={localPreferences.globalSettings.quietHours.enabled}
                  onCheckedChange={(enabled) =>
                    updateGlobalSetting('quietHours', {
                      ...localPreferences.globalSettings.quietHours,
                      enabled,
                    })
                  }
                />
              </div>

              {localPreferences.globalSettings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={localPreferences.globalSettings.quietHours.start}
                      onChange={(e) =>
                        updateGlobalSetting('quietHours', {
                          ...localPreferences.globalSettings.quietHours,
                          start: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={localPreferences.globalSettings.quietHours.end}
                      onChange={(e) =>
                        updateGlobalSetting('quietHours', {
                          ...localPreferences.globalSettings.quietHours,
                          end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Do Not Disturb</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Block all notifications for a specific period
                  </p>
                </div>
                <Switch
                  checked={localPreferences.globalSettings.doNotDisturb.enabled}
                  onCheckedChange={(enabled) =>
                    updateGlobalSetting('doNotDisturb', {
                      ...localPreferences.globalSettings.doNotDisturb,
                      enabled,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
              <CardDescription>
                Control who can send you notifications and how they're delivered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Muted Users</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Users whose notifications you've muted
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage ({localPreferences.mutedUsers.length})
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Priority Users</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Users whose notifications always appear first
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage ({localPreferences.priorityUsers.length})
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Snoozed Users</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Users you've temporarily muted
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage ({localPreferences.snoozedUsers.length})
                  </Button>
                </div>
              </div>

              <Separator />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your notification preferences are private and secure. We never share your settings with third parties.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}