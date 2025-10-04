"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  Settings,
  Flag,
  Database,
  Activity,
  Tags,
  Calendar,
  Eye,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    children: [
      { title: "All Users", url: "/admin/users" },
      { title: "User Roles", url: "/admin/users/roles" },
      { title: "Activity Monitor", url: "/admin/users/activity" },
    ],
  },
  {
    title: "Content",
    url: "/admin/content",
    icon: FileText,
    children: [
      { title: "All Content", url: "/admin/content" },
      { title: "Categories", url: "/admin/content/categories" },
      { title: "Tags", url: "/admin/content/tags" },
      { title: "Schedule", url: "/admin/content/schedule" },
      { title: "Drafts", url: "/admin/content/drafts" },
    ],
  },
  {
    title: "Moderation",
    url: "/admin/moderation",
    icon: Shield,
    children: [
      { title: "Review Queue", url: "/admin/moderation" },
      { title: "Reports", url: "/admin/moderation/reports" },
      { title: "History", url: "/admin/moderation/history" },
      { title: "Auto-Scan", url: "/admin/moderation/scan" },
    ],
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
    children: [
      { title: "Overview", url: "/admin/analytics" },
      { title: "User Analytics", url: "/admin/analytics/users" },
      { title: "Content Analytics", url: "/admin/analytics/content" },
      { title: "Reports", url: "/admin/analytics/reports" },
    ],
  },
  {
    title: "System",
    url: "/admin/system",
    icon: Settings,
    children: [
      { title: "Settings", url: "/admin/system" },
      { title: "Feature Flags", url: "/admin/system/features" },
      { title: "Security", url: "/admin/system/security" },
      { title: "Health", url: "/admin/system/health" },
      { title: "Database", url: "/admin/system/database" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-6">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Content Management</p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "w-full",
                      pathname === item.url && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                  {item.children && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <SidebarMenuButton
                          key={child.url}
                          asChild
                          className={cn(
                            "w-full text-sm",
                            pathname === child.url && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Link href={child.url}>{child.title}</Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}