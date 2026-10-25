import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { Suspense } from "react";

export const metadata: Metadata = { title: "AI Search" };

/** The semantic search page. The view reads the URL, so it renders inside
 *  Suspense and the shell streams around it. */
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
