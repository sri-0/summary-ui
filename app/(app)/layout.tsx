import { AppShell } from "@/components/shell/app-shell";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { type ReactNode, Suspense } from "react";

/** The app frame: the sidebar and the resizable shell. Both read the URL
 *  (nuqs), which cacheComponents only allows under a Suspense boundary. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
        <AppShell>{children}</AppShell>
      </Suspense>
    </SidebarProvider>
  );
}
