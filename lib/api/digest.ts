/** The AI summary of a result set, streamed from GET /v1/digest as OpenAI
 *  chat-completion chunks and accumulated into one string per filter set.
 *  The server caches the finished text per user and filter set and answers
 *  a repeat in one chunk; the query never goes stale, so coming back to the
 *  same filters within the hour asks nothing. */

import { apiResponse } from "@/lib/api/client";
import { timeZone } from "@/lib/dayjs";
import { filterQuery, type Filters } from "@/lib/url/filters";
import { experimental_streamedQuery as streamedQuery, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

/** The part of a chat-completion chunk the digest reads. */
type ChatCompletionChunk = { choices: { delta: { content?: string } }[] };

/** Each chunk's `delta.content`, in order. The body is `data:` lines
 *  separated by blank lines and ends at `data: [DONE]`. With `refresh` the
 *  request asks the server to regenerate rather than answer from its cache. */
async function* digestStream(f: Filters, signal: AbortSignal, refresh: boolean): AsyncGenerator<string> {
  const res = await apiResponse(`/v1/digest${filterQuery(f, { tz: timeZone, refresh: refresh ? 1 : undefined })}`, { signal });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice("data:".length).trim();
        if (payload === "[DONE]") return;
        const content = (JSON.parse(payload) as ChatCompletionChunk).choices[0]?.delta.content;
        if (content) yield content;
      }
    }
  }
}

/** The digest query. A fetch whose `meta.refresh` is true regenerates; the
 *  key is the same, so the card keeps showing the one entry. */
export function digestOptions(f: Filters) {
  return queryOptions({
    queryKey: ["digest", f],
    queryFn: streamedQuery({
      streamFn: ({ signal, meta }) => digestStream(f, signal, meta?.refresh === true),
      reducer: (acc: string, chunk: string) => acc + chunk,
      initialValue: "",
      refetchMode: "reset",
    }),
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** The digest for the filters: `data` grows while `fetchStatus` is
 *  "fetching"; `refetch` reads it again (the server answers from its cache)
 *  and `regenerate` asks for a fresh one. Off while the set is empty. */
export function useDigest(f: Filters, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({ ...digestOptions(f), enabled });
  // The query holds any error for the card, so the promise's own rejection
  // has nothing to add.
  const regenerate = () => queryClient.fetchQuery({ ...digestOptions(f), meta: { refresh: true }, staleTime: 0 }).catch(() => undefined);
  return Object.assign(query, { regenerate });
}
