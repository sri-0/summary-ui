"use client";

import { pages } from "@/components/sidebar/app-sidebar";
import { SummaryDialog } from "@/components/summaries/summary-dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useUiStore } from "@/stores/ui-store";
import { ListFilterIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The inset beside the sidebar: a header bar on the sidebar's surface (the
 *  sidebar trigger and the page's name) so the two read as one frame, then
 *  the page in a resizable main panel and, when open, the chat panel's slot.
 *  The summary dialog mounts once here so every page opens summaries the same
 *  way. */
export function AppShell({ children }: { children: ReactNode }) {
  const chatOpen = useUiStore((s) => s.chatOpen);
  const filtersOpen = useUiStore((s) => s.filtersOpen);
  const toggleFilters = useUiStore((s) => s.toggleFilters);
  const pathname = usePathname();
  const page = pages.find((p) => pathname.startsWith(p.href));
  return (
    <SidebarInset className="h-dvh min-w-0 overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-2 bg-sidebar px-3 text-sidebar-foreground">
        <SidebarTrigger className="-ml-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        <Separator orientation="vertical" className="bg-sidebar-border data-vertical:h-4 data-vertical:self-center" />
        <h2 className="text-sm font-medium">{page?.label}</h2>
        {/* The summaries page keeps its filters in a rail; this shows or hides it. */}
        {page?.href === "/summaries" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle filters"
            aria-pressed={filtersOpen}
            title="Filters"
            onClick={toggleFilters}
            className="ml-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-pressed:bg-sidebar-accent aria-pressed:text-sidebar-accent-foreground"

          >
            <ListFilterIcon />
          </Button>
        )}
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="main" minSize="40%" className="min-h-0 min-w-0">
          {children}
        </ResizablePanel>
        {chatOpen && (
          <>
            <ResizableHandle className="w-0 bg-transparent after:w-3" />
            <ResizablePanel id="chat" defaultSize="34%" minSize="24%" maxSize="60%" className="min-h-0 min-w-0">
              {/* The agent chat panel lands here. */}
              <div className="h-full bg-sidebar/40" />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      <SummaryDialog />
    </SidebarInset>
  );
}
