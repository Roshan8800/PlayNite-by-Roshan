"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, History, Image as ImageIcon, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/reels", label: "Reels", icon: Film },
  { href: "/stories", label: "Stories", icon: History },
  { href: "/images", label: "Images", icon: ImageIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      {/* Safe area padding for mobile devices */}
      <div className="pb-safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] group",
                  "hover:bg-accent/10 active:scale-95",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 mb-1 transition-all duration-200",
                    isActive && "scale-110"
                  )}
                />
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "text-primary font-semibold"
                )}>
                  {label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full opacity-100 scale-100 transition-all duration-200" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}