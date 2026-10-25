"use client";

import { SeverityBar, severityText } from "@/components/common/severity-bar";
import { Delta } from "@/components/topics/topic-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Topic } from "@/lib/api/types";
import { SEVERITIES, useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { type CSSProperties, memo } from "react";

/** The chart tokens, cycled per cluster: the dot beside a cluster's name, the
 *  accent on a graph node and the cluster's area share one colour. */
const CLUSTER_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Each cluster's colour, by its first appearance among `ids`. */
export function clusterColors(ids: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const id of ids) if (!colors.has(id)) colors.set(id, CLUSTER_COLORS[colors.size % CLUSTER_COLORS.length]);
  return colors;
}

/** Ranked topics as a grid of cards that drill in: each names its cluster and
 *  shows its count and delta, severity mix and the range's volume per day. */
export function TopicCards({ topics, className }: { topics: Topic[]; className?: string }) {
  const colors = clusterColors(topics.map((t) => t.cluster_id));
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {topics.map((t, i) => (
        <TopicCard key={t.id} topic={t} color={colors.get(t.cluster_id)!} stagger={i} />
      ))}
    </ol>
  );
}

/** One card. A stretched button makes the whole card the drill, so the text
 *  and bars stay plain content. Memoised on its topic, as the rows are. */
const TopicCard = memo(function TopicCard({ topic, color, stagger }: { topic: Topic; color: string; stagger: number }) {
  const { setFilters } = useFilters();
  const totals = topic.trend.map((d) => SEVERITIES.reduce((n, s) => n + d[s], 0));
  const max = Math.max(1, ...totals);
  return (
    <li className="row-enter" style={{ "--i": stagger, "--cluster": color } as CSSProperties}>
      <Card size="sm" className="relative h-full transition-colors hover:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <button
          type="button"
          onClick={() => setFilters({ topic: topic.id }, { history: "push" })}
          aria-label={`${topic.label}, ${topic.count} summaries, ${severityText(topic.severity, ", ") || "no summaries"}`}
          className="absolute inset-0 rounded-xl outline-none"
        />
        <CardHeader>
          <CardTitle className="truncate">{topic.label}</CardTitle>
          {topic.cluster_label && (
            <CardAction>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-(--cluster)" aria-hidden />
                {topic.cluster_label}
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{topic.count}</span>
            <Delta topic={topic} className="text-xs" />
          </p>
          <SeverityBar counts={topic.severity} legend />
          <div aria-hidden className="flex h-12 items-end gap-px">
            {totals.map((n, i) => (
              <div key={i} className="min-h-0.5 flex-1 rounded-sm bg-primary/25" style={{ height: `${(n / max) * 100}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    </li>
  );
});
