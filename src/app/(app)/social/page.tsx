"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { seoService } from '@/lib/services/seo-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/services/social-service';
import { SocialUser } from '@/lib/types/social';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Heart,
  MessageCircle,
  Share,
  TrendingUp,
  Settings,
  Bell,
  Bookmark,
  Search,
  Filter
} from 'lucide-react';
import { FollowButton } from '@/components/ui/follow-button';
import { CommentsSection } from '@/components/ui/comments-section';
import { SocialFeed } from '@/components/ui/social-feed';
import { UserProfileCard } from '@/components/ui/user-profile-card';

// Mock users for demonstration
const mockUsers: SocialUser[] = [
  {
    id: "demo-user-1",
    firebaseId: "demo-firebase-1",
    name: "Sarah Johnson",
    username: "sarahj_photo",
    email: "sarah@example.com",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    bio: "Professional photographer specializing in landscapes and portraits",
    verified: true,
    isPrivate: false,
    joinedDate: "2022-03-15T10:30:00Z",
    lastActive: new Date().toISOString(),
    location: "San Francisco, CA",
    website: "https://sarahjphotography.com",
    followersCount: 15420,
    followingCount: 892,
    postsCount: 342,
    likesCount: 12500,
    isFollowing: false,
    isFollowedBy: true,
    isFriend: false,
    allowFriendRequests: true,
    allowTagging: true,
    allowMentions: true,
  },
  {
    id: "demo-user-2",
    firebaseId: "demo-firebase-2",
    name: "Mike Chen",
    username: "mikechen_ai",
    email: "mike@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    bio: "AI artist and digital creator exploring the future of art",
    verified: false,
    isPrivate: false,
    joinedDate: "2022-08-22T14:15:00Z",
    lastActive: new Date().toISOString(),
    location: "Austin, TX",
    followersCount: 8930,
    followingCount: 456,
    postsCount: 128,
    likesCount: 8900,
    isFollowing: true,
    isFollowedBy: false,
    isFriend: true,
    allowFriendRequests: true,
    allowTagging: true,
    allowMentions: true,
  },
  {
    id: "demo-user-3",
    firebaseId: "demo-firebase-3",
    name: "Emma Wilson",
    username: "emmaw_design",
    email: "emma@example.com",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
    bio: "UX/UI Designer & Digital Artist | Creating beautiful experiences",
    verified: true,
    isPrivate: false,
    joinedDate: "2021-11-08T09:45:00Z",
    lastActive: new Date().toISOString(),
    location: "New York, NY",
    website: "https://emmawdesign.com",
    followersCount: 25670,
    followingCount: 1234,
    postsCount: 567,
    likesCount: 23400,
    isFollowing: false,
    isFollowedBy: false,
    isFriend: false,
    allowFriendRequests: false,
    allowTagging: true,
    allowMentions: true,
  },
];

export default function SocialPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);
  const [activeTab, setActiveTab] = useState('feed');

  // Generate SEO metadata for the social page
  const seoMetadata = seoService.generateMetadata({
    pageType: 'social',
    title: 'Social Feed - Connect with Friends | PlayNite',
    description: 'Connect with friends, share content, and engage with the PlayNite community. Follow users, join conversations, and discover new content.',
    keywords: ['social feed', 'following', 'friends', 'social interaction', 'community engagement', 'PlayNite'],
  });

  return (
    <>
      <SEOHead metadata={seoMetadata} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Features Demo</h1>
          <p className="text-muted-foreground">
            Experience the comprehensive social media features including following, friends, comments, and more.
          </p>
        </div>

        {/* Social Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-medium">Following System</h3>
              <p className="text-sm text-muted-foreground">Follow/unfollow users and see their activity</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-medium">Friends System</h3>
              <p className="text-sm text-muted-foreground">Send and manage friend requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-medium">Comments</h3>
              <p className="text-sm text-muted-foreground">Nested comments with real-time updates</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <h3 className="font-medium">Social Feeds</h3>
              <p className="text-sm text-muted-foreground">Personalized content feeds</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed">Social Feed</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="comments">Comments Demo</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Social Feed Tab */}
          <TabsContent value="feed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SocialFeed feedType="following" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Discover Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockUsers.map((user) => (
                    <Card key={user.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-4">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <h3 className="font-medium">{user.name}</h3>
                              {user.verified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                            {user.bio && (
                              <p className="text-sm mt-2 line-clamp-2">{user.bio}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex gap-4 text-sm">
                            <span>{user.followersCount.toLocaleString()} followers</span>
                            <span>{user.postsCount} posts</span>
                          </div>
                        </div>

                        <FollowButton user={user} />

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Demo Tab */}
          <TabsContent value="comments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments System Demo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Sample Image Post</h3>
                  <img
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"
                    alt="Sample post"
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                  <p className="text-sm text-muted-foreground mb-4">
                    This is a sample post to demonstrate the comments system. Try posting comments, replies, and likes!
                  </p>
                </div>

                <CommentsSection
                  contentId="demo-content-1"
                  contentType="image"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <UserProfileCard
                  userId={selectedUser?.id || mockUsers[0].id}
                  showActions={true}
                />
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('feed')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Activity Feed
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Browse Users
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('comments')}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Try Comments
                    </Button>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Features Demo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Real-time updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Optimistic UI updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Nested comments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Social interactions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>User profiles</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Demo Info */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-2">Social Features Demo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This page demonstrates the comprehensive social media features implemented in the platform.
                  All interactions are handled by the social service layer with real-time updates and optimistic UI patterns.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Following System</Badge>
                  <Badge variant="secondary">Friends Management</Badge>
                  <Badge variant="secondary">Comments & Replies</Badge>
                  <Badge variant="secondary">Social Feeds</Badge>
                  <Badge variant="secondary">User Profiles</Badge>
                  <Badge variant="secondary">Real-time Updates</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}