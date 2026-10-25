import type { Metadata } from "next";
import { GraphView } from "@/components/graph/graph-view";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Discover" };

/** The topic graph page. The view reads the URL, so it renders inside
 *  Suspense and the shell streams around it. */
export default function GraphPage() {
  return (
    <Suspense fallback={null}>
      <GraphView />
    </Suspense>
  );
}
