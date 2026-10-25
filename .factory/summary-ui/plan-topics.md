# Plan: summary-ui topic discovery page
Size: M · Risk: medium (depends on two sibling areas: the summaries list/modal component and the fixture strategy)

Design context used (no `.impeccable.md` exists in any of the three repos; taken from `request.md`): audience is the requester reviewing AI summaries; jobs are "find what matters in a range, explore by topic, open the report"; tone "fun/AI vibes, don't go too crazy", same bones as agentui/lineage-ui.

## Items

| # | Item | Type | Where | Notes |
|---|------|------|-------|-------|
| 1 | "topic discovery page … explore and drill down on topics" | change | new `app/(app)/topics/`, `components/topics/` | the page |
| 2 | "then see summaries/AI reports in those topics" | change | reuses the summaries list + full-screen artefact modal (other architect) | same component, not a copy |
| 3 | "entire app needs to be agentic" | change (interface only) | `lib/url/filters.ts`, a `useTopicsContext()` hook | chat architect owns the panel; this plan states what topics exposes |
| 4 | "livelier styling, same rough layout, still shadcn/react-query/Next/AI Elements" | change | tokens + motion on this page only | restrained |
| 5 | Which topic form (list / treemap / graph / hybrid)? | research | Options below | decided: hybrid |
| 6 | What is a topic relative to `tags`? | research | Data contract | decided: backend-minted label; fixture derives from tags |
| 7 | Backend topic extraction/clustering | out of scope | backend | UI only renders what `/v1/topics` returns |

## Research (verified unless marked inferred)

| Checked | Where | What it gives us |
|---|---|---|
| Library page frame: top bar, optional nav column, toolbar with search + grid/list toggle, card/row item, nav sections | `agentui/components/library/library.tsx:16-230` | the page frame and row/card for topics; `NavItem` is a `Link` with `replace` (`:223`) |
| Categories-on-the-left + cards, URL-held filter, `Suspense` wrapper | `agentui/components/skills/skills-view.tsx:47-148`, `agentui/app/(app)/skills/page.tsx` | pattern for URL-driven filters; page wraps the view in `<Suspense>` because it reads search params |
| "Open in place of the list, back button returns" | `agentui/components/artifacts/artifacts-view.tsx:45-73,229-258` | drill-in pattern: `?open=` replaces the list, back link keeps the filter query |
| Facet colours per value | `agentui/lib/colors.ts:26-31` | `colorsOf(values)` for topic identity dots (10 hues, fixed order) |
| AI accent tokens and `prefers-reduced-motion` handling | `agentui/app/globals.css:84-88,147-248` | `--ai-from/--ai-to`, `.ai-gradient`, `.ai-orb`; animations disabled under reduced motion at `:243` |
| shadcn chart wrapper = `ResponsiveContainer` + CSS vars + tooltip/legend | `lineage-ui/src/components/ui/chart.tsx:41-81` | any Recharts root goes inside `ChartContainer`; docs say "We do not wrap Recharts" and that `chart` now uses Recharts v3 (ui.shadcn.com/docs/components/chart) |
| Recharts 3.8.0 `Treemap`: `onClick(node)`, `content` renderer, `type: 'flat' \| 'nest'` (nest = built-in zoom + breadcrumb), `isAnimationActive: 'auto'` respects reduced motion, consumes ResponsiveContainerContext | `lineage-ui/node_modules/recharts/types/chart/Treemap.d.ts:41-166` | a treemap is possible inside `ChartContainer`; shadcn docs don't mention it |
| Stacked bar over time with `accessibilityLayer`, `isAnimationActive={false}` on bars ("each animation frame re-renders every bar"), chart memoised | `lineage-ui/src/components/data-table/data-table-chart/timeline-chart.tsx:107-113,304-360` | the volume-over-time chart pattern |
| Div-based part-to-whole bar (`Seg`) and a small `Card` with value + hint | `lineage-ui/src/components/dashboard/dashboard-charts.tsx:45-50,128-131` | a severity-mix bar without a chart instance per row |
| React Flow + elkjs graph, custom nodes | `lineage-ui/src/components/lineage/lineage-graph.tsx`, `layout.ts`, `nodes.tsx` | the graph option's cost: ~220 lines there before data |
| Date range picker with presets + calendar | `lineage-ui/src/components/custom/date-picker-with-range.tsx`, `lib/date-preset.ts` | reuse if the summaries architect doesn't already place one in the sidebar |
| `NuqsAdapter` in providers; nuqs 2.10.1 installed; `parseAsIsoDate` serialises `yyyy-mm-dd` (UTC midnight), `parseAsArrayOf` separator `","`, `clearOnDefault` defaults `true`, `createSerializer` exported | `lineage-ui/src/components/shell/providers.tsx:18`, `node_modules/nuqs/dist/index.js:216-223,346,379,482`, `dist/index.d.ts:504` | URL state parsers; `useQueryStates` takes `history`/`shallow` per hook or per call, `urlKeys` (nuqs.dev/docs/batching) |
| Virtualised rows | `lineage-ui/src/components/data-table/data-table-infinite.tsx:52,322-356` | `useVirtualizer` pattern for long topic lists |
| shadcn `empty` exists (`Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`) | ui.shadcn.com/docs/components/empty | empty states; neither repo has it yet |
| dataviz skill: "Compare magnitude → bar", "Part-to-whole → stacked bar (horizontal for many categories)", "More than ~7 classes → a table (+ chart)", status colours reserved and never colour-alone, filters in one row above charts; no treemap row | `dataviz/references/choosing-a-form.md:10-29`, `interaction.md:41-47` | argues for list + stacked bars over treemap/bubbles |
| frontend-design skill: no sparklines as decoration, no gradient text, no card grids of identical cards, no modals unless necessary, one orchestrated entrance beats scattered micro-interactions | skill body | shapes the "livelier" direction |

