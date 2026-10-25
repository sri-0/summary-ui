import { DocumentPage } from "@/components/search/document-view";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <DocumentPage />
    </Suspense>
  );
}
