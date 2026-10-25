/**
 * The filters every page shares, held in the URL (nuqs) so a view is a link
 * and the agent can set it. Dates are YYYY-MM-DD; the range defaults to the
 * last seven days when the URL has none. Lists are comma-separated in the
 * URL and on the wire.
 */

import dayjs from "dayjs";
import { createSerializer, parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** The attribute keys summaries carry; a filter is `key:value`. A summary
 *  can carry several values of a key (the IPs it mentions), and an `ip`
 *  filter may be a CIDR block (`ip:10.0.0.0/24`). */
export const ATTRIBUTE_KEYS = ["ip", "host", "user", "region"] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** How the summaries table groups its rows. */
export const GROUPS = ["severity", "project", "topic", "day", "none"] as const;
export type Group = (typeof GROUPS)[number];

/** How the topics page shows topics. */
export const VIEWS = ["list", "cards"] as const;
export type View = (typeof VIEWS)[number];

/** Which edges the topic graph draws. */
export const EDGE_KINDS = ["cooccurrence", "tags"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

/** The kinds of document the search index holds. */
export const KINDS = ["text", "image", "video", "pdf"] as const;
export type Kind = (typeof KINDS)[number];

export const DATE = "YYYY-MM-DD";
const DEFAULT_DAYS = 7;

export const filterParsers = {
  from: parseAsString,
  to: parseAsString,
  severity: parseAsArrayOf(parseAsStringLiteral(SEVERITIES)).withDefault([]),
  project: parseAsArrayOf(parseAsString).withDefault([]),
  tag: parseAsArrayOf(parseAsString).withDefault([]),
  /** Any of these topics (leaf or root), for lists. */
  topics: parseAsArrayOf(parseAsString).withDefault([]),
  /** `key:value` attribute filters: any value within a key, every key. */
  attr: parseAsArrayOf(parseAsString).withDefault([]),
  /** The one topic drilled into on the topics page, or selected in the graph. */
  topic: parseAsString,
  q: parseAsString,
  /** The summary open in the full-screen dialog. */
  open: parseAsString,
  group: parseAsStringLiteral(GROUPS).withDefault("severity"),
  view: parseAsStringLiteral(VIEWS).withDefault("list"),
  edges: parseAsStringLiteral(EDGE_KINDS).withDefault("cooccurrence"),
  /** The document kinds the search page shows; none means every kind. */
  kind: parseAsArrayOf(parseAsStringLiteral(KINDS)).withDefault([]),
  /** The document open in the search page's dialog. */
  doc: parseAsString,
};

/** A page's filter query string: serializeFilters("/topics", { topic: "security" }). */
export const serializeFilters = createSerializer(filterParsers);

/** The filters a list request takes: the URL state with the range resolved. */
export type Filters = {
  from: string;
  to: string;
  severity: Severity[];
  project: string[];
  tag: string[];
  topics: string[];
  attr: string[];
  topic: string | null;
  q: string | null;
  kind: Kind[];
};

/** The last DEFAULT_DAYS days, ending today. */
export function defaultRange(): { from: string; to: string } {
  const today = dayjs();
  return { from: today.subtract(DEFAULT_DAYS - 1, "day").format(DATE), to: today.format(DATE) };
}

/** The URL's filters with the range resolved, the view settings, and the
 *  setter. Filter changes replace history; callers push when a change should
 *  be a Back step. */
export function useFilters() {
  const [state, setState] = useQueryStates(filterParsers, { history: "replace" });
  const range = state.from && state.to ? { from: state.from, to: state.to } : defaultRange();
  const filters: Filters = {
    from: range.from,
    to: range.to,
    severity: state.severity,
    project: state.project,
    tag: state.tag,
    topics: state.topics,
    attr: state.attr,
    topic: state.topic,
    q: state.q,
    kind: state.kind,
  };
  return { filters, open: state.open, doc: state.doc, group: state.group, view: state.view, edges: state.edges, setFilters: setState };
}

/** Whether any facet filter or search is set (the range always is). */
export function hasFilters(f: Filters): boolean {
  return f.severity.length > 0 || f.project.length > 0 || f.tag.length > 0 || f.topics.length > 0 || f.attr.length > 0 || !!f.q;
}

/** The filters as a query string for the API, omitting what is unset. */
export function filterQuery(f: Partial<Filters>, extra: Record<string, string | number | undefined> = {}): string {
  const params = new URLSearchParams();
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  for (const key of ["severity", "project", "tag", "topics", "attr", "kind"] as const) {
    const v = f[key];
    if (v?.length) params.set(key, v.join(","));
  }
  if (f.topic) params.set("topic", f.topic);
  if (f.q) params.set("q", f.q);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : "";
}
