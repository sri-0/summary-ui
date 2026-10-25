"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useSidebar } from "@/components/ui/sidebar";
import { useCalendar } from "@/lib/api/summaries";
import { dayjs } from "@/lib/dayjs";
import { DATE, SEVERITIES, useFilters } from "@/lib/url/filters";
import { enAU } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

const presets = [
  { label: "Today", days: 1, end: 0 },
  { label: "Yesterday", days: 1, end: 1 },
  { label: "7 days", days: 7, end: 0 },
  { label: "30 days", days: 30, end: 0 },
];

/** The range picker in the sidebar: a month with a dot under each day that
 *  has summaries, coloured by its worst severity, and the usual presets. A
 *  click picks one day; a second click on another day makes them a range; a
 *  click while a range is shown starts over. The dates are the only filters
 *  it writes. */
export function DateNav() {
  const { filters, setFilters } = useFilters();
  const { setOpenMobile } = useSidebar();
  const [month, setMonth] = useState(() => dayjs(filters.to).toDate());
  const calendar = useCalendar(dayjs(month).startOf("month").format(DATE), dayjs(month).endOf("month").format(DATE));

  const selected: DateRange = { from: dayjs(filters.from).toDate(), to: dayjs(filters.to).toDate() };
  const days = calendar.data?.days;
  const modifiers = useMemo(() => {
    const dates = (filter: (d: { max_severity: string }) => boolean) =>
      (days ?? []).filter(filter).map((d) => dayjs(d.date).toDate());
    return {
      "has-summaries": dates(() => true),
      ...Object.fromEntries(SEVERITIES.map((s) => [s, dates((d) => d.max_severity === s)])),
    };
  }, [days]);

  function pick(range: { from: string; to: string }) {
    setFilters(range);
    setOpenMobile(false);
  }
  function onSelect(_range: DateRange | undefined, clicked: Date) {
    const day = dayjs(clicked).format(DATE);
    const single = filters.from === filters.to;
    if (single && day !== filters.from) {
      pick(day < filters.from ? { from: day, to: filters.from } : { from: filters.from, to: day });
    } else {
      pick({ from: day, to: day });
    }
  }
  function onPreset(p: (typeof presets)[number]) {
    const to = dayjs().subtract(p.end, "day");
    pick({ from: to.subtract(p.days - 1, "day").format(DATE), to: to.format(DATE) });
    setMonth(to.toDate());
  }

  return (
    <div className="flex flex-col gap-2">
      <Calendar
        mode="range"
        locale={enAU}
        numberOfMonths={1}
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={onSelect}
        modifiers={modifiers}
        modifiersClassNames={{
          "has-summaries": "day-has-summaries",
          critical: "day-critical",
          high: "day-high",
          medium: "day-medium",
          low: "day-low",
        }}
        // The registry draws the range band and today on --muted, which the
        // sidebar's surface all but matches in the light theme; inside the
        // calendar, muted is the sidebar's accent, the same opaque colour the
        // active nav item and the presets use.
        className="w-full bg-transparent p-0 [--cell-size:--spacing(8)] [--muted:var(--sidebar-accent)]"
      />
      <div className="flex flex-wrap gap-0.5">
        {presets.map((p) => {
          const to = dayjs().subtract(p.end, "day");
          const active = filters.to === to.format(DATE) && filters.from === to.subtract(p.days - 1, "day").format(DATE);
          return (
            <Button
              key={p.label}
              variant="ghost"
              size="xs"
              aria-pressed={active}
              className="px-1.5 text-muted-foreground aria-pressed:bg-sidebar-accent aria-pressed:text-sidebar-accent-foreground"
              onClick={() => onPreset(p)}
            >
              {p.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
