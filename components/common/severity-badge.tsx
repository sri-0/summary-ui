import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import Link from "next/link";

const dot: Record<Severity, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
};

/** A severity as its label with a coloured dot: the colour never stands
 *  alone. With `href` it is a link, as the report header's badges are. */
export function SeverityBadge({ severity, href, className }: { severity: Severity; href?: string; className?: string }) {
  const inner = (
    <>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot[severity])} />
      {severity}
    </>
  );
  return href ? (
    <Badge asChild variant="secondary" className={cn("gap-1.5 capitalize", className)}>
      <Link href={href}>{inner}</Link>
    </Badge>
  ) : (
    <Badge variant="secondary" className={cn("gap-1.5 capitalize", className)}>
      {inner}
    </Badge>
  );
}
