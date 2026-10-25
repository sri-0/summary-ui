"use client";

import { LoadMore } from "@/components/common/load-more";
import { SeverityBadge } from "@/components/common/severity-badge";
import { SEVERITY_BG } from "@/components/common/severity-bar";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "@/lib/api/client";
import { summaryBodyOptions, useSummaries } from "@/lib/api/summaries";
import type { Summary } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { DATE, type Filters, type Group, SEVERITIES, type Severity, hasFilters, useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  columnGroupingFeature,
  createColumnHelper,
  createExpandedRowModel,
  createGroupedRowModel,
  flexRender,
  rowExpandingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircleIcon, ChevronDownIcon, InboxIcon } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

const ROW_ESTIMATE_PX = 56;
const GROUP_ROW_ESTIMATE_PX = 36;
const OVERSCAN_ROWS = 8;
/** Rows in the first window enter staggered; later ones only fade in. */
const STAGGER_ROWS = 20;
const MAX_TAGS = 3;

const features = tableFeatures({
  columnGroupingFeature,
  groupedRowModel: createGroupedRowModel(),
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});
const helper = createColumnHelper<typeof features, Summary>();

/** The columns' widths; the trailing ones give way on narrow screens. */
const widths: Record<string, string> = {
  day: "flex w-16 shrink-0",
  severity: "flex w-24 shrink-0",
  summary: "flex min-w-0 flex-1 whitespace-normal",
  project: "hidden w-28 shrink-0 lg:flex",
  topic: "hidden w-48 shrink-0 lg:flex",
  tags: "hidden w-48 shrink-0 2xl:flex", // the rail on the summaries page takes the room below 2xl
};

/** The table's columns. Each column's id is the `group` value that groups
 *  by it; Time groups by the day. */
function columns(multiDay: boolean) {
  return helper.columns([
    helper.accessor("created_at", {
      id: "day",
      header: "Time",
      getGroupingValue: (s) => dayjs(s.created_at).format(DATE),
      cell: ({ getValue }) => {
        const at = dayjs(getValue());
        return (
          <time dateTime={getValue()} className="text-xs leading-4 text-muted-foreground tabular-nums">
            {at.format("HH:mm")}
            {multiDay && <span className="block">{at.format("D MMM")}</span>}
          </time>
        );
      },
    }),
    helper.accessor("severity", { header: "Severity", cell: ({ getValue }) => <SeverityBadge severity={getValue()} /> }),
    helper.accessor("title", {
      id: "summary",
      header: "Summary",
      cell: ({ row }) => (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{row.original.title}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">{row.original.excerpt}</span>
        </span>
      ),
    }),
    helper.accessor((s) => s.project.name, { id: "project", header: "Project", cell: ({ getValue }) => <span className="min-w-0 truncate text-sm">{getValue()}</span> }),
    helper.accessor((s) => s.topic.label, { id: "topic", header: "Topic", cell: ({ getValue }) => <span className="min-w-0 truncate text-sm">{getValue()}</span> }),
    helper.accessor("tags", {
      header: "Tags",
      // Up to MAX_TAGS chips and a "+n" for the rest.
      cell: ({ getValue }) => (
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {getValue()
            .slice(0, MAX_TAGS)
            .map((t) => (
              <Badge key={t} variant="secondary" className="min-w-0 shrink">
                <span className="truncate">{t}</span>
              </Badge>
            ))}
          {getValue().length > MAX_TAGS && <span className="shrink-0 text-xs text-muted-foreground">+{getValue().length - MAX_TAGS}</span>}
        </span>
      ),
    }),
  ]);
}

/** The summaries matching the filters as a table grouped by the URL's
 *  `group` (severity by default), newest first within a group, virtualised
 *  inside the nearest `[data-scroll]` ancestor so anything above it (the
 *  digest) scrolls with it, with Load more or the end mark at its foot.
 *  Opening a row puts its id in the URL as a Back step; hovering one fetches
 *  its body so the dialog opens full. */
