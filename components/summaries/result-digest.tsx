"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { CopyButton } from "@/components/common/copy-button";
import { Markdown } from "@/components/common/markdown";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { useDigest } from "@/lib/api/digest";
import { summariesOptions } from "@/lib/api/summaries";
import type { Filters } from "@/lib/url/filters";
import { useInfiniteQuery } from "@tanstack/react-query";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";

/** The AI digest of the current result set, streamed in above the list. It
 *  reads the set's total from the list query already in the cache and stays
 *  hidden while the set is empty or still loading. Its own query subscription
 *  keeps each streamed chunk's re-render inside this card. */
export function ResultDigest({ filters }: { filters: Filters }) {
  const list = useInfiniteQuery({ ...summariesOptions(filters), select: (d) => d.pages[0]?.total ?? 0 });
  const total = list.isPlaceholderData ? 0 : (list.data ?? 0);
  const digest = useDigest(filters, total > 0);
  if (total === 0) return null;

  const streaming = digest.fetchStatus === "fetching";
  return (
    <section aria-label="AI summary" className="mb-4 overflow-hidden rounded-xl bg-card">
      <div aria-hidden className="ai-gradient h-0.5" />
      <div className="px-5 py-4">
        <header className="flex items-center gap-2.5">
          <span className="ai-gradient flex size-6 shrink-0 items-center justify-center rounded-md text-white">
            <SparklesIcon className="size-3.5" />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">AI summary of these {total.toLocaleString()}</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Regenerate" title="Regenerate" disabled={streaming} onClick={() => void digest.regenerate()}>
            <RefreshCwIcon className={streaming ? "animate-spin motion-reduce:animate-none" : undefined} />
          </Button>
          <CopyButton text={digest.data ?? ""} disabled={!digest.data} />
        </header>

        <div className="mt-3 text-sm">
          {digest.isError ? (
            <p className="text-destructive">
              The summary didn&apos;t finish: {errorMessage(digest.error)}{" "}
              <Button variant="link" size="xs" className="h-auto p-0" onClick={() => void digest.refetch()}>
                Try again
              </Button>
            </p>
          ) : digest.data ? (
            <Markdown streaming={streaming}>{digest.data}</Markdown>
          ) : (
            <div className="flex items-center gap-3">
              <span aria-hidden className="ai-orb size-3 shrink-0" />
              <Shimmer className="text-sm">{`Summarising ${total.toLocaleString()} summaries…`}</Shimmer>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">AI can make mistakes. Open a summary to verify a claim.</p>
      </div>
    </section>
  );
}
