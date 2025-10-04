"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "./ui/sidebar";
import { Home, Film, History, Image as ImageIcon, FileText, Book, ShieldAlert, BadgePercent, Info, Settings, User } from "lucide-react";
import { PlayNiteLogo } from "./playnite-logo";

const menuItems = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/reels", label: "Reels", icon: Film },
    { href: "/stories", label: "Stories", icon: History },
    { href: "/images", label: "Images", icon: ImageIcon },
];

const contentItems = [
    { href: "/study", label: "Study", icon: Book },
    { href: "/18plus", label: "18+ Content", icon: ShieldAlert },
];

const secondaryItems = [
    { href: "/premium", label: "Premium", icon: BadgePercent },
    { href: "/about", label: "About", icon: Info },
    { href: "/settings", label: "Settings", icon: Settings },
];


export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col p-4">
        <div className="mb-4 hidden md:block">
            <Link href="/home">
                <PlayNiteLogo />
            </Link>
        </div>
      <SidebarMenu className="flex-1">
        <SidebarGroup>
          {menuItems.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <Link href={href}>
                <SidebarMenuButton isActive={pathname === href} tooltip={label}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>

        <SidebarGroup>
            <SidebarGroupLabel>Content Sections</SidebarGroupLabel>
            {contentItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                <Link href={href}>
                    <SidebarMenuButton isActive={pathname.startsWith(href)} tooltip={label}>
                    <Icon />
                    <span>{label}</span>
                    </SidebarMenuButton>
                </Link>
                </SidebarMenuItem>
            ))}
        </SidebarGroup>
         <SidebarGroup>
            <SidebarGroupLabel>More</SidebarGroupLabel>
            {secondaryItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                <Link href={href}>
                    <SidebarMenuButton isActive={pathname.startsWith(href)} tooltip={label}>
                    <Icon />
                    <span>{label}</span>
                    </SidebarMenuButton>
                </Link>
                </SidebarMenuItem>
            ))}
        </SidebarGroup>
      </SidebarMenu>
      
      <div className="mt-auto">
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/login">
                    <SidebarMenuButton tooltip="Login">
                    <User />
                    <span>Login / Sign Up</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
