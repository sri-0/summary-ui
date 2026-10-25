import { TopicsView } from "@/components/topics/topics-view";
import { Suspense } from "react";

/** The topic discovery page. The view reads the URL, so it renders inside
 *  Suspense and the shell streams around it. */
export default function TopicsPage() {
  return (
    <Suspense fallback={null}>
      <TopicsView />
    </Suspense>
  );
}
