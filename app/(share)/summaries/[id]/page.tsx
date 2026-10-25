import type { Metadata } from "next";
import { SummaryPage } from "@/components/summaries/summary-report";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Report" };

export default function Page() {
  return (
    <Suspense>
      <SummaryPage />
    </Suspense>
  );
}
