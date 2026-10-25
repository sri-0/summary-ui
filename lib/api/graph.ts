/** The topic graph query: every topic in the filters' range as a node, the
 *  edges between them and the clusters the pipeline formed. */

import { apiFetch } from "@/lib/api/client";
import type { TopicGraph } from "@/lib/api/types";
import { timeZone } from "@/lib/dayjs";
import { filterQuery, type Filters } from "@/lib/url/filters";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

/** The graph for the filters' range, severity, project, tag and search. The
 *  topic selection and the list-only filters (`topics`, `attr`) never narrow
 *  it: the graph is what the selection is made from. */
export function useTopicGraph(f: Filters) {
  const scope = { ...f, topic: null, topics: [], attr: [] };
  return useQuery({
    queryKey: ["topic-graph", scope],
    queryFn: ({ signal }) => apiFetch<TopicGraph>(`/v1/topics/graph${filterQuery(scope, { tz: timeZone })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}
