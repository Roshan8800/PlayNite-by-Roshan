"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
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
  Loader2
} from "lucide-react";

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  profileVisibility: z.enum(["public", "private", "friends"]),
  avatar: z.string(),
});

const accountSchema = z.object({
 email: z.string().email("Please enter a valid email"),
 currentPassword: z.string().min(1, "Current password is required"),
 newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
 confirmPassword: z.string().optional(),
 twoFactorEnabled: z.boolean(),
 privacySettings: z.object({
   showOnlineStatus: z.boolean(),
   allowFriendRequests: z.boolean(),
   showReadReceipts: z.boolean(),
 }),
}).refine((data) => {
 if (data.newPassword && data.newPassword !== data.confirmPassword) {
   return false;
 }
 return true;
}, {
 message: "Passwords don't match",
 path: ["confirmPassword"],
});

const appearanceSchema = z.object({
 theme: z.enum(["light", "dark", "system"]),
 fontSize: z.enum(["small", "medium", "large"]),
 animationsEnabled: z.boolean(),
 language: z.string(),
 displayDensity: z.enum(["compact", "comfortable", "spacious"]),
});

const notificationsSchema = z.object({
 pushNotifications: z.object({
   enabled: z.boolean(),
   mentions: z.boolean(),
   comments: z.boolean(),
   likes: z.boolean(),
   follows: z.boolean(),
   messages: z.boolean(),
 }),
 emailNotifications: z.object({
   enabled: z.boolean(),
   weeklyDigest: z.boolean(),
   productUpdates: z.boolean(),
   securityAlerts: z.boolean(),
 }),
 inAppNotifications: z.object({
   enabled: z.boolean(),
   soundEnabled: z.boolean(),
   vibrationEnabled: z.boolean(),
   showPreviews: z.boolean(),
 }),
});

// Types
type ProfileFormData = z.infer<typeof profileSchema>;
type AccountFormData = z.infer<typeof accountSchema>;
type AppearanceFormData = z.infer<typeof appearanceSchema>;
type NotificationsFormData = z.infer<typeof notificationsSchema>;

// Mock API functions
const mockApiCall = async (data: any, delay: number = 1000) => {
 await new Promise(resolve => setTimeout(resolve, delay));
 return { success: true, data };
};

