import { SummariesView } from "@/components/summaries/summaries-view";
import { Suspense } from "react";

export default function SummariesPage() {
  return (
    <Suspense>
      <SummariesView />
    </Suspense>
  );
}
