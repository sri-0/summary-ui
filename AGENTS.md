<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# summary-ui

A Next.js app for reviewing AI summaries: a filterable, grouped table by
date range with a streamed AI digest, a full-screen view of each summary's markdown
report, and a topic discovery page. It is a client-side app that calls the
Go summaries API (`~/code/summary-api`) directly; nothing is served from a
CDN at runtime.

## Quick start

```bash
pnpm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8002
pnpm dev                        # http://localhost:3100 (:3000 is agentui)
pnpm typecheck && pnpm lint
```

The API runs locally on :8020 behind an auth gateway on :8002 that adds the
token; the UI talks to the gateway. The gateway's CORS allowlist includes
`http://localhost:3100`.

## Structure

| Path | What it holds |
|---|---|
| `app/page.tsx` | redirects to `/summaries` (`instant = false`: a redirect has nothing to validate) |
| `app/(app)/layout.tsx` | `SidebarProvider` → one `Suspense` → `AppSidebar` + `AppShell`; every client component reading the URL sits under it (`cacheComponents`) |
| `app/(app)/graph/` | the topic graph page |
| `app/(app)/summaries/page.tsx` | `<Suspense><SummariesView/></Suspense>` |
| `app/(app)/topics/` | the topic discovery page |
| `app/(app)/graph/` | the topic graph page |
| `app/(app)/search/` | the AI search page |
| `app/(share)/` | the share links' targets without the app frame: `summaries/[id]` and `documents/[id]`, each `<Suspense>` around the standalone page component, which reads the id with `useParams` |
| `components/shell/app-shell.tsx` | `SidebarInset`: the shell header (the only `SidebarTrigger`, the page's name from `pages` and, on the summaries page, the filter rail's toggle) on `bg-sidebar`, then a `ResizablePanelGroup` with the page in `main` and the chat panel's slot, and the one `SummaryDialog` |
| `components/sidebar/` | the sidebar (brand, the `pages` nav: AI Summaries, AI Search, Explore (`/topics`), Discover (`/graph`, the lucide graph-star); the theme toggle in its footer) and `DateNav`, the range calendar with severity dots |
| `components/summaries/` | `SummariesView` (the resizable filter rail, the header, the scroll column), `ResultDigest`, `SummaryList` (the grouped, virtualised table), `SummaryReport` (the header bar and body the dialog and the standalone page share, plus `SummaryPage` for `/summaries/[id]`), `SummaryDialog` |
| `components/topics/` | the topics page's components: `TopicsView`, `TopicList` (rows), `TopicCards` (the card grid and the cluster colours), `TopicTrend` |
| `components/graph/` | the Discover page: `GraphView` (toolbar, canvas, states), `layout.ts` (elkjs for the clusters, the tag columns beside them), `nodes.tsx` (topic, tag and cluster nodes), `NodePanel` (the selected topic or tag) |
| `components/search/` | the search page: `SearchView` (the suggested searches, the query, the filter row, states, the grid), `TagCloud` (the facets' tags as toggles), `DocumentCard`, `DocumentView` (the header bar and body the dialog and the standalone page share, plus `DocumentPage` for `/documents/[id]`), `DocumentDialog` |
| `components/common/` | shared hand-written pieces: `Brand` (the SLOPSHOP icon from `public/slopshop.svg` and the wordmark in Fredoka, `font-brand`, in the theme's text colour, in the sidebar and leading the standalone pages; `app/icon.svg` is the same icon as the favicon),
 `FilterBar` (as the bar: the search box, applied on Enter or when cleared, the Filters popover, whose draft Apply writes to the URL at once, the chips and Group by; as the `rail`: the same as a column that writes each change at once; it fetches its own facets from `/v1/summaries` when the page passes none, so a `facets` prop, even `{}`, means it fetches nothing), `Markdown` (Streamdown via AI Elements), `SeverityBadge`, `CopyButton`, `SeverityBar`, `ControlsetSelector` (the control-set picker), `LoadMore` (the foot of a paged list: the Load more button and, where a list shows one, the end mark) |
| `components/ui/`, `components/ai-elements/` | shadcn and AI Elements registry components, never hand-edited |
| `lib/api/` | every query: `client.ts` (the one fetch client), `summaries.ts`, `digest.ts`, `topics.ts`, `search.ts`, `me.ts`, `types.ts` |
| `lib/url/filters.ts` | the URL state (nuqs): parsers, `useFilters()`, `filterQuery()`, `serializeFilters()` |
| `stores/ui-store.ts` | client-only UI state: the chat panel's visibility, the filter rail's (`filtersOpen`), the Discover graph's options (`graph`), and the picked control set (all but the chat panel persisted in `localStorage` as `summary-ui.ui`)
 |
| `app/layout.tsx` | the fonts, all from npm packages through `next/font/local` so nothing is fetched at build or run time: Geist Sans and Mono (`geist`) and Fredoka (`@fontsource-variable/fredoka`, the wordmark's `--font-brand`) |
| `app/globals.css` | tokens (violet/indigo palette, light and dark, severity and AI accent colours),
 the `.ai-*` and row-entrance utilities, the frame surfaces keyed on registry `data-slot`s, calendar day markers, Streamdown table styling |

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | the summaries API base URL; required, the client throws without it |
| `NEXT_PUBLIC_AGENT_API_URL` | agentlite, for the chat panel when it is wired |
| `NEXT_PUBLIC_REACT_SCAN=0` | turns off the react-scan render overlay in `next dev` |

`.env.example` is the documentation; `.env.local` is ignored by git.

## The API it calls

All under `NEXT_PUBLIC_API_URL`, JSON unless noted; errors are `{"message"}` with 400/401/403/404 (the gateway may answer 502 when Keycloak is down).

| Call | Used by |
|---|---|
| `GET /v1/summaries?from&to&tz&severity=a,b&project=a,b&tag=a,b&topics=a,b&attr=ip:a,host:b&topic&q&limit=50&after` → `{ data, total, next?, facets }` | `useSummaries` (infinite, newest first); `useFacets` (`limit=1`, keyed on the filters, stale after a minute) for the filter bar's counts on every page; `facets` (severity, projects, tags, topics, attributes) are cross-filtered |
| `GET /v1/summaries/calendar?from&to&tz` → `{ days: [{ date, count, max_severity }] }` | `useCalendar`, the sidebar's day markers |
| `GET /v1/summaries/{id}` → `Summary` | `useSummary`, seeded from a loaded list when possible |
| `GET /v1/summaries/{id}/body` → `text/markdown` | `summaryBodyOptions`; prefetched when a row is hovered |
| `GET /v1/digest?<same filters>&tz[&refresh=1]` → `text/event-stream` of OpenAI chat-completion chunks, `data: [DONE]` last | `useDigest` (`experimental_streamedQuery` over each chunk's `delta.content`; cached an hour per filter set, so coming back asks nothing; `regenerate` sends `refresh=1`) |
| `GET /v1/topics?…&limit=50&after` → `{ data, total, next? }` (a topic's subtopics the same, with `parent`), `GET /v1/topics/{id}` | `useTopics` (infinite), `useTopic`; rows carry `cluster_id`/`cluster_label` |
| `GET /v1/topics/graph?from&to&tz&severity&project&tag&q` → `{ nodes, edges, clusters }` | `useTopicGraph`; nodes are topics (`kind` "topic", with cluster, root and severity) and the set's top tags (`kind` "tag", id `tag:<tag>`); edges are `cooccurrence` (topic–topic), `tag` (topic → tag) or `hierarchy`, each with a `weight` |
| `GET /v1/me` → `{ username, controlsets }` | `useMe`, the control-set picker |
| `GET /v1/search?q&k=24&after&kind=a,b&project&tag&from&to&tz` with `X-Control-Set` → `{ data: SearchDocument[], total, took_ms, model, next? }` | `useSearch` (infinite; `k` is the page size), closest first; 400 without the header, 403 for a control set that is not the user's, 502 when the embedding model refused |
| `GET /v1/documents/facets?kind&project&tag&from&to&tz` → `{ total, kinds: [{kind,count}], projects, tags }` | `useDocumentFacets`; the kind counts, the filter bar's projects and tags, and the tag cloud; each dimension is computed with the others applied; needs no `q` and no control set |
| `GET /v1/search/suggestions?kind&project&tag&from&to&tz` with `X-Control-Set` → `{ suggestions: string[] }` | `useSuggestions`; three example searches the model writes from the set's tags and projects, shown above the query box; kept for the session, never retried |
| `GET /v1/documents/{id}` → `SearchDocument`; `/content` streams the object (Range), `/thumbnail` a PNG | `useDocument`, seeded from a loaded search; `<img>`/`<video>` load `content_url`/`thumbnail_url` from `API_URL` directly |

`tz` is always the browser's IANA zone (`lib/dayjs.ts`), so the server buckets days the way the user sees them.

## Conventions

- The URL is the state: `?from&to&severity&project&tag&topics&attr&topic&q&group&view&kind&open&doc`. Lists are comma-separated; `attr` values are `key:value` (an `ip` may be a CIDR block). Filters replace history; opening a summary (`open`) or a document (`doc`) pushes, so Back closes it. Dates are `YYYY-MM-DD`; the range defaults to the last seven days. Changing the date never touches other filters; page links in the sidebar carry the range.
- Every query lives in `lib/api/` and goes through `apiFetch`/`apiText`/`apiResponse` in `client.ts`; `errorMessage()` is what a failure says to the user.
- `FilterBar` writes `q` on Enter or when its box is cleared, never per keystroke; the Filters popover edits a draft taken from the URL when it opens and Apply writes every key it shows in one replace; a chip's × and Clear all apply at once. As the `rail` (the summaries page, inside a borderless `ResizablePanel` beside the list whose handle is a short grip that shows only on hover
, shown while `filtersOpen`) every change writes at once and there is no Apply; the IP box writes on Enter or blur.
 IPs must be an IPv4 address or CIDR block, several comma-separated. With "date" in `show` the popover holds a Dates section (presets and a range calendar) that writes `from`/`to` on Apply.
- `SummaryList({ filters })` is a TanStack Table grouped by the URL's `group` (severity by default, in `SEVERITIES` order; groups collapse) and virtualises its flattened rows inside the nearest `[data-scroll]` ancestor, so a page that reuses it (topics does) renders it inside a `div[data-scroll]` scroll container; anything above the list in that container scrolls with it. Its columns are Time, Severity, Summary, Project and Topic (the primary topic's label; both plain text) and Tags (up to three `secondary` chips and a "+n"); attributes are not a column, since they are for filtering. `ResultDigest({ filters })` hides itself while the set is empty.
- Every list pages with an infinite query (`useInfiniteQuery`: `limit`, or `k` for search, is the page size, `after` the cursor, and `next` is present only while there is another page; callers flatten `data.pages` and read `total` from the first page). `LoadMore` at the foot of the list is the only way to the next page: nothing fetches on scroll. The summaries table and the search grid end in its mark ("End of results · n"), which says the list is complete; the topics page shows the button alone.
- `SummaryDialog` mounts once in the shell and opens from `open` in the URL; it returns focus to the row (`id="summary-<id>"`) that opened it. It renders `SummaryReport`, which the standalone route `/summaries/<id>` renders too: a header bar (a lead at the left: the dialog's Close, or the `Brand` on the standalone page; the title, its excerpt and the metadata as uniform `secondary` badges with the date as muted text; Share link, which copies the standalone route, and Copy markdown at the right) flat on the sidebar surface above a hairline, and the report, with its own heading, scrolling beneath on the card surface. Streamdown's table and mermaid fullscreen controls are off inside it.
- The shell header is the frame: it carries the only `SidebarTrigger` and the page's name, so pages render no trigger of their own. The sidebar's nav lists `pages` (AI Summaries, AI Search, Explore for `/topics`, Discover for `/graph`) and its footer holds the theme toggle. On the summaries page the header also carries the filter rail's toggle (`filtersOpen` in `stores/ui-store.ts`); the rail's Clear sits at its foot, at the left.

- Components are named `function` declarations with inline prop types; shadcn and AI Elements components are used as shipped and restyled through tokens and classes. Status colours (`bg-severity-*`) appear only for severity and never alone; the AI gradient only on AI-produced content and the brand.
- Theme: light is a flat violet-tinted canvas; dark a flat deep indigo canvas (there is no wash: every page, panel and the graph canvas sit on `--background`). The sidebar and the shell header sit flat on `--sidebar`; `--ai-from`/`--ai-to` are the accent sweep and `--ai-from-strong`/`--ai-to-strong` the same sweep at a lightness that carries `primary-foreground` text (AA checked in both themes). Utilities: `.ai-gradient` (fill), `.ai-gradient-strong` (fill for primary-foreground text), `.ai-text-gradient`, `.ai-edge` (a 1px gradient edge following the element's radius), `.ai-glow` (ambient glow behind AI content, in a `relative` parent). The primary button is put on the gradient by a rule keyed on the registry `data-slot` in `globals.css`, not by editing `components/ui/`; the sidebar's states (nav, calendar, presets) are the registry's opaque `sidebar-accent`, and `DateNav` sets the calendar's `--muted` to `--sidebar-accent` so the range band shows on the sidebar surface.
- Motion: `.row-enter` staggers the first window of rows once; hover actions slide in without taking space; `prefers-reduced-motion` turns the animations off.
- Dates render with dayjs; the calendar uses the `en-AU` locale so the server and browser agree.
- Checks: `pnpm typecheck`, `pnpm lint`, then the browser against the running API. Lint currently reports two errors inside registry files (`components/ai-elements/shimmer.tsx`, `hooks/use-mobile.ts`) that the new React Compiler rules raise; they are not edited here.

## Topics and the graph

- `/topics` (Explore in the nav, and headed Explore) shows the ranked topics as rows (`view=list`, the default) or as cards (`view=cards`): label, cluster badge, count, delta, severity mix and a per-day sparkline. Both levels (roots and a topic's subtopics) follow the view; a card drills like a row. The toolbar is the shared `FilterBar` (severity, project, tag, attr, q) with the view toggle as its children; the topics endpoint has no facets, so the bar's own `useFacets` query supplies the counts.
- `/graph` (Discover in the nav) shows how topics and tags connect: every topic in the range inside its cluster (React Flow; elkjs lays each cluster's topics out left to right by the edges among them, then packs the clusters with `rectpacking`), joined by co-occurrence edges whose stroke scales with weight, and the set's top tags as pill nodes in columns to the right of the clusters, each level with the topics it is on and joined to them by thinner `tag` edges; hierarchy edges are drawn faintly. Node sizes come from the layout and sit on the nodes themselves, and hover and selection reach nodes through `GraphState` context, so React Flow never re-measures. The React Flow canvas uses `--background` (`[--xy-background-color:var(--background)]`), so it is the page. Hovering a node highlights its neighbours; clicking a topic or a tag sets `topic` (replace; a tag's id is `tag:<tag>`) and opens `NodePanel` in a `ResizablePanel` at the right: for a topic its cluster, counts, severity, the topics it co-occurs with, its tags, "Open in Topics" (`/topics?topic=<id>` with the range) and "Show summaries" (the shared `SummaryList` with `topics=[id]`); for a tag its count, the topics it is on, "Search documents" (`/search?tag=<tag>` with the range) and its summaries (`tag=[tag]`). Cluster colours are `--chart-1..5` cycled in the order the clusters arrive (`clusterColors` in `topic-cards.tsx`) and appear only on the cluster's label and its topics' left accents: a cluster is a dashed outline with no fill. The header (title, counts) and the toolbar, the shared `FilterBar` (severity, project, tag, q) with the Options menu as its children, float over the canvas on a translucent strip, so the canvas and the details panel beside it (the one panel with a border, `border-l`) run the page's full height.
 Options (`graph` in `stores/ui-store.ts`, kept across reloads) are Fit to screen and what is drawn: tags, topic-to-tag edges, root-to-subtopic edges, the minimap.


## Search

- `/search` is the AI search over the multi-modal `documents` index; the page speaks of AI search, never semantic search. The query lives in the URL as `q` and runs on Enter (or an example chip), never per keystroke; `kind` (`text`, `image`, `video`, `pdf`; none means all), `project`, `tag` and the range narrow it. The filter row under the query box is the kind `ToggleGroup` with each kind's count (and the total on All) from `useDocumentFacets(filters)` (`GET /v1/documents/facets`, keyed on kind, project, tag, from, to and tz, never the control set, so it loads before one is picked, `staleTime` a minute, previous counts kept while the next load), the shared `FilterBar` fed `{ projects, tags }` from the same facets (so it never fetches summary facets) with `show={["project", "tag", "date"]}`, so the dates live inside its popover, and `ControlsetSelector` at the right end; every control is `size="sm"`. Above the query box, once a control set is picked, `useSuggestions(filters)` (`GET /v1/search/suggestions`, keyed on the filters and the control set) loads three example searches as chips, skeletons until they arrive; clicking one runs it. Before a query the empty state ("What are you looking for?") holds `TagCloud`, centred up to `max-w-4xl`: the facets' tags as `Toggle` chips with their counts, in three font sizes by count, pressed when the tag is in `tag`; pressing one toggles it there, so the counts re-aggregate.
 `useSearch(q, filters)` is keyed on all of those plus the control set, keeps the previous matches while the next load, and is disabled until both `q` and a control set exist; the loaded count, the first page's time and the model sit above the grid at the right, `LoadMore` below it (a k-NN search has no set total: the API's `total` is the neighbours found so far, so the count and the end mark use what is loaded).


- The API embeds the query as the user through agentlite, which needs `X-Control-Set`. `ControlsetSelector`, at the right end of the search page's filter row (only the search needs a control set), lists `useMe().controlsets`; nothing is selected until the user picks, the pick persists in `stores/ui-store.ts`, and `client.ts` then sends the header on every request (`currentControlset()`, a getter outside React). Without a pick the page shows "No control set" and the search box is disabled.
- Results are a flat card grid (`DocumentCard`, `id="document-<id>"`, `data-kind`): images and videos lead with the thumbnail (videos add a play badge and `m:ss`), documents with a three-line clamp, project and tags; every card ends in the score strip (`.ai-gradient` at `score` width). Clicking pushes `doc`; `DocumentDialog` (mounted in `SearchView`) renders `DocumentView`, which the standalone route `/documents/<id>` renders too, mirroring the summary report's header bar: the lead (Close, or the `Brand` standalone), the title, its excerpt and the kind, project and tags as secondary badges, the date and score as muted text, Share link (the standalone route), Open summary (in the dialog it swaps `doc` for `open`; standalone it links to `/summaries/<id>`) and Download PDF at the right. Beneath it the image is shown whole,
 the video with `controls preload="metadata"` from `content_url`, text as `Markdown`, and a PDF its text, the download in the header (the API's sandboxed CSP forbids framing it). "Open summary" swaps `doc` for `open`, so the shared `SummaryDialog` takes over.

## Reserved for the chat panel

`stores/ui-store.ts` holds `chatOpen`/`toggleChat`; `AppShell` renders a second `ResizablePanel` (`id="chat"`, 34% default, 24–60%) with a placeholder while `chatOpen` is true. No button toggles it yet, and nothing calls `NEXT_PUBLIC_AGENT_API_URL`. The panel will use the same AG-UI parsing as agentui.