// Default settings state
const defaultSettings: {
  profile: ProfileFormData & { avatar: string };
  account: {
    email: string;
    twoFactorEnabled: boolean;
    privacySettings: {
      showOnlineStatus: boolean;
      allowFriendRequests: boolean;
      showReadReceipts: boolean;
    };
  };
  appearance: AppearanceFormData;
  notifications: NotificationsFormData;
} = {
  profile: {
    name: "John Doe",
    username: "johndoe",
    bio: "Software developer passionate about creating amazing user experiences.",
    website: "https://johndoe.com",
    twitter: "@johndoe",
    instagram: "johndoe",
    linkedin: "linkedin.com/in/johndoe",
    profileVisibility: "public",
    avatar: "/placeholder-avatar.jpg",
  },
  account: {
    email: "john@example.com",
    twoFactorEnabled: false,
    privacySettings: {
      showOnlineStatus: true,
      allowFriendRequests: true,
      showReadReceipts: true,
    },
  },
  appearance: {
    theme: "dark",
    fontSize: "medium",
    animationsEnabled: true,
    language: "en",
    displayDensity: "comfortable",
  },
  notifications: {
    pushNotifications: {
      enabled: true,
      mentions: true,
      comments: true,
      likes: false,
      follows: true,
      messages: true,
    },
    emailNotifications: {
      enabled: true,
      weeklyDigest: true,
      productUpdates: false,
      securityAlerts: true,
    },
    inAppNotifications: {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: false,
      showPreviews: true,
    },
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState({
    profile: false,
    account: false,
    appearance: false,
    notifications: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: settings.profile.name,
      username: settings.profile.username,
      bio: settings.profile.bio,
      website: settings.profile.website,
      twitter: settings.profile.twitter,
      instagram: settings.profile.instagram,
      linkedin: settings.profile.linkedin,
      profileVisibility: settings.profile.profileVisibility,
      avatar: settings.profile.avatar,
    },
  });

  // Account form
  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: settings.account.email,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      twoFactorEnabled: settings.account.twoFactorEnabled,
      privacySettings: settings.account.privacySettings,
    },
  });

  // Appearance form
  const appearanceForm = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: settings.appearance,
  });

  // Notifications form
  const notificationsForm = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: settings.notifications,
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      await mockApiCall(data);
      setSettings(prev => ({ ...prev, profile: data }));
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleAccountSubmit = async (data: AccountFormData) => {
    setLoading(prev => ({ ...prev, account: true }));
    try {
      await mockApiCall(data);
      setSettings(prev => ({
        ...prev,
        account: {
          ...prev.account,
          email: data.email,
          twoFactorEnabled: data.twoFactorEnabled,
          privacySettings: data.privacySettings,
        }
      }));
      showMessage('success', 'Account settings updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update account settings. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, account: false }));
    }
  };

  const handleAppearanceSubmit = async (data: AppearanceFormData) => {
    setLoading(prev => ({ ...prev, appearance: true }));
    try {
      await mockApiCall(data);
      setSettings(prev => ({ ...prev, appearance: data }));
      showMessage('success', 'Appearance settings updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update appearance settings. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, appearance: false }));
    }
  };

  const handleNotificationsSubmit = async (data: NotificationsFormData) => {
    setLoading(prev => ({ ...prev, notifications: true }));
    try {
      await mockApiCall(data);
      setSettings(prev => ({ ...prev, notifications: data }));
      showMessage('success', 'Notification settings updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update notification settings. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-4xl font-headline mb-6">Settings</h1>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                This is how others will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={settings.profile.avatar} alt="Profile picture" />
                  <AvatarFallback className="text-lg">
                    {settings.profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-destructive hover:text-destructive">
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
                      {...profileForm.register("name")}
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
                      {...profileForm.register("username")}
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
                    {...profileForm.register("bio")}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.bio.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    {...profileForm.register("website")}
                    placeholder="https://yourwebsite.com"
                  />
                  {profileForm.formState.errors.website && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.website.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      {...profileForm.register("twitter")}
                      placeholder="@username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      {...profileForm.register("instagram")}
                      placeholder="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      {...profileForm.register("linkedin")}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select
                    value={profileForm.watch("profileVisibility")}
                    onValueChange={(value) => profileForm.setValue("profileVisibility", value as any)}
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

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and privacy settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-6">
                {/* Email Change */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Address</h3>
                  <div className="space-y-2">
                    <Label htmlFor="email">New Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...accountForm.register("email")}
                      placeholder="Enter new email address"
                    />
                    {accountForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{accountForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Password Change */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        {...accountForm.register("currentPassword")}
                      />
                      {accountForm.formState.errors.currentPassword && (
                        <p className="text-sm text-destructive">{accountForm.formState.errors.currentPassword.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          {...accountForm.register("newPassword")}
                        />
                        {accountForm.formState.errors.newPassword && (
                          <p className="text-sm text-destructive">{accountForm.formState.errors.newPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...accountForm.register("confirmPassword")}
                        />
                        {accountForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">{accountForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Two-Factor Authentication */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Security</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={accountForm.watch("twoFactorEnabled")}
                      onCheckedChange={(checked) => accountForm.setValue("twoFactorEnabled", checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Privacy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Online Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others see when you're online
                        </p>
                      </div>
                      <Switch
                        checked={accountForm.watch("privacySettings.showOnlineStatus")}
                        onCheckedChange={(checked) =>
                          accountForm.setValue("privacySettings.showOnlineStatus", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Friend Requests</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others send you friend requests
                        </p>
                      </div>
                      <Switch
                        checked={accountForm.watch("privacySettings.allowFriendRequests")}
                        onCheckedChange={(checked) =>
                          accountForm.setValue("privacySettings.allowFriendRequests", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Read Receipts</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others see when you've read their messages
                        </p>
                      </div>
                      <Switch
                        checked={accountForm.watch("privacySettings.showReadReceipts")}
                        onCheckedChange={(checked) =>
                          accountForm.setValue("privacySettings.showReadReceipts", checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading.account} className="flex items-center gap-2">
                  {loading.account && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Account Changes
                </Button>
              </form>

              {/* Danger Zone */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                <div className="rounded-lg border border-destructive/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-destructive">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={appearanceForm.handleSubmit(handleAppearanceSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select
                      value={appearanceForm.watch("theme")}
                      onValueChange={(value) => appearanceForm.setValue("theme", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select
                      value={appearanceForm.watch("fontSize")}
                      onValueChange={(value) => appearanceForm.setValue("fontSize", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Density</Label>
                    <Select
                      value={appearanceForm.watch("displayDensity")}
                      onValueChange={(value) => appearanceForm.setValue("displayDensity", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={appearanceForm.watch("language")}
                      onValueChange={(value) => appearanceForm.setValue("language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Show smooth transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={appearanceForm.watch("animationsEnabled")}
                    onCheckedChange={(checked) => appearanceForm.setValue("animationsEnabled", checked)}
                  />
                </div>

                <Button type="submit" disabled={loading.appearance} className="flex items-center gap-2">
                  {loading.appearance && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Appearance Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={notificationsForm.handleSubmit(handleNotificationsSubmit)} className="space-y-6">
                {/* Push Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Push Notifications</h3>
                    <Switch
                      checked={notificationsForm.watch("pushNotifications.enabled")}
                      onCheckedChange={(checked) =>
                        notificationsForm.setValue("pushNotifications.enabled", checked)
                      }
                    />
                  </div>

                  {notificationsForm.watch("pushNotifications.enabled") && (
                    <div className="ml-4 space-y-3">
                      {[
                        { key: "mentions", label: "Mentions" },
                        { key: "comments", label: "Comments" },
                        { key: "likes", label: "Likes" },
                        { key: "follows", label: "Follows" },
                        { key: "messages", label: "Messages" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label>{label}</Label>
                          <Switch
                            checked={notificationsForm.watch(`pushNotifications.${key}` as any)}
                            onCheckedChange={(checked) =>
                              notificationsForm.setValue(`pushNotifications.${key}` as any, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    <Switch
                      checked={notificationsForm.watch("emailNotifications.enabled")}
                      onCheckedChange={(checked) =>
                        notificationsForm.setValue("emailNotifications.enabled", checked)
                      }
                    />
                  </div>

                  {notificationsForm.watch("emailNotifications.enabled") && (
                    <div className="ml-4 space-y-3">
                      {[
                        { key: "weeklyDigest", label: "Weekly Digest" },
                        { key: "productUpdates", label: "Product Updates" },
                        { key: "securityAlerts", label: "Security Alerts" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label>{label}</Label>
                          <Switch
                            checked={notificationsForm.watch(`emailNotifications.${key}` as any)}
                            onCheckedChange={(checked) =>
                              notificationsForm.setValue(`emailNotifications.${key}` as any, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* In-App Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">In-App Notifications</h3>
                    <Switch
                      checked={notificationsForm.watch("inAppNotifications.enabled")}
                      onCheckedChange={(checked) =>
                        notificationsForm.setValue("inAppNotifications.enabled", checked)
                      }
                    />
                  </div>

                  {notificationsForm.watch("inAppNotifications.enabled") && (
                    <div className="ml-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Sound</Label>
                        <Switch
                          checked={notificationsForm.watch("inAppNotifications.soundEnabled")}
                          onCheckedChange={(checked) =>
                            notificationsForm.setValue("inAppNotifications.soundEnabled", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Vibration</Label>
                        <Switch
                          checked={notificationsForm.watch("inAppNotifications.vibrationEnabled")}
                          onCheckedChange={(checked) =>
                            notificationsForm.setValue("inAppNotifications.vibrationEnabled", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Show Previews</Label>
                        <Switch
                          checked={notificationsForm.watch("inAppNotifications.showPreviews")}
                          onCheckedChange={(checked) =>
                            notificationsForm.setValue("inAppNotifications.showPreviews", checked)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading.notifications} className="flex items-center gap-2">
                  {loading.notifications && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Notification Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
