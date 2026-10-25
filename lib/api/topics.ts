/** Queries for topics: the ranked list at one level, and one topic. */

import { apiFetch } from "@/lib/api/client";
import { PAGE_SIZE } from "@/lib/api/summaries";
import type { Topic, TopicList } from "@/lib/api/types";
import { timeZone } from "@/lib/dayjs";
import { filterQuery, type Filters } from "@/lib/url/filters";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

/** The topics with summaries in the filters' range: the roots, or the
 *  children of `parent`. Ranked by count, a page at a time. */
export function useTopics(f: Filters, parent: string | null) {
  const scope = { ...f, topic: null };
  return useInfiniteQuery({
    queryKey: ["topics", scope, parent],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      apiFetch<TopicList>(`/v1/topics${filterQuery(scope, { tz: timeZone, parent: parent ?? undefined, limit: PAGE_SIZE, after: pageParam || undefined })}`, { signal }),
    getNextPageParam: (last) => last.next,
    placeholderData: keepPreviousData,
  });
}

/** One topic's counts for the filters' range. */
export function useTopic(id: string | null, f: Filters) {
  const scope = { ...f, topic: null };
  return useQuery({
    queryKey: ["topic", id, scope],
    queryFn: ({ signal }) => apiFetch<Topic>(`/v1/topics/${id}${filterQuery(scope, { tz: timeZone })}`, { signal }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}
