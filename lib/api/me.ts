/** The signed-in user, as the API reads them from the token. */

import { apiFetch } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

/** Who is signed in and which control sets they may search under. A token's
 *  claims do not change within a session, so it never goes stale. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => apiFetch<Me>("/v1/me", { signal }),
    staleTime: Infinity,
  });
}
