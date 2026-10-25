"use client";

import { SEVERITY_BG } from "@/components/common/severity-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFacets } from "@/lib/api/summaries";
import type { Facets } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { ATTRIBUTE_KEYS, type AttributeKey, DATE, type Filters, GROUPS, type Group, SEVERITIES, type Severity, useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { enAU } from "date-fns/locale";
import type { Dayjs } from "dayjs";
import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { DateRange } from "react-day-picker";

/** An IPv4 address or block typed into the IP filter, e.g. 10.0.0.0/24. */
const CIDR = /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/;
/** How many of a facet's values a list shows before "Show all". */
const ROWS = 8;

/** The filters the bar can show; a page passes the ones it uses. */
export type FilterKey = "severity" | "project" | "tag" | "topics" | "attr" | "date" | "q" | "group";

/** One choice in a multi-select: the value the URL carries, what to show for
 *  it and how many summaries in the set carry it. */
type Option = { value: string; label: string; count?: number };

/** What is edited apart from the URL until Apply: the list keys as the URL
 *  holds them (`attr` without its `ip:` values), the IP box's text and the
 *  range. */
type Draft = Pick<Filters, "severity" | "project" | "tag" | "topics" | "attr" | "from" | "to"> & { ip: string };

/** A multi-select: the URL key it writes (an attribute key writes `attr`
 *  values carrying its `prefix`), its label and the set's options. */
type Multi = { key: "project" | "tag" | "topics" | "attr"; prefix?: AttributeKey; label: string; options: Option[] };

/** The URL's values as a draft; the `ip:` attributes become the IP box's text. */
function fromUrl(f: Filters): Draft {
  return {
    severity: f.severity,
    project: f.project,
    tag: f.tag,
    topics: f.topics,
    attr: f.attr.filter((a) => !a.startsWith("ip:")),
    ip: f.attr
      .filter((a) => a.startsWith("ip:"))
      .map((a) => a.slice(3))
      .join(", "),
    from: f.from,
    to: f.to,
  };
}

/** The filters every list page shares, read from and written to the URL.
 *  As the `bar` (the default) it is one row: the search box (applied on
 *  Enter or when cleared), the Filters button opening a popover with every
 *  facet in `show` (and the dates, when it includes "date"), a chip per
 *  applied value (removing one applies at once), and at the right end
 *  `children` and, when `show` includes "group", how the table groups. As the
 *  `rail` it is a column for a page's inner sidebar: the search box, Group
 *  by, then each facet's values listed as rows to click (the popover keeps
 *  dropdowns, for room), with Clear at the foot. The
 *  facets are edited as a draft taken from the URL (again whenever the URL
 *  changes elsewhere, and when the popover opens): in the popover, Apply
 *  writes every shown key in one replace; in the rail each change writes at
 *  once, except the IP box, which writes on Enter or when it loses focus. The
 *  facets come from the page, or,
 *  when it passes none, from the summaries endpoint for the same filters.
 *  "Clear all" keeps the range and the drilled `topic`. */
export function FilterBar({
  facets,
  show = ["severity", "project", "tag", "topics", "attr", "q"],
  layout = "bar",
  children,
}: {
  facets?: Partial<Facets>;
  show?: FilterKey[];
  layout?: "bar" | "rail";
  children?: ReactNode;
}) {
  const { filters, group, setFilters } = useFilters();
  // A page with its own facets, even none yet, asks for nothing.
  const own = useFacets(filters, facets === undefined);
  const f = facets ?? own.data;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => fromUrl(filters));
  // The URL's values, as last drafted: a change from elsewhere (a chip, Back,
  // the sidebar's calendar) replaces the draft.
  const urlDraft = JSON.stringify(fromUrl(filters));
  const [seen, setSeen] = useState(urlDraft);
  if (seen !== urlDraft) {
    setSeen(urlDraft);
    setDraft(fromUrl(filters));
  }

  const keys = show.filter((k) => k !== "q" && k !== "group" && k !== "date");
  const lists: Multi[] = [
    { key: "project", label: "Projects", options: f?.projects?.map((p) => ({ value: p.id, label: p.name, count: p.count })) ?? [] },
    { key: "tag", label: "Tags", options: f?.tags?.map((t) => ({ value: t.tag, label: t.tag, count: t.count })) ?? [] },
    { key: "topics", label: "Topics", options: f?.topics?.map((t) => ({ value: t.id, label: t.label, count: t.count })) ?? [] },
  ];
  const attrs: Multi[] = ATTRIBUTE_KEYS.filter((k) => k !== "ip").map((k) => ({
    key: "attr",
    prefix: k,
    label: k,
    options: f?.attributes?.[k]?.map((a) => ({ value: `${k}:${a.value}`, label: a.value, count: a.count })) ?? [],
  }));
  const ips = draft.ip
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = ips.filter((s) => !CIDR.test(s));
  const rail = layout === "rail";
  /** The draft's picks for a multi-select: an attribute's are the `attr`
   *  values carrying its prefix. */
  const pickedIn = (m: Multi) => draft[m.key].filter((a) => !m.prefix || a.startsWith(`${m.prefix}:`));
  const toggleIn = (m: Multi, v: string) => {
    const picked = pickedIn(m);
    const others = draft[m.key].filter((a) => !picked.includes(a));
    edit({ ...draft, [m.key]: [...others, ...(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v])] });
  };

  const chips = keys.flatMap((k) =>
    filters[k].map((v) => ({
      key: `${k}:${v}`,
      label: k === "attr" ? v.replace(":", ": ") : (lists.find((m) => m.key === k)?.options.find((o) => o.value === v)?.label ?? v),
      capitalize: k === "severity",
      remove: () => setFilters({ [k]: filters[k].filter((x) => x !== v) }),
    })),
  );
  // Only the keys this bar shows count: a page that keeps its own `q` (search)
  // must not see a "Clear all" for it.
  const active = chips.length > 0 || (show.includes("q") && !!filters.q);
  const cleared = Object.fromEntries(show.filter((k) => k !== "group" && k !== "date").map((k) => [k, null]));

  /** Writes a draft to the URL in one replace, leaving out IPs that are not
   *  addresses or blocks yet. */
  function commit(d: Draft) {
    const ok = d.ip
      .split(",")
      .map((s) => s.trim())
      .filter((s) => CIDR.test(s));
    setFilters({
      severity: d.severity,
      project: d.project,
      tag: d.tag,
      topics: d.topics,
      attr: [...d.attr, ...ok.map((s) => `ip:${s}`)],
      ...(show.includes("date") && { from: d.from, to: d.to }),
    });
  }
  /** A change to the draft, written at once by the rail. */
  function edit(d: Draft) {
    setDraft(d);
    if (layout === "rail") commit(d);
  }
  function apply() {
    commit(draft);
    setOpen(false);
  }

  const sections = (
    <>
      {show.includes("date") && <DateSection draft={draft} setDraft={edit} />}
      {show.includes("severity") && (
        <FacetList
          label="Severity"
          dots
          options={SEVERITIES.map((s) => ({ value: s, label: s, count: f?.severity?.[s] }))}
          picked={draft.severity}
          onToggle={(v) => edit({ ...draft, severity: SEVERITIES.filter((x) => (x === v ? !draft.severity.includes(x) : draft.severity.includes(x))) })}
        />
      )}
      {lists
        .filter((m) => keys.includes(m.key))
        .map((m) =>
          rail ? (
            <FacetList key={m.key} label={m.label} options={m.options} picked={pickedIn(m)} onToggle={(v) => toggleIn(m, v)} />
          ) : (
            <MultiSelect key={m.key} multi={m} picked={pickedIn(m)} onToggle={(v) => toggleIn(m, v)} />
          ),
        )}
      {show.includes("attr") && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Attributes</legend>
          <Label htmlFor="filter-ip" className="text-xs font-normal text-muted-foreground">
            IP address or CIDR
          </Label>
          <Input
            id="filter-ip"
            placeholder="10.0.0.0/24, 10.1.2.3"
            value={draft.ip}
            aria-invalid={invalid.length > 0}
            className="bg-card"
            onChange={(e) => setDraft({ ...draft, ip: e.target.value })}
            onBlur={() => layout === "rail" && invalid.length === 0 && commit(draft)}
            onKeyDown={(e) => e.key === "Enter" && layout === "rail" && invalid.length === 0 && commit(draft)}
          />
          {invalid.length > 0 && <p className="text-xs text-destructive">Not an IPv4 address or block: {invalid.join(", ")}</p>}
          {attrs.map((m) =>
            rail ? (
              <FacetList key={m.prefix} label={m.label} options={m.options} picked={pickedIn(m)} onToggle={(v) => toggleIn(m, v)} />
            ) : (
              <MultiSelect key={m.prefix} multi={m} picked={pickedIn(m)} onToggle={(v) => toggleIn(m, v)} />
            ),
          )}
        </fieldset>
      )}
    </>
  );
  const footer = (
    <div className={cn("flex gap-2", rail ? "justify-start px-6 py-3" : "justify-end p-2")}>


      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setFilters(cleared);
          setOpen(false);
        }}
      >
        Clear
      </Button>
      {layout === "bar" && (
        <Button size="sm" disabled={invalid.length > 0} onClick={apply}>
          Apply
        </Button>
      )}
    </div>
  );
  const groupBy = show.includes("group") && (
    <div className="flex flex-col gap-1.5">
      <span id="group-by" className="text-xs font-medium text-muted-foreground">
        Group by
      </span>
      <ToggleGroup type="single" variant="outline" size="sm" aria-labelledby="group-by" value={group} onValueChange={(g) => g && setFilters({ group: g as Group })} className="flex-wrap">
        {GROUPS.map((g) => (
          <ToggleGroupItem key={g} value={g} className="bg-card capitalize data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
            {g}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  if (layout === "rail")
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          {show.includes("q") && <SearchBox value={filters.q} onChange={(q) => setFilters({ q })} className="w-full" />}
          {groupBy}
          {sections}
        </div>
        {footer}
      </div>
    );


  return (
    <div className="flex flex-wrap items-center gap-2">
      {show.includes("q") && <SearchBox value={filters.q} onChange={(q) => setFilters({ q })} className="sm:w-56" />}
      {keys.length > 0 && (
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) setDraft(fromUrl(filters));
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="bg-card">
              <ListFilterIcon data-icon="inline-start" />
              {chips.length > 0 ? `Filters · ${chips.length}` : "Filters"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 gap-0 p-0">
            <div className="flex max-h-[min(70vh,32rem)] flex-col gap-3 overflow-y-auto p-3">{sections}</div>
            <Separator />
            {footer}
          </PopoverContent>
        </Popover>
      )}
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className={cn("pr-1", c.capitalize && "capitalize")}>
          {c.label}
          <button
            type="button"
            aria-label={`Remove ${c.label}`}
            onClick={c.remove}
            className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      {active && (
        <Button variant="ghost" size="xs" onClick={() => setFilters(cleared)}>
          Clear all
        </Button>
      )}
      {(groupBy || children) && (
        <div className="ml-auto flex items-center gap-2">
          {groupBy}
          {children}
        </div>
      )}
    </div>
  );
}

/** The presets: each is the start of a range that ends today. */
const presets: { label: string; from: (today: Dayjs) => Dayjs }[] = [
  { label: "Today", from: (t) => t },
  { label: "7 days", from: (t) => t.subtract(6, "day") },
  { label: "30 days", from: (t) => t.subtract(29, "day") },
  { label: "90 days", from: (t) => t.subtract(89, "day") },
  { label: "This year", from: (t) => t.startOf("year") },
];

/** The dates section: the presets and a month, editing the draft's range. A
 *  click picks one day; a second click on another day makes them a range; a
 *  click while a range is shown starts over, as in the sidebar. The month
 *  shown starts at the draft's end. */
function DateSection({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [month, setMonth] = useState(() => dayjs(draft.to).toDate());
  const today = dayjs();
  const selected: DateRange = { from: dayjs(draft.from).toDate(), to: dayjs(draft.to).toDate() };
  function onSelect(_range: DateRange | undefined, clicked: Date) {
    const day = dayjs(clicked).format(DATE);
    if (draft.from === draft.to && day !== draft.from) setDraft({ ...draft, ...(day < draft.from ? { from: day, to: draft.from } : { from: draft.from, to: day }) });
    else setDraft({ ...draft, from: day, to: day });
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">Dates</legend>
      <div className="flex flex-wrap gap-0.5">
        {presets.map((p) => {
          const range = { from: p.from(today).format(DATE), to: today.format(DATE) };
          return (
            <Button
              key={p.label}
              variant="ghost"
              size="xs"
              aria-pressed={draft.from === range.from && draft.to === range.to}
              className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              onClick={() => {
                setDraft({ ...draft, ...range });
                setMonth(today.toDate());
              }}
            >
              {p.label}
            </Button>
          );
        })}
      </div>
      <Calendar mode="range" locale={enAU} month={month} onMonthChange={setMonth} selected={selected} onSelect={onSelect} className="p-0" />
    </fieldset>
  );
}

/** A facet's values as rows to click, each with its count, the picked ones
 *  filled; past ROWS the rest sit behind "Show all". A severity row carries
 *  its dot. */
function FacetList({ label, options, picked, onToggle, dots }: { label: string; options: Option[]; picked: string[]; onToggle: (v: string) => void; dots?: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? options : options.slice(0, ROWS);
  return (
    <fieldset className="flex flex-col gap-0.5">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground capitalize">{label}</legend>
      {shown.map((o) => (
        <Button
          key={o.value}
          variant="ghost"
          size="sm"
          aria-pressed={picked.includes(o.value)}
          onClick={() => onToggle(o.value)}
          className="w-full justify-start font-normal aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        >
          {dots && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", SEVERITY_BG[o.value as Severity])} />}
          <span className={cn("min-w-0 flex-1 truncate text-left", dots && "capitalize")}>{o.label}</span>
          <span className={cn("text-xs text-muted-foreground tabular-nums", !o.count && "opacity-50")}>{o.count ?? 0}</span>
        </Button>
      ))}
      {options.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">None in this set.</p>}
      {options.length > ROWS && (
        <Button variant="ghost" size="xs" className="self-start text-muted-foreground" onClick={() => setAll(!all)}>
          {all ? "Show less" : `Show all ${options.length}`}
        </Button>
      )}
    </fieldset>
  );
}

/** One multi-select of the popover: a full-width row naming the facet and
 *  how many of its values are picked, opening a searchable list of the set's
 *  values with counts and a tick on each picked one. */
function MultiSelect({ multi: m, picked, onToggle }: { multi: Multi; picked: string[]; onToggle: (v: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full bg-card capitalize">
          {m.label}

          <span className="ml-auto font-normal text-muted-foreground normal-case">{picked.length > 0 && `${picked.length} picked`}</span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={`Search ${m.label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {m.options.map((o) => (
                <CommandItem key={o.value} value={o.value} keywords={[o.label]} data-checked={picked.includes(o.value)} onSelect={() => onToggle(o.value)}>

                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className={cn("text-xs text-muted-foreground tabular-nums", !o.count && "opacity-50")}>{o.count ?? 0}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** The search field, on the card surface so it stands out from the canvas:
 *  the text reaches the URL on Enter and when cleared (the × or an emptied
 *  box), never per keystroke; a change to the URL from elsewhere (Clear all,
 *  Back) replaces the text. */
function SearchBox({ value, onChange, className }: { value: string | null; onChange: (q: string | null) => void; className?: string }) {
  const [text, setText] = useState(value ?? "");
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value ?? "");
  }

  return (
    <InputGroup className={cn("h-7 w-full rounded-[min(var(--radius-md),12px)] bg-card", className)}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder="Search summaries"
        aria-label="Search summaries"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value) onChange(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && onChange(text || null)}
      />
      {text && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => {
              setText("");
              onChange(null);
            }}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
