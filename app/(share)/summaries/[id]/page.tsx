import { SummaryPage } from "@/components/summaries/summary-report";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <SummaryPage />
    </Suspense>
  );
}
