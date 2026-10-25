"use client";

import { Toggle } from "@/components/ui/toggle";
import type { DocumentFacets } from "@/lib/api/types";
import { useFilters } from "@/lib/url/filters";

/** A chip's font size by where its count falls between the set's smallest and
 *  largest, in three steps. */
const STEPS = ["text-xs", "text-sm", "text-base"];

/** The set's tags as a centred cloud of chips, each with its count and
 *  sized by it, suggesting what to narrow by. Pressing a chip toggles the tag in the URL's `tag`
 *  filter, and the counts re-aggregate around the pick. Nothing renders when
 *  the set has no tags. */
export function TagCloud({ tags }: { tags?: DocumentFacets["tags"] }) {
  const { filters, setFilters } = useFilters();
  if (!tags?.length) return null;
  // Counts arrive highest first.
  const [max, min] = [tags[0].count, tags[tags.length - 1].count];
  const step = (count: number) => (max === min ? 1 : Math.min(2, Math.floor(((count - min) / (max - min)) * 3)));

  return (
    <section aria-label="Suggested tags" className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2">

      <h2 className="text-xs font-medium text-muted-foreground">Suggested tags</h2>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {tags.map((t) => (
          <Toggle
            key={t.tag}
            variant="outline"
            size="sm"
            pressed={filters.tag.includes(t.tag)}
            onPressedChange={(on) => setFilters({ tag: on ? [...filters.tag, t.tag] : filters.tag.filter((x) => x !== t.tag) })}
            className={STEPS[step(t.count)]}
          >
            {t.tag}
            <span className="text-xs text-muted-foreground tabular-nums">{t.count}</span>
          </Toggle>
        ))}
      </div>
    </section>
  );
}
