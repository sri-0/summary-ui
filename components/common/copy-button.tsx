"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";

/** Copies text to the clipboard, and says so for a moment. Icon-only, named
 *  "Copy", unless it is given a label as children, which then names it. */
export function CopyButton({ text, children, ...props }: { text: string } & ComponentProps<typeof Button>) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={children ? undefined : copied ? "Copied" : "Copy"}
      title={children ? undefined : copied ? "Copied" : "Copy"}
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setCopied(true),
          () => {},
        )
      }
      {...props}
    >
      {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
      {children}
    </Button>
  );
}