export function SummaryList({ filters }: { filters: Filters }) {
  const { group, setFilters } = useFilters();
  const queryClient = useQueryClient();
  const { data: pages, error, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSummaries(filters);
  // Sorting by severity rank keeps the groups in SEVERITIES order and, the
  // sort being stable, each group newest first.
  const data = useMemo(() => {
    const items = pages?.pages.flatMap((p) => p.data) ?? [];
    return group === "severity" ? [...items].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)) : items;
  }, [pages, group]);
  const grouping = useMemo(() => (group === "none" ? [] : [group]), [group]);
  const cols = useMemo(() => columns(filters.from !== filters.to), [filters.from, filters.to]);
  const table = useTable({
    features,
    columns: cols,
    data,
    getRowId: (s) => s.id,
    state: { grouping },
    groupedColumnMode: false,
    initialState: { expanded: true },
    autoResetExpanded: false,
  });
  const rows = table.getRowModel().rows;

  const open = (id: string) => void setFilters({ open: id }, { history: "push" });
  const prefetch = (id: string) => void queryClient.prefetchQuery(summaryBodyOptions(id));

  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // Looked up lazily: on the first render the ref is still null, and the
  // virtualiser re-renders itself once it finds the element.
  const scrollEl = () => bodyRef.current?.closest<HTMLElement>("[data-scroll]") ?? null;
  const el = scrollEl();
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: scrollEl,
    estimateSize: (i) => (rows[i].getIsGrouped() ? GROUP_ROW_ESTIMATE_PX : ROW_ESTIMATE_PX),
    getItemKey: (i) => rows[i].id,
    overscan: OVERSCAN_ROWS,
    // Where the rows start inside the scroll container, so the window
    // accounts for what sits above them.
    scrollMargin: bodyRef.current && el ? bodyRef.current.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop : 0,
  });
  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-1" aria-busy>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>The summaries didn&apos;t load</AlertTitle>
        <AlertDescription>{errorMessage(error)}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={() => void refetch()}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  if (data.length === 0) {
    const narrowed = hasFilters(filters);
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>{narrowed ? "No summaries match these filters" : `No summaries ${rangeWords(filters.from, filters.to)}`}</EmptyTitle>
        </EmptyHeader>
        {narrowed && (
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => void setFilters({ severity: null, project: null, tag: null, topics: null, attr: null, q: null })}>
              Clear filters
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <>
      {/* The registry wraps the table in an overflow-x-auto container, which
          would hold the sticky header; the scroll column is the container. */}
      <div className="**:data-[slot=table-container]:overflow-visible">
        <Table className="grid">
          <TableHeader className="sticky top-0 z-10 grid bg-background/85 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="flex hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn("h-9 items-center text-xs text-muted-foreground", widths[h.column.id])}>
                    <table.FlexRender header={h} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody ref={bodyRef} className="relative grid" style={{ height: virtualizer.getTotalSize() }}>
            {items.map((item) => {
              const row = rows[item.index];
              const style = { top: item.start - virtualizer.options.scrollMargin, "--i": item.index < STAGGER_ROWS ? item.index : 0 } as CSSProperties;
              if (row.getIsGrouped()) {
                const expanded = row.getIsExpanded();
                return (
                  <TableRow key={row.id} data-index={item.index} ref={virtualizer.measureElement} className="absolute inset-x-0 flex bg-muted/40 hover:bg-muted/40" style={style}>
                    <TableCell colSpan={cols.length} className="flex w-full items-center py-1.5">
                      <button type="button" aria-expanded={expanded} onClick={row.getToggleExpandedHandler()} className="flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", !expanded && "-rotate-90")} />
                        {group === "severity" && <span aria-hidden className={cn("size-1.5 rounded-full", SEVERITY_BG[row.groupingValue as Severity])} />}
                        <span className={cn(group === "severity" && "capitalize")}>{groupLabel(group, row.groupingValue)}</span>
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">{row.subRows.length}</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              }
              const id = row.original.id;
              return (
                <TableRow
                  key={row.id}
                  id={`summary-${id}`}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  tabIndex={0}
                  onClick={() => open(id)}
                  // Without preventDefault the browser's Enter activation
                  // would click whatever the opening dialog focuses.
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    open(id);
                  }}
                  onMouseEnter={() => prefetch(id)}
                  onFocus={() => prefetch(id)}
                  className="row-enter absolute inset-x-0 flex cursor-pointer outline-none hover:bg-accent/40 focus-visible:bg-accent/40"
                  style={style}
                >
                  {/* The grouped-by column's leaf cells are "placeholders" to
                      TanStack, which `table.FlexRender` leaves empty; the
                      badge belongs on every row. */}
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("items-center", widths[cell.column.id])}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <LoadMore hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} onLoadMore={() => void fetchNextPage()} end={{ loaded: data.length, total: pages.pages[0].total }} />
    </>
  );
}

/** A group's heading: the day spelt out, otherwise the value itself. */
function groupLabel(group: Group, value: unknown) {
  return group === "day" ? dayjs(String(value)).format("ddd D MMM") : String(value);
}

/** "on 24 October" or "between 18 and 24 October". */
function rangeWords(from: string, to: string) {
  const a = dayjs(from);
  const b = dayjs(to);
  if (a.isSame(b, "day")) return `on ${a.format("D MMMM")}`;
  const start = a.isSame(b, "month") ? a.format("D") : a.format("D MMMM");
  return `between ${start} and ${b.format("D MMMM")}`;
}
