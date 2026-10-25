"use client";

import { FilterBar } from "@/components/common/filter-bar";
import { LoadMore } from "@/components/common/load-more";
import { SeverityBar } from "@/components/common/severity-bar";
import { ResultDigest } from "@/components/summaries/result-digest";
import { SummaryList } from "@/components/summaries/summary-list";
import { TopicCards } from "@/components/topics/topic-cards";
import { Delta, TopicList } from "@/components/topics/topic-list";
import { TopicTrend } from "@/components/topics/topic-trend";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useTopic, useTopics } from "@/lib/api/topics";
import type { Topic } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { DATE, type Filters, SEVERITIES, useFilters, type View } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { useIsFetching } from "@tanstack/react-query";
import { CircleAlertIcon, HashIcon, LayoutGridIcon, ListIcon, SearchXIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

type SetFilters = ReturnType<typeof useFilters>["setFilters"];

/** The topic discovery page: the ranked roots for the range, or one topic
 *  (its header, trend, subtopics and summaries) when `topic` is in the URL.
 *  Everything shown is in the URL; a drill pushes history, a filter replaces it. */
export function TopicsView() {
  const { filters, open, view, setFilters } = useFilters();
  return (
    <main data-scroll className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        {filters.topic ? (
          <TopicDetail id={filters.topic} filters={filters} open={open} view={view} setFilters={setFilters} />
        ) : (
          <AllTopics filters={filters} view={view} setFilters={setFilters} />
        )}
      </div>
    </main>
  );
}

/** Level 0: the roots, with the range's volume per day summed across them. */
function AllTopics({ filters, view, setFilters }: { filters: Filters; view: View; setFilters: SetFilters }) {
  const { data, isPending } = useTopics(filters, null);
  const trend = useMemo(() => {
    const days = new Map<string, Topic["trend"][number]>();
    for (const t of data?.pages.flatMap((p) => p.data) ?? [])
      for (const d of t.trend) {
        const day = days.get(d.date) ?? { date: d.date, critical: 0, high: 0, medium: 0, low: 0 };
        for (const s of SEVERITIES) day[s] += d[s];
        days.set(d.date, day);
      }
    return [...days.values()];
  }, [data]);
  const from = dayjs(filters.from);
  const to = dayjs(filters.to);
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">
          {from.isSame(to, "day") ? to.format("D MMM YYYY") : `${from.format("D MMM")} – ${to.format("D MMM YYYY")}`}
          {data && <> · {data.pages[0].total} topics</>}
        </p>
      </header>
      <Toolbar view={view} setFilters={setFilters} />
      {isPending ? <Skeleton className="h-24 w-full" /> : trend.length > 0 && <TopicTrend trend={trend} />}
      <TopicRows parent={null} filters={filters} view={view} setFilters={setFilters} />
    </>
  );
}

/** Level 1: one topic, by id from the URL. Escape and the breadcrumb go up a
 *  level and keep the filters; a leaf's crumbs show its root. */
