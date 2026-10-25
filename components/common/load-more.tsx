"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon } from "lucide-react";

/** The foot of a paged list. While the query has another page it is the
 *  Load more button, the only way to that page (nothing fetches on scroll).
 *  Once there is none, a list given `end` (how many rows it holds and the
 *  total) shows a quiet mark that it is complete, with the total; one given
 *  none ends without a mark. Nothing shows while the first page is still
 *  loading. */
export function LoadMore({ hasNextPage, isFetchingNextPage, onLoadMore, end }: { hasNextPage: boolean; isFetchingNextPage: boolean; onLoadMore: () => void; end?: { loaded: number; total: number } }) {
  if (hasNextPage)
    return (
      <div className="flex justify-center py-3">
        <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => onLoadMore()}>
          {isFetchingNextPage && <Spinner data-icon="inline-start" />}
          Load more
        </Button>
      </div>
    );
  if (!end || end.loaded === 0) return null;
  return (
    <div className="flex items-center gap-3 py-3 text-xs text-muted-foreground">
      <Separator className="flex-1" />
      <CheckIcon className="size-3" aria-hidden />
      <span>
        End of results · <span className="tabular-nums">{end.total}</span>
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
