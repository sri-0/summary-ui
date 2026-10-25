"use client";

import { Brand } from "@/components/common/brand";
import { DateNav } from "@/components/sidebar/date-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { serializeFilters, useFilters } from "@/lib/url/filters";
import { ChartNoAxesCombinedIcon, MoonIcon, GraphStarIcon, SearchIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/** The pages, in nav order. The shell header names the current one by the
 *  pathname's prefix. */
export const pages = [
  { href: "/summaries", label: "AI Summaries", icon: SparklesIcon },
  { href: "/search", label: "AI Search", icon: SearchIcon },
  { href: "/topics", label: "Explore", icon: ChartNoAxesCombinedIcon },
  { href: "/graph", label: "Discover", icon: GraphStarIcon },


] as const;

/** The app's sidebar: the brand, the pages, the date range and, in the
 *  footer, the theme toggle. Page links carry the current range, so switching
 *  pages keeps the dates. */
export function AppSidebar() {
  const pathname = usePathname();
  const { filters } = useFilters();
  const range = { from: filters.from, to: filters.to };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="gap-2.5">
              <Brand href={serializeFilters("/summaries", range)} />
            </SidebarMenuButton>

          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-4 p-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {pages.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild tooltip={label} isActive={pathname.startsWith(href)} className="h-9 gap-2.5">
                    <Link href={serializeFilters(href, range)}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="gap-1 p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="h-7 px-2 text-xs font-semibold text-sidebar-foreground/65">Date</SidebarGroupLabel>
          <SidebarGroupContent>
            <DateNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** The theme toggle at the bottom of the sidebar: a menu button naming the
 *  theme a click switches to, so the collapsed rail still shows it as an icon
 *  with a tooltip. */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The theme is only known on the client; render the light variant on the
  // server so hydration matches.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = mounted && theme === "dark";
  const label = dark ? "Light mode" : "Dark mode";

  return (
    <SidebarMenuButton tooltip={label} onClick={() => setTheme(dark ? "light" : "dark")} className="h-9 gap-2.5">
      {dark ? <SunIcon /> : <MoonIcon />}
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