Not checked: Google Trends / GitHub topics / OpenSearch tag clouds (not needed to decide). Not verified: `motion`'s `useReducedMotion`/`MotionConfig reducedMotion` in the installed version (the CSS media query route at `globals.css:243` is verified and sufficient). Reproduced: n/a (no backend, empty repo).

## Scope

In: `/topics` page; ranked topic list with counts, severity mix and period delta; one volume-over-time chart; drill-down topic → (children if any) → summaries; URL state via nuqs shared with the summaries page; the data contract `GET /v1/topics` and `GET /v1/summaries?topic=`; what the AI result-set summary receives for a topic; what the agent can set and read; the fixture the contract implies.
Out: topic extraction/clustering (backend); the summaries list, card, artefact modal and result-set summary components (summaries architect); the chat panel and how the agent navigates (chat architect); the sidebar date picker (summaries architect; this plan only names the URL keys it must write); graph/co-occurrence endpoints (not chosen).

## Requirements

- R1 `/topics` lists the topics for the current range, ranked by count, each with label, count, delta vs the previous period of the same length, and a severity-mix bar; the list is virtualised past 60 rows.
- R2 The URL fully describes the view: `?topic=&from=&to=&severity=&project=&q=`; reload restores it; `topic` changes push history, filter changes replace it.
- R3 Picking a topic shows a breadcrumb (All topics / Topic / Child), the topic's header (count, severity mix, trend chart), its children when the backend returns any, then its summaries rendered by the summaries page's list component; opening a summary opens the same full-screen artefact modal.
- R4 One stacked bar chart (per day, stacked by severity) shows volume for the current level (all topics, or the chosen topic); clicking a bar narrows `from`/`to` to that day.
- R5 Back, Escape and the breadcrumb go up one level and keep the filters.
- R6 Empty, loading, error, no-backend and very-long-list states each render as specified below; errors that aren't content are toasts.
- R7 Everything is reachable by keyboard in the order breadcrumb → toolbar → list; the chart's information is also in the rows and header text; status colours carry a text label; reduced motion disables the entrance and layout animations.
- R8 The page exposes `filterParsers` + `serializeFilters()` for anything (the agent) that builds a `/topics` URL, and `useTopicsContext()` returning the view the user is looking at.
- R9 The AI result-set summary at the top of a topic's results receives `scope: {kind:'topic', topic:{id,label}, from, to, severity, project}` and the same filter the list used.

