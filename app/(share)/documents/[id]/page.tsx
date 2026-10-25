import type { Metadata } from "next";
import { DocumentPage } from "@/components/search/document-view";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Document" };

export default function Page() {
  return (
    <Suspense>
      <DocumentPage />
    </Suspense>
  );
}
