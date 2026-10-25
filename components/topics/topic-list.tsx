"use client";

import { SeverityBar, severityText } from "@/components/common/severity-bar";
import type { Topic } from "@/lib/api/types";
import { useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRightIcon } from "lucide-react";
import { type CSSProperties, memo, useRef } from "react";

/** A row's height, which the virtualiser lays rows out by. */
const ROW = 48;
/** A topic's identity colour by rank, cycled. */
const DOTS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

/** The change against the previous period: ▲ 12, ▼ 3 or "no change". */
export function Delta({ topic, className }: { topic: Topic; className?: string }) {
  const n = topic.count - topic.previous_count;
  return <span className={cn("tabular-nums text-muted-foreground", className)}>{n > 0 ? `▲ ${n}` : n < 0 ? `▼ ${-n}` : "no change"}</span>;
}

/** Ranked topics as rows that drill in. Virtualised in its own scroll
 *  container, so a long list costs only what is on screen. */
export function TopicList({ topics, className }: { topics: Topic[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: topics.length, getScrollElement: () => ref.current, estimateSize: () => ROW, overscan: 8 });
  return (
    <div ref={ref} className={cn("max-h-[70vh] overflow-y-auto", className)}>
      <ol className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row, i) => (
          <TopicRow key={topics[row.index].id} topic={topics[row.index]} rank={row.index} top={row.start} stagger={i} />
        ))}
      </ol>
    </div>
  );
}

/** One row: rank, colour dot, label, delta, severity mix and count. The
 *  whole row is the button that drills in; its chevron slides in on hover
 *  and takes no space otherwise. Memoised on its topic, so a refetch that
 *  returns the same rows re-renders none of them. */
const TopicRow = memo(function TopicRow({ topic, rank, top, stagger }: { topic: Topic; rank: number; top: number; stagger: number }) {
  const { setFilters } = useFilters();
  return (
    <li className="absolute inset-x-0 transition-[top] duration-300 motion-reduce:transition-none" style={{ top, height: ROW }}>
      <button
        type="button"
        onClick={() => setFilters({ topic: topic.id }, { history: "push" })}
        aria-label={`${topic.label}, ${topic.count} summaries, ${severityText(topic.severity, ", ") || "no summaries"}`}
        className="group row-enter flex h-full w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ "--i": stagger } as CSSProperties}
      >
        <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{rank + 1}</span>
        <span className={cn("size-2 shrink-0 rounded-full", DOTS[rank % DOTS.length])} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{topic.label}</span>
        <Delta topic={topic} className="shrink-0 text-xs" />
        <SeverityBar counts={topic.severity} className="w-40 shrink-0 max-sm:hidden" />
        <span className="w-10 shrink-0 text-right tabular-nums">{topic.count}</span>
        <ChevronRightIcon
          aria-hidden
          className="h-4 w-0 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:w-4 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:w-4 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
        />
      </button>
    </li>
  );
});