## Options

| Approach | Benefits | Issues | ±LOC | Reversible |
|---|---|---|---|---|
| a. Faceted explorer: ranked rows/cards + breadcrumbs, shared filters | reuses `library.tsx` frame outright; accessible by default (rows are links); scales to hundreds of topics (virtualised); the dataviz skill's answer for >7 categories | reads as "another library page"; little AI flavour without extra work | ~+300 | yes |
| b. Treemap (Recharts `Treemap` in `ChartContainer`), click to drill | one striking visual; `type:'nest'` gives zoom + breadcrumb for free | SVG rects aren't keyboard-reachable (would need a parallel list anyway); labels unreadable under ~40px; colour-by-severity-mix has no honest encoding (status colours are for status, magnitude wants one hue); shadcn docs don't show it; nest breadcrumb duplicates URL state | ~+200 chart +250 list | yes, but the list is needed regardless |
| c. Topic graph (React Flow + elkjs, as `lineage-graph.tsx`) | "explorable" feel; already have the layout code to copy | needs co-occurrence edges nothing produces yet; weak at ranking/magnitude; hardest a11y and mobile; ~350 lines before data; a graph of 200 nodes is noise | ~+350 +list | yes |
| d. Hybrid: (a) + one chart (volume over time, stacked by severity) + div severity bars per row | the list stays the a11y and ranking backbone; the chart adds the time dimension and a cheap drill (click a day); severity bars are divs (precedent `dashboard-charts.tsx:128`), so no chart instance per row; motion on rank reorder gives the "alive" feel | one more component than (a) | ~+420 | yes (chart is one file) |

Recommendation: d. It is (a) plus ~100 lines, reuses `library.tsx`, `chart.tsx` and `colors.ts` as they are, and gives the page two ways to explore (by topic, by day) without inventing data the backend can't supply. (b) and (c) both still need the list for accessibility, so they only add code.

## Design

Paths assume agentui's layout (no `src/`); the repo-setup architect's choice applies to all.

**Files**

| File | Lines | Purpose |
|---|---|---|
| `app/(app)/topics/page.tsx` | ~12 | `<Suspense><TopicsView/></Suspense>` (as `agentui/app/(app)/skills/page.tsx`) |
| `components/topics/topics-view.tsx` | ~150 | frame (`LibraryPage`), toolbar, breadcrumb, header, trend, list or drill-in, states |
| `components/topics/topic-list.tsx` | ~90 | ranked rows (`LibraryItem` in list view, or its own row if `LibraryItem` needs a preview-less variant); `useVirtualizer` past 60 |
| `components/topics/topic-trend.tsx` | ~60 | `ChartContainer` + `BarChart` stacked by severity; `onClick` → `setFilters({from, to})` |
| `components/common/severity-bar.tsx` | ~25 | div-based part-to-whole bar + `sr-only` text; shared with the summaries page's result header |
| `lib/api/topics.ts` | ~50 | `Topic` type, `useTopics(filter)`, keys `['topics', filter]`, `placeholderData: keepPreviousData` (as `agentui/lib/api/skills.ts:49-56`) |
| `lib/url/filters.ts` | ~30 | nuqs parsers shared by both pages + `serializeFilters` |
| `public/fixtures/v1/topics.json` | data | the fixture (shape below) |
| `AGENTS.md` (topics section, endpoints table) | ~25 | docs in the same commit |

**Interfaces**

