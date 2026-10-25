"use client";

import { Brand } from "@/components/common/brand";
import { CopyButton } from "@/components/common/copy-button";
import { Markdown } from "@/components/common/markdown";
import { SeverityBadge } from "@/components/common/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api/client";
import { summaryBodyOptions, useSummary } from "@/lib/api/summaries";
import { dayjs } from "@/lib/dayjs";
import { serializeFilters, useFilters } from "@/lib/url/filters";
import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

// Streamdown's own fullscreen portals fight the dialog's focus trap.
const controls = { table: { fullscreen: false }, mermaid: { fullscreen: false } };

/** One summary's report, as the dialog and the standalone page both show it:
 *  a flat header bar on the sidebar's surface (`lead` at the left, the
 *  dialog's Close or the page's brand; the title with the date beside it, its
 *  excerpt, then the metadata as uniform badges, each a link: the severity,
 *  project and tags to the summaries filtered by it, the topics to Explore,
 *  all with the current range; Share link, which copies the report's own
 *  route, and Copy markdown at the right), then the markdown, with its own
 *  heading, scrolling beneath on the card surface. The record and the body
 *  load by id, so a deep link works. */
export function SummaryReport({ id, lead }: { id: string; lead: ReactNode }) {
  const { filters } = useFilters();
  const range = { from: filters.from, to: filters.to };
  const summary = useSummary(id);
  const body = useQuery(summaryBodyOptions(id));
  const notFound = [summary.error, body.error].some((e) => e instanceof ApiError && e.status === 404);
  const s = summary.data;

  return (
    <>
      <header className="flex shrink-0 items-start gap-3 border-b bg-sidebar px-3 py-2.5 text-sidebar-foreground">
        <div className="self-center">{lead}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h1 className="min-w-0 truncate text-base leading-7 font-semibold">{s?.title ?? (notFound ? "Summary" : "")}</h1>
            {s && (
              <time dateTime={s.created_at} className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <ClockIcon className="size-3" aria-hidden />
                {dayjs(s.created_at).format("ddd D MMM YYYY, HH:mm")}
              </time>
            )}
          </div>
          {s && (
            <>
              <p className="line-clamp-2 text-sm text-muted-foreground">{s.excerpt}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={s.severity} href={serializeFilters("/summaries", { ...range, severity: [s.severity] })} />
                <Badge asChild variant="secondary">
                  <Link href={serializeFilters("/summaries", { ...range, project: [s.project.id] })}>{s.project.name}</Link>
                </Badge>
                {[s.topic, ...s.related_topics].map((t) => (
                  <Badge key={t.id} asChild variant="secondary">
                    <Link href={serializeFilters("/topics", { ...range, topic: t.id })}>{t.label}</Link>
                  </Badge>
                ))}
                {s.tags.map((t) => (
                  <Badge key={t} asChild variant="secondary">
                    <Link href={serializeFilters("/summaries", { ...range, tag: [t] })}>{t}</Link>
                  </Badge>
                ))}
              </div>
            </>
          )}

        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 self-center">
          {s && (
            <CopyButton text={new URL(`/summaries/${s.id}`, location.href).href} variant="outline" size="sm">
              Share link
            </CopyButton>
          )}
          <CopyButton text={body.data ?? ""} disabled={!body.data} variant="outline" size="sm">
            Copy markdown
          </CopyButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-card text-card-foreground">
        <article className="mx-auto max-w-4xl px-6 py-8">
          {notFound ? (
            <p className="text-sm text-muted-foreground">This summary isn&apos;t available.</p>
          ) : body.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-destructive">{errorMessage(body.error)}</p>
              <Button variant="outline" size="sm" onClick={() => void body.refetch()}>
                Retry
              </Button>
            </div>
          ) : body.data !== undefined ? (
            <Markdown controls={controls}>{body.data}</Markdown>
          ) : (
            <div className="flex flex-col gap-3" aria-busy>
              {[70, 100, 95, 60, 100, 90, 40, 100, 85, 100, 70, 30].map((w, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </article>
      </div>
    </>
  );
}

/** The report at its own route, /summaries/<id>, the share link's target:
 *  the same bar and body, led by the brand instead of a Close. */
export function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  return <SummaryReport id={id} lead={<Brand className="px-1" />} />;
}
