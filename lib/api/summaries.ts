/** Queries for summaries: the filtered list, its facets, one summary, its
 *  body, and the calendar's day markers. Every call goes through the one client. */

import { apiFetch, apiText } from "@/lib/api/client";
import type { CalendarDay, Facets, Summary, SummaryList } from "@/lib/api/types";
import { timeZone } from "@/lib/dayjs";
import { filterQuery, type Filters } from "@/lib/url/filters";
import {
  type InfiniteData,
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const PAGE_SIZE = 50;

export function summariesOptions(f: Filters) {
  return infiniteQueryOptions({
    queryKey: ["summaries", f],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      apiFetch<SummaryList>(`/v1/summaries${filterQuery(f, { tz: timeZone, limit: PAGE_SIZE, after: pageParam || undefined })}`, {
        signal,
      }),
    getNextPageParam: (last) => last.next,
    placeholderData: keepPreviousData,
  });
}

/** The summaries matching the filters, newest first, a page at a time. */
export function useSummaries(f: Filters) {
  return useInfiniteQuery(summariesOptions(f));
}

/** The cross-filtered facets of the set matching the filters, from the list
 *  endpoint with a page of one row (the smallest page it serves). The filter
 *  bar asks for them itself, so a page whose endpoint has no facets (topics)
 *  still gets counts; a page that gives the bar its own facets passes
 *  `enabled` false and nothing is fetched. */
export function useFacets(f: Filters, enabled: boolean) {
  return useQuery({
    queryKey: ["facets", f],
    queryFn: ({ signal }) => apiFetch<SummaryList>(`/v1/summaries${filterQuery(f, { tz: timeZone, limit: 1 })}`, { signal }),
    select: (list): Facets => list.facets,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One summary by id. A summary already in a loaded list seeds the query so
 *  the dialog opens with its header at once; a deep link fetches it. */
export function useSummary(id: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["summary", id],
    queryFn: ({ signal }) => apiFetch<Summary>(`/v1/summaries/${id}`, { signal }),
    enabled: !!id,
    staleTime: 5 * 60_000,
    initialData: () =>
      queryClient
        .getQueriesData<InfiniteData<SummaryList>>({ queryKey: ["summaries"] })
        .flatMap(([, list]) => list?.pages ?? [])
        .flatMap((page) => page.data)
        .find((s) => s.id === id),
  });
}

/** A summary's markdown body, which never changes once written. */
export function summaryBodyOptions(id: string) {
  return queryOptions({
    queryKey: ["summary-body", id],
    queryFn: ({ signal }) => apiText(`/v1/summaries/${id}/body`, { signal }),
    staleTime: Infinity,
  });
}

/** The days in a range that have summaries, with their worst severity. */
export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar", from, to],
    queryFn: ({ signal }) => apiFetch<{ days: CalendarDay[] }>(`/v1/summaries/calendar${filterQuery({ from, to }, { tz: timeZone })}`, { signal }),
    staleTime: 60_000,
  });
}
