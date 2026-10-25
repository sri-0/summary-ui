"use client";

import { DocumentView } from "@/components/search/document-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDocument } from "@/lib/api/search";
import { useFilters } from "@/lib/url/filters";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useRef } from "react";

/** The full-screen view of one document, open while the URL carries `doc`:
 *  the shared view (components/search/document-view.tsx) led by a Close
 *  button; Open summary swaps `doc` for `open`, so the summary dialog takes
 *  over. Esc, Back and Close all clear `doc`. */
export function DocumentDialog() {
  const { doc, setFilters } = useFilters();
  const document = useDocument(doc);
  const close = () => void setFilters({ doc: null });
  // The dialog has no trigger element (it opens from the URL), so Radix has
  // nothing to return focus to; the card that opened it carries its id.
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (doc) lastOpen.current = doc;
  }, [doc]);

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && close()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          window.document.getElementById(`document-${lastOpen.current}`)?.focus();
        }}
        className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none motion-reduce:animate-none"
      >
        <DialogTitle className="sr-only">{document.data?.title ?? "Document"}</DialogTitle>
        <DialogDescription className="sr-only">The document and its details.</DialogDescription>
        {doc && (
          <DocumentView
            id={doc}
            lead={
              <Button variant="ghost" size="lg" onClick={close}>
                <ArrowLeftIcon data-icon="inline-start" className="size-5" />
                Close
              </Button>
            }
            onOpenSummary={(summaryId) => void setFilters({ doc: null, open: summaryId }, { history: "push" })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
