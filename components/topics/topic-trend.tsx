"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Topic } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { SEVERITIES, useFilters } from "@/lib/url/filters";
import { memo } from "react";
import { Bar, BarChart, XAxis } from "recharts";

const config = {
  critical: { label: "Critical", color: "var(--severity-critical)" },
  high: { label: "High", color: "var(--severity-high)" },
  medium: { label: "Medium", color: "var(--severity-medium)" },
  low: { label: "Low", color: "var(--severity-low)" },
} satisfies ChartConfig;

/** Summaries per day of the range, stacked by severity; clicking a day
 *  narrows the range to it. Memoised on the trend: a chart that re-renders
 *  redraws every bar, and the view re-renders on every URL change. The bars
 *  are not focusable; the same numbers are in the rows and the header. */
export const TopicTrend = memo(function TopicTrend({ trend }: { trend: Topic["trend"] }) {
  const { setFilters } = useFilters();
  return (
    <ChartContainer config={config} className="h-24 w-full aspect-auto [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/50">
      <BarChart
        accessibilityLayer
        data={trend}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        style={{ cursor: "pointer" }}
        onClick={(s) => typeof s.activeLabel === "string" && setFilters({ from: s.activeLabel, to: s.activeLabel })}
      >
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          interval="preserveStartEnd"
          fontSize={10}
          height={20}
          tickFormatter={(d: string) => dayjs(d).format("D MMM")}
        />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => dayjs(String(d)).format("ddd D MMM YYYY")} />} />
        {SEVERITIES.map((s) => (
          <Bar key={s} dataKey={s} stackId="s" fill={`var(--color-${s})`} isAnimationActive={false} />
        ))}
      </BarChart>
    </ChartContainer>
  );
});