function TopicDetail({ id, filters, open, view, setFilters }: { id: string; filters: Filters; open: string | null; view: View; setFilters: SetFilters }) {
  const { data: topic, error, isPending, isPlaceholderData, refetch } = useTopic(id, filters);
  const crumb = useRef<HTMLSpanElement>(null);
  // Unknown until this topic (not the previous one, kept as placeholder) has loaded.
  const parent = topic && !isPlaceholderData ? topic.parent_id || null : undefined;
  const days = dayjs(filters.to).diff(filters.from, "day") + 1;
  const notFound = error instanceof ApiError && error.status === 404;

  // One listener: Escape goes up, unless a dialog or popover has the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || parent === undefined || open || document.activeElement?.closest("[role=dialog]")) return;
      setFilters({ topic: parent }, { history: "push" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, parent, setFilters]);

  // After a drill the row that had the focus is gone; the current crumb takes it and names the topic.
  useEffect(() => crumb.current?.focus(), [topic?.id]);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button type="button" onClick={() => setFilters({ topic: null }, { history: "push" })}>
                All topics
              </button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {parent && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => setFilters({ topic: parent }, { history: "push" })}>
                    {topic?.parent_label}
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          {topic && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage ref={crumb} tabIndex={-1} className="flex items-center gap-2 outline-none">
                  <span className="ai-gradient size-1.5 rounded-full" aria-hidden />
                  {topic.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {notFound ? (
        <EmptyState
          icon={<HashIcon />}
          title="Topic not found"
          description="No summary carries this topic."
          action="All topics"
          onAction={() => setFilters({ topic: null })}
        />
      ) : error ? (
        <LoadError title="Topic didn't load" error={error} retry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-96 max-w-full rounded-full" />
          <Skeleton className="mt-3 h-24 w-full" />
        </div>
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", isPlaceholderData && "opacity-70")}>
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{topic.label}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums text-foreground">{topic.count}</span> summaries · <Delta topic={topic} /> vs previous {days} days
            </p>
            <SeverityBar counts={topic.severity} legend className="max-w-lg" />
          </header>
          <Toolbar view={view} setFilters={setFilters} />
          <TopicTrend trend={topic.trend} />
          {topic.children_count > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Subtopics</h2>
              <TopicRows parent={id} filters={filters} view={view} setFilters={setFilters} />
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Summaries in {topic.label}</h2>
            <ResultDigest filters={filters} />
            <SummaryList filters={filters} />
          </section>
        </div>
      )}
    </>
  );
}

/** The shared filter bar (the topics endpoint has no facets, so the bar
 *  fetches the set's own) with the list/cards toggle; the range is the
 *  sidebar's. Every control writes the URL. */
function Toolbar({ view, setFilters }: { view: View; setFilters: SetFilters }) {
  const fetching = useIsFetching({ predicate: (q) => q.queryKey[0] === "topics" || q.queryKey[0] === "topic" });
  return (
    <FilterBar show={["severity", "project", "tag", "attr", "q"]}>
      <ToggleGroup type="single" variant="outline" size="sm" aria-label="View" value={view} onValueChange={(v) => v && setFilters({ view: v as View })}>
        <ToggleGroupItem value="list" aria-label="List">
          <ListIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="cards" aria-label="Cards">
          <LayoutGridIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      {fetching > 0 && <Spinner className="text-muted-foreground" />}
    </FilterBar>
  );
}

/** The ranked topics at one level, as rows or cards (`view`) with Load more
 *  beneath while there is another page (no end mark here), and their states:
 *  skeletons, an inline error with Retry, the empty states, or the list
 *  dimmed while a filter change refetches. */
function TopicRows({ parent, filters, view, setFilters }: { parent: string | null; filters: Filters; view: View; setFilters: SetFilters }) {
  const { data, error, isPending, isPlaceholderData, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useTopics(filters, parent);
  const topics = data?.pages.flatMap((p) => p.data) ?? [];
  if (isPending)
    return (
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-3 px-3">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-1.5 w-40 rounded-full max-sm:hidden" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    );
  if (error) return <LoadError title="Topics didn't load" error={error} retry={() => refetch()} />;
  if (topics.length === 0)
    return filters.q ? (
      <EmptyState icon={<SearchXIcon />} title={`Nothing matches “${filters.q}”`} action="Clear search" onAction={() => setFilters({ q: null })} />
    ) : (
      <EmptyState
        icon={<HashIcon />}
        title="No topics in this range"
        description="Widen the dates or clear filters."
        action="Last 30 days"
        onAction={() => setFilters({ from: dayjs().subtract(29, "day").format(DATE), to: dayjs().format(DATE) })}
      />
    );
  const className = cn("transition-opacity", isPlaceholderData && "opacity-70");
  return (
    <>
      {view === "cards" ? <TopicCards topics={topics} className={className} /> : <TopicList topics={topics} className={className} />}
      <LoadMore hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} onLoadMore={() => void fetchNextPage()} />
    </>
  );
}

/** A query that failed, where its content would be: the server's message, or
 *  where the server was looked for, and Retry. */
function LoadError({ title, error, retry }: { title: string; error: unknown; retry: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="xs" onClick={retry}>
          Retry
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** Nothing to list, and the one action that gets out of it. */
function EmptyState({ icon, title, description, action, onAction }: { icon: ReactNode; title: string; description?: string; action: string; onAction: () => void }) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onAction}>
          {action}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
