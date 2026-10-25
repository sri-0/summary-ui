"use client";

import { ControlsetSelector } from "@/components/common/controlset-selector";
import { FilterBar } from "@/components/common/filter-bar";
import { LoadMore } from "@/components/common/load-more";
import { DocumentCard } from "@/components/search/document-card";
import { DocumentDialog } from "@/components/search/document-dialog";
import { TagCloud } from "@/components/search/tag-cloud";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useDocumentFacets, useSearch, useSuggestions } from "@/lib/api/search";
import { type Kind, KINDS, useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { CircleAlertIcon, SearchIcon, SearchXIcon, ShieldIcon, SparklesIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

const KIND_FILTER: Record<Kind, string> = { text: "Documents", image: "Images", video: "Videos", pdf: "PDFs" };

/** The AI search page: the query (run on submit, from the URL's `q`), the
 *  filter row (the kinds with the set's counts, the shared filter bar fed the
 *  documents' facets with the dates inside it, the control-set picker), and
 *  the matches as a grid of cards with Load more or the end mark beneath.
 *  The model's suggested searches sit above the query box, loading after the
 *  page; before a query the empty state offers the tag cloud. The query and
 *  the suggestions are made by the API as the user under the picked control
 *  set, so neither runs until one is picked; the facets need none and show at
 *  once. */
export function SearchView() {
  const { filters, setFilters } = useFilters();
  const controlset = useUiStore((s) => s.controlset);
  const search = useSearch(filters.q, filters);
  const matches = search.data?.pages.flatMap((p) => p.data) ?? [];
  const facets = useDocumentFacets(filters);
  const suggestions = useSuggestions(filters);
  const submit = (q: string) => void setFilters({ q: q || null });
  const open = (id: string) => void setFilters({ doc: id }, { history: "push" });
  // "All" stands for no kind picked: choosing it clears the kinds, and
  // choosing a kind while it shows drops it.
  const setKinds = (v: string[]) => void setFilters({ kind: (filters.kind.length && v.includes("all") ? [] : v.filter((k) => k !== "all")) as Kind[] });

  return (
    <main data-scroll className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">AI Search</h1>
            <p className="text-sm text-muted-foreground">Describe what you are after in plain words; the AI finds documents, images and videos by meaning</p>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          {controlset && (
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Suggested searches" aria-busy={suggestions.isPending}>
              {suggestions.isPending
                ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-6 w-56 rounded-md" />)
                : suggestions.data?.map((q) => (
                    <Button key={q} variant="outline" size="xs" className="bg-card" onClick={() => submit(q)}>
                      <SparklesIcon data-icon="inline-start" className="text-ai-from" />
                      {q}
                    </Button>
                  ))}
            </div>
          )}
          <SearchBox value={filters.q} disabled={!controlset} busy={search.isFetching} onSubmit={submit} />
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="multiple" variant="outline" size="sm" aria-label="Kind" value={filters.kind.length ? filters.kind : ["all"]} onValueChange={setKinds}>
              <ToggleGroupItem value="all">
                All
                {facets.data && <span className="text-muted-foreground tabular-nums">{facets.data.total}</span>}
              </ToggleGroupItem>
              {KINDS.map((k) => (
                <ToggleGroupItem key={k} value={k}>
                  {KIND_FILTER[k]}
                  {facets.data && <span className="text-muted-foreground tabular-nums">{facets.data.kinds.find((x) => x.kind === k)?.count ?? 0}</span>}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FilterBar facets={facets.data ?? {}} show={["project", "tag", "date"]} />
            <div className="ml-auto">
              <ControlsetSelector />
            </div>
          </div>
        </div>

        {!controlset ? (
          <Blank icon={<ShieldIcon />} title="No control set" description="Pick a control set at the right of the filter row: the AI search runs on your behalf under it." />
        ) : !filters.q ? (
          <Blank icon={<SparklesIcon />} title="What are you looking for?">
            <TagCloud tags={facets.data?.tags} />
          </Blank>
        ) : search.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg bg-card p-3">
                <Skeleton className="aspect-[16/10] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : search.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{search.error instanceof ApiError && search.error.status === 400 ? "Pick a control set first" : "Search didn't run"}</AlertTitle>
            <AlertDescription>{errorMessage(search.error)}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => void search.refetch()}>
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : matches.length === 0 ? (
          <Blank icon={<SearchXIcon />} title={`Nothing matched “${filters.q}”`} description="Try other words, or widen the kinds, filters and dates." />
        ) : (
          <div className="flex flex-col gap-2">
            {/* The search's own numbers, from its first page, above the results at the right. */}
            <p className="self-end text-xs text-muted-foreground tabular-nums">
              {matches.length} {matches.length === 1 ? "result" : "results"} · {search.data.pages[0].took_ms} ms · {search.data.pages[0].model}
            </p>
            <div className={cn("grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", search.isPlaceholderData && "opacity-70")}>
              {matches.map((d) => (
                <DocumentCard key={d.id} document={d} onOpen={open} />
              ))}
            </div>
            <LoadMore hasNextPage={search.hasNextPage} isFetchingNextPage={search.isFetchingNextPage} onLoadMore={() => void search.fetchNextPage()} end={{ loaded: matches.length, total: matches.length }} />

          </div>

        )}
      </div>
      <DocumentDialog />
    </main>
  );
}

/** The query field, on the card surface so it stands out from the canvas:
 *  typed text reaches the URL on Enter, not per keystroke, and a change to
 *  the URL from elsewhere (a suggestion, Back) replaces it. */
function SearchBox({ value, disabled, busy, onSubmit }: { value: string | null; disabled: boolean; busy: boolean; onSubmit: (q: string) => void }) {
  const [text, setText] = useState(value ?? "");
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value ?? "");
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text.trim());
      }}
    >
      <InputGroup className="h-11 rounded-xl bg-card">
        <InputGroupAddon>
          <SearchIcon className="size-5" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Describe what you are after…"
          aria-label="AI search"
          className="text-base [&::-webkit-search-cancel-button]:appearance-none"
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {(busy || text) && (
          <InputGroupAddon align="inline-end">
            {busy && <Spinner />}
            {text && (
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => {
                  setText("");
                  onSubmit("");
                }}
              >
                <XIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>
    </form>
  );
}

/** An empty state: an icon, a title, a line of help and, optionally, what
 *  to do next, centred beneath. */
function Blank({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children?: ReactNode }) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}

      </EmptyHeader>
      {children && <EmptyContent className="max-w-4xl items-center gap-4">{children}</EmptyContent>}

    </Empty>
  );
}
