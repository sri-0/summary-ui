"use client";

import { SeverityBar } from "@/components/common/severity-bar";
import { SummaryList } from "@/components/summaries/summary-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GraphNode } from "@/lib/api/types";
import { type EdgeKind, type Filters, serializeFilters } from "@/lib/url/filters";
import { ExternalLinkIcon, ListIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useState } from "react";

/** A topic next to the selected one, with the weight of the edge between them. */
export type Related = { topic: GraphNode; weight: number };

const WEIGHT_WORDS: Record<EdgeKind, (w: number) => string> = {
  cooccurrence: (w) => `${w} shared ${w === 1 ? "summary" : "summaries"}`,
  tags: (w) => `${w} shared tags`,
};

/** The selected topic beside the canvas: what it is, its mix, the topics it
 *  relates to most by the drawn edges, a way to the topics page with the same
 *  range, and its summaries (the shared list) when asked for. */
export function TopicPanel({
  topic,
  color,
  related,
  kind,
  filters,
  onSelect,
  onClose,
}: {
  topic: GraphNode;
  color: string;
  related: Related[];
  kind: EdgeKind;
  filters: Filters;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [showSummaries, setShowSummaries] = useState(false);
  return (
    <aside data-scroll aria-label={topic.label} className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-4" style={{ "--cluster": color } as CSSProperties}>

      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{topic.label}</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-2 -mt-1 text-muted-foreground" onClick={onClose}>
            <XIcon />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-(--cluster)" aria-hidden />
            {topic.cluster_label}
          </Badge>
          {topic.parent_label && <span>in {topic.parent_label}</span>}
          <span>
            <span className="tabular-nums text-foreground">{topic.count}</span> summaries
          </span>
        </div>
        <SeverityBar counts={topic.severity} legend />
      </header>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Related topics</h3>
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground">None by {kind === "tags" ? "shared tags" : "co-occurrence"}.</p>
        ) : (
          <ol className="flex flex-col">
            {related.map(({ topic: t, weight }) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{WEIGHT_WORDS[kind](weight)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={serializeFilters("/topics", { topic: topic.id, from: filters.from, to: filters.to })}>
            <ExternalLinkIcon data-icon="inline-start" />
            Open in Topics
          </Link>
        </Button>
        <Button variant="outline" size="sm" aria-pressed={showSummaries} onClick={() => setShowSummaries((v) => !v)}>
          <ListIcon data-icon="inline-start" />
          {showSummaries ? "Hide summaries" : "Show summaries"}
        </Button>
      </div>

      {showSummaries && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Summaries in {topic.label}</h3>
          <SummaryList filters={{ ...filters, topic: null, topics: [topic.id] }} />
        </section>
      )}
    </aside>
  );
}