```ts
// lib/url/filters.ts
export const SEVERITIES = ["critical","high","medium","low"] as const;
export const filterParsers = {
  topic: parseAsString,                                  // topic id; history: 'push'
  from: parseAsIsoDate.withDefault(startOfDefaultRange), // yyyy-mm-dd
  to: parseAsIsoDate.withDefault(today),
  severity: parseAsArrayOf(parseAsStringLiteral(SEVERITIES)), // ?severity=critical,high
  project: parseAsString,
  q: parseAsString,
};
export const serializeFilters = createSerializer(filterParsers); // serializeFilters('/topics', {...})
```
`useQueryStates(filterParsers, { history: 'replace' })` in the view; `setFilters({topic: id}, { history: 'push' })` per call (call-level options win). `clearOnDefault` is on by default so defaults don't pollute the URL.

```ts
// lib/api/topics.ts
export type Topic = {
  id: string; label: string; parent_id?: string;
  count: number; previous_count: number;                // same-length period before `from`
  severity: Record<"critical"|"high"|"medium"|"low", number>;
  trend: { date: string; critical: number; high: number; medium: number; low: number }[]; // per day in range
  children_count: number;
};
export type TopicList = { data: Topic[]; total: number; next?: string };
export function useTopics(f: {from: Date; to: Date; severity?: string[]; project?: string; q?: string; parent?: string}) // GET /v1/topics?…
```
Rows pass `topic` by reference; `TopicRow` is `memo`'d on it. `useTopicsContext()` (in `topics-view.tsx` or a tiny `lib/topics-context.ts`) returns `{ route: "/topics", topic?: Pick<Topic,"id"|"label"|"count"|"severity">, from, to, severity, project, q, visible: {label, count}[] /* top 10 */ }`, derived from the URL state and the query's data: nothing else holds state.

**Config**: `NEXT_PUBLIC_API_URL` only (the one client, as `agentui/lib/api/client.ts:8`). No new env vars. The default range (open question 3) is a constant in `lib/url/filters.ts` because it is URL semantics, not a tunable.

**Errors**: `ApiError` from the shared client; the view shows a query error inline where the list would be (it is content), with Retry; a failed `setFilters` can't happen. Unreachable server → `errorMessage()` wording ("Can't reach the server at …", `client.ts:47-52`) in the inline state, not a toast (nothing else is on the page).

