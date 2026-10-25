"use client";

import { MessageResponse, type MessageResponseProps } from "@/components/ai-elements/message";
import { memo } from "react";

/** Markdown through AI Elements' Streamdown wrapper (GFM tables, code,
 *  math, mermaid). `streaming` text is repaired as it arrives (an unclosed
 *  link or emphasis) and animates in; finished text renders as it is.
 *  Streamdown applies streaming updates in a transition, which can leave the
 *  last one uncommitted, so a caller must stop streaming once its text is
 *  complete. `controls` and `className` pass through to Streamdown. */
export const Markdown = memo(function Markdown({
  children,
  streaming = false,
  ...props
}: Omit<MessageResponseProps, "children" | "mode" | "isAnimating"> & { children: string; streaming?: boolean }) {
  return (
    <MessageResponse mode={streaming ? "streaming" : "static"} isAnimating={streaming} {...props}>
      {children}
    </MessageResponse>
  );
});
