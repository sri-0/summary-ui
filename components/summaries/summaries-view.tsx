"use client";

import { FilterBar } from "@/components/common/filter-bar";
import { ResultDigest } from "@/components/summaries/result-digest";
import { SummaryList } from "@/components/summaries/summary-list";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useSummaries } from "@/lib/api/summaries";
import { dayjs } from "@/lib/dayjs";
import { useFilters } from "@/lib/url/filters";
import { useUiStore } from "@/stores/ui-store";

/** The summaries page: a resizable rail with the filters on the left (the
 *  shared bar as a column: search, Group by, every facet, Clear), shown while
 *  the shell header's filter toggle is on, and beside it the range and count
 *  above the scrolling column with the AI digest and the table. Every filter
 *  is in the URL, so the view re-renders from it. */
export function SummariesView() {
  const { filters } = useFilters();
  const filtersOpen = useUiStore((s) => s.filtersOpen);
  const list = useSummaries(filters);
  const first = list.data?.pages[0];

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
      {filtersOpen && (
        <>
          <ResizablePanel id="filters" defaultSize="20%" minSize="14%" maxSize="36%" className="min-h-0">
            <aside className="h-full" aria-label="Filters">
              <FilterBar layout="rail" show={["q", "group", "severity", "project", "tag", "topics", "attr"]} />
            </aside>
          </ResizablePanel>
          {/* No line: a short grip in the middle shows when the pointer finds it. */}
          <ResizableHandle withHandle className="bg-transparent after:w-3 [&>div]:h-10 [&>div]:opacity-0 [&>div]:transition-opacity hover:[&>div]:opacity-100 active:[&>div]:opacity-100" />


        </>
      )}
      <ResizablePanel id="summaries" className="flex min-h-0 min-w-0 flex-col">
        <header className="flex flex-col gap-3 px-4 pt-3 pb-2 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{rangeLabel(filters.from, filters.to)}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {first ? `${first.total.toLocaleString()} ${first.total === 1 ? "summary" : "summaries"}` : " "}
            </p>
          </div>
        </header>

        {/* The padding sits inside the scroll container: a sticky header is
            placed from the container's content box, so padding on the
            container itself would hold it short of the top. */}
        <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6">
          <div className="py-4">
            <ResultDigest filters={filters} />
            <SummaryList filters={filters} />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

/** "Fri 24 Oct" for one day; "18 – 24 Oct 2026" for a range, spelling out
 *  the month or year on both ends only when they differ. */
function rangeLabel(from: string, to: string) {
  const a = dayjs(from);
  const b = dayjs(to);
  if (a.isSame(b, "day")) return a.format("ddd D MMM");
  if (a.isSame(b, "month")) return `${a.format("D")} – ${b.format("D MMM YYYY")}`;
  if (a.isSame(b, "year")) return `${a.format("D MMM")} – ${b.format("D MMM YYYY")}`;
  return `${a.format("D MMM YYYY")} – ${b.format("D MMM YYYY")}`;
}
