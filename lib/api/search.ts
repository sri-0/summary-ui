/** Queries for the AI search: the documents closest to a query, the set's
 *  facets, and one document by id. Every call goes through the one client,
 *  which adds the picked control set as X-Control-Set. */

import { apiFetch } from "@/lib/api/client";
import type { DocumentFacets, SearchDocument, SearchResult } from "@/lib/api/types";
import { timeZone } from "@/lib/dayjs";
import { filterQuery, type Filters } from "@/lib/url/filters";
import { useUiStore } from "@/stores/ui-store";
import { type InfiniteData, keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

/** How many matches one page of a search holds. */
export const SEARCH_K = 24;

/** The documents closest to `q`, closest first, narrowed by kind, project,
 *  tag and the range, a page at a time. Nothing runs until there is a query
 *  and a control set; a filter change keeps the last matches on screen while
 *  the next load. */
export function useSearch(q: string | null, f: Filters) {
  const controlset = useUiStore((s) => s.controlset);
  const scope = { from: f.from, to: f.to, project: f.project, tag: f.tag, kind: f.kind, q };
  return useInfiniteQuery({
    queryKey: ["search", scope, controlset],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) => apiFetch<SearchResult>(`/v1/search${filterQuery(scope, { k: SEARCH_K, tz: timeZone, after: pageParam || undefined })}`, { signal }),
    getNextPageParam: (last) => last.next,
    enabled: !!q && !!controlset,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** How many documents the kind, project, tag and range filters match, by
 *  kind, project and tag, for the kind toggles, the filter bar and the tag
 *  cloud. Nothing is embedded, so it needs neither a query nor a control set;
 *  the previous counts stay on screen while the next load. */
export function useDocumentFacets(f: Filters) {
  const scope = { from: f.from, to: f.to, project: f.project, tag: f.tag, kind: f.kind };
  return useQuery({
    queryKey: ["document-facets", scope, timeZone],
    queryFn: ({ signal }) => apiFetch<DocumentFacets>(`/v1/documents/facets${filterQuery(scope, { tz: timeZone })}`, { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** One document by id. A document already in a loaded search seeds the query
 *  so the dialog opens with its header at once; a deep link fetches it. */
export function useDocument(id: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["document", id],
    queryFn: ({ signal }) => apiFetch<SearchDocument>(`/v1/documents/${id}`, { signal }),
    enabled: !!id,
    staleTime: 5 * 60_000,
    initialData: () =>
      queryClient
        .getQueriesData<InfiniteData<SearchResult>>({ queryKey: ["search"] })
        .flatMap(([, result]) => result?.pages ?? [])
        .flatMap((page) => page.data)
        .find((d) => d.id === id),
  });
}

/** Three example searches for the empty state, written by agentlite's
 *  suggestions model from the set's tags and projects (GET
 *  /v1/search/suggestions, as the user under the picked control set): asked
 *  once per filter set and control set, kept for the session, never retried. */
export function useSuggestions(f: Filters) {
  const controlset = useUiStore((s) => s.controlset);
  const scope = { from: f.from, to: f.to, project: f.project, tag: f.tag, kind: f.kind };
  return useQuery({
    queryKey: ["suggestions", scope, controlset],
    queryFn: ({ signal }) =>
      apiFetch<{ suggestions: string[] }>(`/v1/search/suggestions${filterQuery(scope, { tz: timeZone })}`, { signal }).then((r) => r.suggestions),
    enabled: !!controlset,
    staleTime: Infinity,
    retry: false,
  });
}
