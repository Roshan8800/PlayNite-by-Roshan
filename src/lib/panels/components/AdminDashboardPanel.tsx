'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  FileText,
  Shield,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  UserPlus,
  Flag,
  Database,
  Settings,
  BarChart3,
  UserCog,
  Search,
  Filter
} from 'lucide-react';
import { BasePanel, PanelSectionComponent, PermissionGate, usePanelActionTracker } from './BasePanel';
import { PanelType, Permission } from '../types';

/**
 * AdminDashboardPanel Component
 * Advanced admin dashboard with comprehensive management capabilities
 */
interface AdminDashboardPanelProps {
  userId: string;
  sessionId?: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  pendingModeration: number;
  systemHealth: number;
  storageUsed: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'content_flagged' | 'system_backup' | 'user_suspended';
  message: string;
  time: string;
  status: 'info' | 'warning' | 'success' | 'error';
}

export function AdminDashboardPanel({ userId, sessionId }: AdminDashboardPanelProps) {
  const { trackAction } = usePanelActionTracker(sessionId || 'default', PanelType.ADMIN_DASHBOARD);

  // Mock data - in a real app, this would come from your backend
  const stats: DashboardStats = {
    totalUsers: 12453,
    activeUsers: 8932,
    totalContent: 45678,
    pendingModeration: 23,
    systemHealth: 98,
    storageUsed: 67
  };

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'user_signup',
      message: 'New user registered: john.doe@example.com',
      time: '2 minutes ago',
      status: 'info'
    },
    {
      id: '2',
      type: 'content_flagged',
      message: 'Content flagged for review: Post #1234',
      time: '5 minutes ago',
      status: 'warning'
    },
    {
      id: '3',
      type: 'system_backup',
      message: 'Automated backup completed successfully',
      time: '1 hour ago',
      status: 'success'
    },
    {
      id: '4',
      type: 'user_suspended',
      message: 'User suspended: spam_violations_2024',
      time: '2 hours ago',
      status: 'error'
    }
  ];

  const handleQuickAction = (action: string) => {
    trackAction(`quick_action_${action}`);
    // Handle quick action logic here
  };

  const handleViewDetails = (section: string) => {
    trackAction(`view_details_${section}`);
    // Handle view details logic here
  };

  return (
    <BasePanel
      panelType={PanelType.ADMIN_DASHBOARD}
      userId={userId}
      sessionId={sessionId}
    >
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+23.1%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingModeration}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* System Health */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Overall platform performance and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>System Performance</span>
                  <span>{stats.systemHealth}%</span>
                </div>
                <Progress value={stats.systemHealth} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Storage Usage</span>
                  <span>{stats.storageUsed}%</span>
                </div>
                <Progress value={stats.storageUsed} className="h-2" />
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API Status: Healthy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Database: Connected</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PermissionGate
                permissions={[Permission.MANAGE_USERS]}
                userPermissions={[]} // This would come from auth context
              >
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => handleQuickAction('add_user')}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New User
                </Button>
              </PermissionGate>

              <PermissionGate
                permissions={[Permission.REVIEW_FLAGGED_CONTENT]}
                userPermissions={[]}
              >
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => handleQuickAction('review_content')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Review Content Queue
                </Button>
              </PermissionGate>

              <PermissionGate
                permissions={[Permission.MODERATE_COMMENTS]}
                userPermissions={[]}
              >
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => handleQuickAction('check_reports')}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Check Reports
                </Button>
              </PermissionGate>

              <PermissionGate
                permissions={[Permission.SYSTEM_ACCESS]}
                userPermissions={[]}
              >
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => handleQuickAction('system_backup')}
                >
                  <Database className="mr-2 h-4 w-4" />
                  System Backup
                </Button>
              </PermissionGate>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* User Management */}
          <PermissionGate
            permissions={[Permission.MANAGE_USERS]}
            userPermissions={[]}
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('user_management')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </PermissionGate>

          {/* Content Management */}
          <PermissionGate
            permissions={[Permission.MANAGE_CONTENT]}
            userPermissions={[]}
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('content_management')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Management
                </CardTitle>
                <CardDescription>
                  Oversee content creation and moderation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.totalContent.toLocaleString()}</span>
                  <Badge variant="outline">{stats.pendingModeration} pending</Badge>
                </div>
              </CardContent>
            </Card>
          </PermissionGate>

          {/* Analytics */}
          <PermissionGate
            permissions={[Permission.VIEW_ANALYTICS]}
            userPermissions={[]}
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('analytics')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  View detailed platform analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">98.5%</span>
                  <Badge variant="default">Healthy</Badge>
                </div>
              </CardContent>
            </Card>
          </PermissionGate>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {activity.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {activity.status === 'warning' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    {activity.status === 'error' && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    {activity.status === 'info' && (
                      <Activity className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.message}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                  <Badge variant={
                    activity.status === 'success' ? 'default' :
                    activity.status === 'warning' ? 'secondary' :
                    activity.status === 'error' ? 'destructive' : 'outline'
                  }>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BasePanel>
  );
}

export default AdminDashboardPanel;