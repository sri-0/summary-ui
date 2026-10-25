"use client";

import { SeverityBar } from "@/components/common/severity-bar";
import { SummaryList } from "@/components/summaries/summary-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GraphNode } from "@/lib/api/types";
import { type Filters, serializeFilters } from "@/lib/url/filters";
import { ExternalLinkIcon, HashIcon, ListIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useState } from "react";

/** A node next to the selected one, with the weight of the edge between them. */
export type Linked = { node: GraphNode; weight: number };

/** The selected node beside the canvas. For a topic: its cluster, count and
 *  severity mix, the topics it co-occurs with most, its top tags, a way to
 *  the topics page with the same range, and its summaries (the shared list)
 *  when asked for. For a tag: how many summaries carry it, the topics it is
 *  on, a way to the AI search filtered by it, and its summaries. */
export function NodePanel({
  node,
  color,
  topics,
  tags,
  filters,
  onSelect,
  onClose,
}: {
  node: GraphNode;
  color?: string;
  topics: Linked[];
  tags: Linked[];
  filters: Filters;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [showSummaries, setShowSummaries] = useState(false);
  const isTag = node.kind === "tag";
  const summaries: Filters = isTag ? { ...filters, topic: null, tag: [node.label] } : { ...filters, topic: null, topics: [node.id] };
  return (
    <aside data-scroll aria-label={node.label} className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-4" style={{ "--cluster": color } as CSSProperties}>
      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-1.5 text-xl font-semibold tracking-tight">
            {isTag && <HashIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
            <span className="truncate">{node.label}</span>
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-2 -mt-1 text-muted-foreground" onClick={onClose}>
            <XIcon />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {node.cluster_label && (
            <Badge variant="secondary" className="gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-(--cluster)" aria-hidden />
              {node.cluster_label}
            </Badge>
          )}
          {node.parent_label && <span>in {node.parent_label}</span>}
          <span>
            <span className="tabular-nums text-foreground">{node.count}</span> summaries
          </span>
        </div>
        {node.severity && <SeverityBar counts={node.severity} legend />}
      </header>

      <Links title={isTag ? "Topics" : "Related topics"} items={topics} unit="shared summaries" empty={isTag ? "No topic carries it." : "None co-occur."} onSelect={onSelect} />
      {!isTag && <Links title="Tags" items={tags} unit="summaries" empty="No tags in this range." onSelect={onSelect} />}

      <div className="flex flex-wrap gap-2">
        {isTag ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={serializeFilters("/search", { tag: [node.label], from: filters.from, to: filters.to })}>
              <SearchIcon data-icon="inline-start" />
              Search documents
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={serializeFilters("/topics", { topic: node.id, from: filters.from, to: filters.to })}>
              <ExternalLinkIcon data-icon="inline-start" />
              Open in Topics
            </Link>
          </Button>
        )}
        <Button variant="outline" size="sm" aria-pressed={showSummaries} onClick={() => setShowSummaries((v) => !v)}>
          <ListIcon data-icon="inline-start" />
          {showSummaries ? "Hide summaries" : "Show summaries"}
        </Button>
      </div>

      {showSummaries && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Summaries {isTag ? "tagged" : "in"} {node.label}</h3>
          <SummaryList filters={summaries} />
        </section>
      )}
    </aside>
  );
}

/** One list of linked nodes, heaviest first, each a row that selects it. */
function Links({ title, items, unit, empty, onSelect }: { title: string; items: Linked[]; unit: string; empty: string; onSelect: (id: string) => void }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="flex flex-col">
          {items.map(({ node: n, weight }) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
              >
                {n.kind === "tag" && <HashIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {weight} {weight === 1 ? unit.replace(/s$/, "") : unit}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
