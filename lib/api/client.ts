/**
 * The one fetch client. Every query and mutation goes through it, so the base
 * URL, error shape and (later) identity live in one place. With the mock API
 * on (NEXT_PUBLIC_API_MOCK=1) the same calls are answered by a service worker.
 */

import { currentControlset } from "@/stores/ui-store";

const url = process.env.NEXT_PUBLIC_API_URL;
if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set: the summaries API base URL, see .env.example");

/** The summaries API base URL, without a trailing slash. */
export const API_URL = url.replace(/\/$/, "");

/** A response the server refused, with its status and message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** A JSON response as T. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiResponse(path, init);
  return (await res.json()) as T;
}

/** A response body as text, for markdown bodies and other non-JSON replies. */
export async function apiText(path: string, init?: RequestInit): Promise<string> {
  return (await apiResponse(path, init)).text();
}

/** The raw response, checked; the digest reads its body as a stream. Once
 *  the user has picked a control set, every request carries it as
 *  X-Control-Set: the search embeds the query as the user, and the API
 *  refuses that without one. */
export async function apiResponse(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const controlset = currentControlset();
  if (controlset) headers.set("X-Control-Set", controlset);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status, serverMessage(await res.text()) || `Request failed: ${res.status}`);
  return res;
}

/** What a failure says to the user: the server's message, or, when the server
 *  could not be reached at all, where it was looked for. */
export function errorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return `Can't reach the server at ${API_URL}.`;
  }
  return err instanceof Error ? err.message : String(err);
}

function serverMessage(body: string) {
  try {
    return (JSON.parse(body) as { message?: string }).message ?? body;
  } catch {
    return body;
  }
}
