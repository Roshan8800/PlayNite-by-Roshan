'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  Camera,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Settings as SettingsIcon,
  Key,
  Globe,
  Smartphone,
  Volume2
} from 'lucide-react';
import { BasePanel, PanelSectionComponent, PermissionGate, usePanelActionTracker } from './BasePanel';
import { PanelType, Permission } from '../types';

/**
 * UserSettingsPanel Component
 * Enhanced user settings panel with advanced profile and preference management
 */
interface UserSettingsPanelProps {
  userId: string;
  sessionId?: string;
}

// Enhanced validation schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  location: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  profileVisibility: z.enum(['public', 'private', 'friends']),
});

const securitySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.enum(['15', '30', '60', '240', 'never']),
  loginNotifications: z.boolean(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const privacySchema = z.object({
  showOnlineStatus: z.boolean(),
  allowFriendRequests: z.boolean(),
  showReadReceipts: z.boolean(),
  allowTagging: z.boolean(),
  allowMentions: z.boolean(),
  dataCollection: z.boolean(),
  marketingEmails: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;
type PrivacyFormData = z.infer<typeof privacySchema>;

export function UserSettingsPanel({ userId, sessionId }: UserSettingsPanelProps) {
  const { trackAction } = usePanelActionTracker(sessionId || 'default', PanelType.USER_SETTINGS);

  const [loading, setLoading] = useState({
    profile: false,
    security: false,
    privacy: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mock current user data
  const currentUser = {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    bio: 'Software developer passionate about creating amazing user experiences.',
    website: 'https://johndoe.com',
    location: 'San Francisco, CA',
    company: 'Tech Corp',
    position: 'Senior Developer',
    profileVisibility: 'public' as const,
    avatar: '/placeholder-avatar.jpg',
    twoFactorEnabled: false,
    sessionTimeout: '60' as const,
    loginNotifications: true,
    privacySettings: {
      showOnlineStatus: true,
      allowFriendRequests: true,
      showReadReceipts: true,
      allowTagging: true,
      allowMentions: true,
      dataCollection: false,
      marketingEmails: false,
    }
  };

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser.name,
      username: currentUser.username,
      bio: currentUser.bio,
      website: currentUser.website,
      location: currentUser.location,
      company: currentUser.company,
      position: currentUser.position,
      profileVisibility: currentUser.profileVisibility,
    },
  });

  // Security form
  const securityForm = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      twoFactorEnabled: currentUser.twoFactorEnabled,
      sessionTimeout: currentUser.sessionTimeout,
      loginNotifications: currentUser.loginNotifications,
    },
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setLoading(prev => ({ ...prev, profile: true }));
    trackAction('profile_update', { fields: Object.keys(data) });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleSecuritySubmit = async (data: SecurityFormData) => {
    setLoading(prev => ({ ...prev, security: true }));
    trackAction('security_update', { fields: Object.keys(data) });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showMessage('success', 'Security settings updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update security settings. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, security: false }));
    }
  };

  return (
    <BasePanel
      panelType={PanelType.USER_SETTINGS}
      userId={userId}
      sessionId={sessionId}
    >
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-600'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Manage your public profile and personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={currentUser.avatar} alt="Profile picture" />
                    <AvatarFallback className="text-lg">
                      {currentUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => trackAction('avatar_change')}
                    >
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                      onClick={() => trackAction('avatar_remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>

                <Separator />

                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        {...profileForm.register('name')}
                        placeholder="Enter your display name"
                      />
                      {profileForm.formState.errors.name && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...profileForm.register('username')}
                        placeholder="Enter your username"
                      />
                      {profileForm.formState.errors.username && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.username.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...profileForm.register('bio')}
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        {...profileForm.register('location')}
                        placeholder="City, Country"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        {...profileForm.register('website')}
                        placeholder="https://yourwebsite.com"
                      />
                      {profileForm.formState.errors.website && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.website.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        {...profileForm.register('company')}
                        placeholder="Your company"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        {...profileForm.register('position')}
                        placeholder="Your role"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <Select
                      value={profileForm.watch('profileVisibility')}
                      onValueChange={(value) => {
                        profileForm.setValue('profileVisibility', value as any);
                        trackAction('visibility_change', { visibility: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" disabled={loading.profile} className="flex items-center gap-2">
                    {loading.profile && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Profile Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={securityForm.handleSubmit(handleSecuritySubmit)} className="space-y-6">
                  {/* Password Change */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Change Password
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          {...securityForm.register('currentPassword')}
                        />
                        {securityForm.formState.errors.currentPassword && (
                          <p className="text-sm text-destructive">{securityForm.formState.errors.currentPassword.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            {...securityForm.register('newPassword')}
                          />
                          {securityForm.formState.errors.newPassword && (
                            <p className="text-sm text-destructive">{securityForm.formState.errors.newPassword.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            {...securityForm.register('confirmPassword')}
                          />
                          {securityForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-destructive">{securityForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Two-Factor Authentication */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Two-Factor Authentication
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable 2FA</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch
                        checked={securityForm.watch('twoFactorEnabled')}
                        onCheckedChange={(checked) => {
                          securityForm.setValue('twoFactorEnabled', checked);
                          trackAction('2fa_toggle', { enabled: checked });
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Session Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <SettingsIcon className="h-5 w-5" />
                      Session Management
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Session Timeout</Label>
                        <Select
                          value={securityForm.watch('sessionTimeout')}
                          onValueChange={(value) => {
                            securityForm.setValue('sessionTimeout', value as any);
                            trackAction('session_timeout_change', { timeout: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Login Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified of new logins to your account
                          </p>
                        </div>
                        <Switch
                          checked={securityForm.watch('loginNotifications')}
                          onCheckedChange={(checked) => {
                            securityForm.setValue('loginNotifications', checked);
                            trackAction('login_notifications_toggle', { enabled: checked });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading.security} className="flex items-center gap-2">
                    {loading.security && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Security Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  {/* Online Status */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Online Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others see when you're online
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.showOnlineStatus} />
                  </div>

                  <Separator />

                  {/* Friend Requests */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Friend Requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others send you friend requests
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.allowFriendRequests} />
                  </div>

                  <Separator />

                  {/* Read Receipts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Read Receipts</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others see when you've read their messages
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.showReadReceipts} />
                  </div>

                  <Separator />

                  {/* Tagging */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Tagging</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others tag you in posts and comments
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.allowTagging} />
                  </div>

                  <Separator />

                  {/* Mentions */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Mentions</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others mention you in their content
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.allowMentions} />
                  </div>

                  <Separator />

                  {/* Data Collection */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Collection for Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow collection of usage data to improve the platform
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.dataCollection} />
                  </div>

                  <Separator />

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <Switch defaultChecked={currentUser.privacySettings.marketingEmails} />
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Save Privacy Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BasePanel>
  );
}

export default UserSettingsPanel;