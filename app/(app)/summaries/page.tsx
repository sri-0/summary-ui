import type { Metadata } from "next";
import { SummariesView } from "@/components/summaries/summaries-view";
import { Suspense } from "react";

export const metadata: Metadata = { title: "AI Summaries" };

export default function SummariesPage() {
  return (
    <Suspense>
      <SummariesView />
    </Suspense>
  );
}
