"use client";

import { ReactScan } from "@/components/dev/react-scan";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type ReactNode, useState } from "react";

/** The app's client providers: server state, theme, URL state, one tooltip
 *  provider, and the toaster. The devtools and react-scan load in development only. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <NuqsAdapter>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NuqsAdapter>
        {/* Flat: no border; an error reads on the theme's red. */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "[--normal-border:transparent]",
              error: "[--normal-bg:var(--destructive)] [--normal-text:white]",
            },
          }}
        />
      </ThemeProvider>
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <ReactScan />
    </QueryClientProvider>
  );
}
