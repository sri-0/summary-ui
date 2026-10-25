import { SEVERITIES, type Severity } from "@/lib/url/filters";
import { cn } from "@/lib/utils";

/** The severity colours as backgrounds, for the bar's segments and any dot
 *  that names a severity beside its label. */
export const SEVERITY_BG: Record<Severity, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
};

/** The non-zero counts as text, worst first: "5 critical · 12 high". */
export function severityText(counts: Record<Severity, number>, separator = " · ") {
  return SEVERITIES.filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(separator);
}

/** A part-to-whole bar of a set's severity mix: one segment per severity by
 *  share, named for assistive tech, and with `legend` the same counts as text
 *  beside it, so the status colours never stand alone. */
export function SeverityBar({ counts, className, legend }: { counts: Record<Severity, number>; className?: string; legend?: boolean }) {
  const total = SEVERITIES.reduce((n, s) => n + counts[s], 0);
  const text = severityText(counts) || "no summaries";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div role="img" aria-label={text} className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        {SEVERITIES.map(
          (s) => counts[s] > 0 && <div key={s} className={cn("h-full", SEVERITY_BG[s])} style={{ width: `${(counts[s] / total) * 100}%` }} />,
        )}
      </div>
      {legend && <span className="shrink-0 text-xs text-muted-foreground">{text}</span>}
    </div>
  );
}
