"use client";

import { SummaryReport } from "@/components/summaries/summary-report";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSummary } from "@/lib/api/summaries";
import { useFilters } from "@/lib/url/filters";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useRef } from "react";

/** The full-screen view of one summary, open while the URL carries `open`:
 *  the shared report (components/summaries/summary-report.tsx) led by a
 *  Close button. Esc, Back and Close all clear `open`. */
export function SummaryDialog() {
  const { open, setFilters } = useFilters();
  const summary = useSummary(open);
  const close = () => void setFilters({ open: null });
  // The dialog has no trigger element (it opens from the URL), so Radix has
  // nothing to return focus to; the row that opened it carries its id.
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (open) lastOpen.current = open;
  }, [open]);

  return (
    <Dialog open={!!open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById(`summary-${lastOpen.current}`)?.focus();
        }}
        className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none motion-reduce:animate-none"
      >
        <DialogTitle className="sr-only">{summary.data?.title ?? "Summary"}</DialogTitle>
        <DialogDescription className="sr-only">The summary&apos;s full report.</DialogDescription>
        {open && (
          <SummaryReport
            id={open}
            lead={
              <Button variant="ghost" size="lg" onClick={close}>
                <ArrowLeftIcon data-icon="inline-start" className="size-5" />
                Close
              </Button>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
