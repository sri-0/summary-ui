import type { ReactNode } from "react";

/** The standalone routes, the share links' targets (/summaries/<id>,
 *  /documents/<id>): the report or document fills the window, without the
 *  app frame; the brand at its left leads back to the app. */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh flex-col">{children}</div>;
}