**Data**: topics are read-only here; ids are backend-minted strings (UUIDv7 once a backend exists; the fixture uses the tag slug so a summary's tag chip and `/topics?topic=` agree). A topic's summaries come from `GET /v1/summaries?topic=<id>&from&to&severity&project&q` (the summaries page's endpoint with one more param), so the summaries list component takes the same filter object plus `topic`.

**Security**: reads only, with the user's token when auth arrives (the shared client); no identity headers added here; nothing loads from a CDN (geist bundled, Recharts local).

**Failure behaviour**: no backend → the inline unreachable state with the URL to set; `/v1/topics` 404 (old backend) → "Topics need a backend that serves /v1/topics"; a `topic` in the URL the backend doesn't know → the list state "Topic not found. Back to all topics" (link clears `topic`); `children_count>0` but children request fails → inline error under the header, summaries still load. No fallbacks: the UI never derives topics from summaries' tags client-side.

## UI

**Flow**
- Entry: sidebar "Topics" (`SidebarMenuButton`, as `agentui/components/sidebar/app-sidebar.tsx:106-113`); a tag chip on a summary card → `/topics?topic=<id>` (summaries architect adds the link); the agent → a URL from `serializeFilters`.
- Level 0 `/topics`: toolbar (search `q`, date range, severity toggle, project) · "All topics" trend chart · ranked list.
- Level 1 `?topic=a`: breadcrumb All topics › Security · header: label (display size), count and delta ("42 reports · ▲12 vs previous 30 days"), severity bar with legend text, trend chart · children list (only if `children_count>0`) · AI result-set summary (other architect) · summaries list.
- Level 2 `?topic=b` (a child): same screen; breadcrumb gains a crumb (`BreadcrumbEllipsis` collapses to the last two on mobile).
- Exits: breadcrumb crumbs; browser Back (pushes per `topic`); Escape → one level up; opening a summary → the shared full-screen modal, closing returns to the same URL.

**Screens and states**

| State | What shows |
|---|---|
| loading (first) | toolbar live; chart area `Skeleton` (`h-24`); 8 row skeletons with fixed widths (SSR-safe, as `app-sidebar.tsx:146`) |
| loading (filter change) | previous data stays (`keepPreviousData`), toolbar shows `Spinner` at its end; rows fade to 70% |
| success | as the flow; rows animate into their new rank order |
| empty (range has none) | `Empty`: title "No topics in this range", description "Widen the dates or clear filters.", action "Last 30 days" (sets from/to) |
| empty (search) | `Empty`: "Nothing matches “{q}”" + "Clear search" |
| error | inline `Alert` variant destructive above an empty list area: the server's message + Retry |
| no backend | same `Alert`: "Can't reach the server at {API_URL}. Start the backend or set NEXT_PUBLIC_API_URL." |
| very long list | virtualised rows (`useVirtualizer`, estimate 48px) inside the page's scroll container; a "Showing 1–200 of 1,240" line; `next` cursor → "Load more" button (as `artifacts-view.tsx:115-125`) |
| unknown topic | `Empty`: "Topic not found" + "All topics" |
| streaming AI summary | the other architect's component; it lives in its own subtree so its per-token renders don't touch the list |

**Components (registry, with paths once added)**: `components/ui/breadcrumb.tsx`, `badge.tsx`, `button.tsx`, `toggle-group.tsx` (severity multi-select, `type="multiple"`), `input-group.tsx` (search), `skeleton.tsx`, `spinner.tsx`, `alert.tsx`, `empty.tsx` (new to both repos), `tooltip.tsx`, `chart.tsx`, `sidebar.tsx`, `popover.tsx` + `calendar.tsx` (only if the date range control is this page's; otherwise the sidebar's). Hand-written shared: `components/library/library.tsx` (copied from agentui), `components/common/severity-bar.tsx`. AI Elements used here: none directly (`shimmer` belongs to the result-set summary).

**Layout**: desktop = `LibraryPage` with no nav column (filters are in the toolbar row, one left-aligned row above the chart per the dataviz skill); chart `h-24` full width; rows: rank (tabular, muted) · colour dot (`colorsOf(labels)`) + label · delta · severity bar (fixed `w-40`) · count (tabular) · chevron when `children_count>0`. Mobile (<640px): toolbar wraps (`library.tsx:68`), the severity bar drops under the label at full width, breadcrumb keeps the last two crumbs, chart `h-20` with 7-day ticks.

**Keyboard and focus**: Tab order breadcrumb → search → date range → severity group → project → rows (each row is one `Link`, stretched as `library.tsx:146`); Enter opens; Escape at level ≥1 goes up (one `keydown` listener on the view, ignored while a dialog/popover is open); focus moves to the breadcrumb's current crumb after a drill (`aria-live="polite"` region announces "Security · 42 reports"). Chart bars are not focusable: the same numbers are in the rows and header, and the date picker reaches every day.

**Accessibility**: rows `aria-label="Security, 42 reports, 5 critical, 12 high"`; severity bar `role="img"` with that label and a visible legend line (status colour never alone); `BarChart accessibilityLayer`; `aria-current="page"` on the crumb; contrast: severity tokens must pass AA on `--card` in both themes (define once, check with the dataviz validator when the summaries architect sets them); `prefers-reduced-motion`: entrance/layout animations off (CSS media query as `globals.css:243`; Recharts bars already `isAnimationActive={false}`).

**Visual direction (livelier, same bones)**: typographic hierarchy does the work: the chosen topic's label at `text-3xl/4xl tracking-tight` with the count as a quiet mono figure; the ranked list is rows, not a card grid; the only accent is the coral→teal `ai-gradient` as a 2px rule under the AI summary block and as the active breadcrumb dot (no gradient text, no glass); severity colours appear only in the bars and badges; one orchestrated entrance (rows stagger 20ms, 240ms ease-out, once per mount) and `motion` `layout` on rows when a filter re-ranks them; hover reveals the chevron/“Ask the agent” action by sliding in without taking space.

**Copy**: "Topics" · "All topics" · "Search topics" · "{n} reports" · "▲ 12 vs previous 30 days" / "▼ 3" / "no change" · "Subtopics" · "Reports in Security" · "Ask the agent about this topic" · "No topics in this range" · "Topic not found".

**Memoise**: `TopicRow` on `topic` ref; `TopicTrend` (`React.memo`, as `timeline-chart.tsx:113`) on `trend` ref; the parsed URL object from `useQueryStates` is stable per URL; `serializeFilters` is module-level; the AI summary stream in its own component; `useVirtualizer` row measure callback `useCallback`'d.

**Data the backend must supply (nothing produces today)**: the topic set itself (label, id, optional parent), per-topic counts for an arbitrary range, severity mix, per-day trend, previous-period count, children counts; `topic=` as a filter on `/v1/summaries`.

## Data contract

`GET /v1/topics?from=2026-09-25&to=2026-10-25&severity=critical,high&project=<id>&q=&parent=<id>&limit=200&after=<cursor>`
→ `{ data: Topic[] /* ranked by count desc */, total, next? }`. Omitting `parent` returns root topics; `parent=<id>` returns that topic's children. The topic in the header is `data.find(id)` from the parent list or, when opened cold from a URL, `GET /v1/topics/{id}?from&to&severity&project` → `Topic`.

`GET /v1/summaries?topic=<id>&from&to&severity&project&q&after&limit` (the summaries page's endpoint plus `topic`).

Topic vs tags: recommend a topic is a backend-minted label with an id (so the backend can later cluster or LLM-extract without a UI change); for the fixture, topics are derived from the summaries' `tags` (id = slug, label = tag) with one hand-written nested level (e.g. `security` → `credential-leaks`, `dependency-cves`) so R3's children path is testable. The UI never knows how topics were made.

Fixture: `public/fixtures/v1/topics.json` (root list, ~12 topics, 30 days of `trend`), `topics.{id}.json` per topic with children, served by the fixture client the other architect picks; a static fixture cannot honour `from`/`to`, so the fixture mode must label the toolbar "Fixture data" rather than filter client-side (open question 4).

## AI angle

- Result-set summary input for a topic (R9): `{ scope: {kind:'topic', topic:{id,label}, from, to, severity, project, q}, summaryIds: <ids on the first page> }`, same component and same backend call as the summaries page with `topic` added; the component streams in its own subtree.
- Agent → page: the agent sets the view by navigating to `serializeFilters('/topics', {topic, from, to, severity, project, q})`; the page has no other state, so nothing else is needed. Keys the agent may set: `topic`, `from`, `to`, `severity`, `project`, `q`.
- Page → agent: `useTopicsContext()` (shape above) is what the chat panel sends as context (transport is the chat architect's); "Ask the agent about this topic" opens the panel with the prompt "Summarise the {count} reports in {label} between {from} and {to}, most severe first" (pattern: `skills-view.tsx:108` `/chat?prompt=`).

## Acceptance checks

| AC | Steps | Expected |
|---|---|---|
| AC1 → R1 | open `/topics` | ranked rows with count, delta, severity bar; order matches `data` order of `GET /v1/topics` (check Network tab) |
| AC2 → R2 | pick "Security", set severity critical+high, reload | URL `?topic=security&severity=critical,high` (+from/to only if non-default); same view after reload |
| AC3 → R2 | from level 1 press browser Back | returns to all topics, filters kept |
| AC4 → R3 | open a topic with `children_count>0` | breadcrumb, header, Subtopics list, then the summaries list; open a summary → the same full-screen modal as on `/summaries`; close → URL unchanged |
| AC5 → R4 | click a bar on 12 Oct | URL `from=2026-10-12&to=2026-10-12`, list refetches (`GET /v1/topics?from=2026-10-12&to=2026-10-12`) |
| AC6 → R5 | press Escape at level 2 | level 1 shown, filters kept; Escape again → all topics |
| AC7 → R6 | stop the backend, reload | inline alert naming the API URL; Retry refetches |
| AC8 → R6 | range with no data | Empty state with "Last 30 days" action that resets from/to |
| AC9 → R1 | fixture with 500 root topics | DOM holds ~20 row elements while scrolling; scroll is smooth |
| AC10 → R7 | keyboard only | Tab order as specified; Enter on a row drills; focus lands on the current crumb; VoiceOver reads the row label with counts |
| AC11 → R7 | macOS Reduce Motion on | no entrance/layout animation |
| AC12 → R8 | in console `serializeFilters('/topics',{topic:'security',severity:['critical']})` | `/topics?topic=security&severity=critical`; navigating there shows that view |
| AC13 → R9 | open a topic | the result-set summary request body carries `scope.kind === 'topic'` and the same filter the list used |

Unit tests worth having: `lib/url/filters.ts` round-trip (parse(serialize(x)) === x for dates and the severity array) — it's the protocol the agent and both pages share. Nothing else (no glue tests).

## Steps

1. `lib/url/filters.ts` + `lib/api/topics.ts` + fixture JSON; `NuqsAdapter` in providers if not already there. Done: `useTopics` returns fixture data in a scratch page. Docs: AGENTS.md endpoints table row for `/v1/topics`.
2. `topics-view.tsx` + `topic-list.tsx` level 0 (toolbar, rows, states, virtualisation). Done: AC1, AC7, AC8, AC9.
3. Drill-down: breadcrumb, header, children, summaries list reuse, Escape/back. Done: AC2–AC4, AC6, AC10.
4. `topic-trend.tsx` with day click. Done: AC5.
5. `useTopicsContext()` + "Ask the agent" entry (prompt only; panel is the chat architect's). Done: AC12, AC13.
6. Motion + reduced motion, `Empty` copy, severity tokens check. Done: AC11. Docs: AGENTS.md "Topics" section (flow, URL keys, what the agent gets).

## Estimate

8 new files (+ 1–2 shadcn/registry adds: `empty`, `chart` if not already added by the summaries area), ~420 net lines of TypeScript, ~25 lines of docs.

## Open questions

1. Topic identity: backend-minted id+label, fixture derives from tags? Recommend yes (contract stable across any later extraction).
2. Hierarchy: support one optional level via `parent_id`/`children_count` with the fixture exercising it? Recommend yes (same list component, ~15 extra lines); deeper levels work for free.
3. Default range when `from`/`to` are absent: last 30 days declared in `lib/url/filters.ts` and shared with the summaries page? Recommend yes; the sidebar date control (summaries architect) must write the same keys.
4. Fixture and query params: static JSON ignores `from/to/severity`; show "Fixture data" in the toolbar rather than filtering client-side? Recommend yes (no fake state in the UI); the fixture architect may prefer a stub server in the infra repo, which would remove the label.
5. Severity tokens: `--severity-critical|high|medium|low` in `globals.css`, owned by the summaries architect, validated with the dataviz validator on both surfaces? Recommend yes; topics only consumes them.
6. Does the summaries page also get the volume chart? Recommend `topic-trend.tsx` moves to `components/common/volume-chart.tsx` if so; one component, two callers.
7. Day drill on bar click: keep? Recommend yes (one `onClick`, reuses the URL setters).
8. `q` search: server-side (`q=` param, as `/v1/skills?q=`) rather than filtering labels in the browser? Recommend server-side.
