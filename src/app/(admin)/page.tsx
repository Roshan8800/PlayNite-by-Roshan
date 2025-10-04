import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

// Mock data - in a real app, this would come from your backend
const dashboardStats = {
  totalUsers: 12453,
  activeUsers: 8932,
  totalContent: 45678,
  pendingModeration: 23,
  systemHealth: 98,
  storageUsed: 67,
};

const recentActivity = [
  {
    id: 1,
    type: "user_signup",
    message: "New user registered: john.doe@example.com",
    time: "2 minutes ago",
    status: "info",
  },
  {
    id: 2,
    type: "content_flagged",
    message: "Content flagged for review: Post #1234",
    time: "5 minutes ago",
    status: "warning",
  },
  {
    id: 3,
    type: "system_backup",
    message: "Automated backup completed successfully",
    time: "1 hour ago",
    status: "success",
  },
  {
    id: 4,
    type: "user_suspended",
    message: "User suspended: spam_violations_2024",
    time: "2 hours ago",
    status: "error",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalUsers.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{dashboardStats.activeUsers.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{dashboardStats.totalContent.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{dashboardStats.pendingModeration}</div>
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
                <span>{dashboardStats.systemHealth}%</span>
              </div>
              <Progress value={dashboardStats.systemHealth} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage Usage</span>
                <span>{dashboardStats.storageUsed}%</span>
              </div>
              <Progress value={dashboardStats.storageUsed} className="h-2" />
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
            <Button className="w-full justify-start" variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Review Content Queue
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Flag className="mr-2 h-4 w-4" />
              Check Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Database className="mr-2 h-4 w-4" />
              System Backup
            </Button>
          </CardContent>
        </Card>
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
                  {activity.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {activity.status === "warning" && (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  {activity.status === "error" && (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  {activity.status === "info" && (
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
                  activity.status === "success" ? "default" :
                  activity.status === "warning" ? "secondary" :
                  activity.status === "error" ? "destructive" : "outline"
                }>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}