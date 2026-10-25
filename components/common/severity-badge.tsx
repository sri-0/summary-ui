import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/url/filters";
import { cn } from "@/lib/utils";

const dot: Record<Severity, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
};

/** A severity as its label with a coloured dot: the colour never stands alone. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 capitalize", className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot[severity])} />
      {severity}
    </Badge>
  );
}
