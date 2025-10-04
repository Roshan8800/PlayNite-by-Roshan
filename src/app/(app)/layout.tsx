import { Header } from "@/components/header";
import { MainNav } from "@/components/main-nav";
import { BottomNav } from "@/components/bottom-nav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SearchProvider } from "@/contexts/SearchContext";
import { ContentProvider } from "@/contexts/ContentContext";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SearchProvider>
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="min-h-screen pb-20 md:pb-0">
              {children}
            </main>
          </SidebarInset>
          <BottomNav />
        </SidebarProvider>
      </SearchProvider>
    </ProtectedRoute>
  );
}
