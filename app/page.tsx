import { redirect } from "next/navigation";

// A page that only redirects has nothing for instant-navigation validation to
// check, and the redirect would be reported as a failure to render.
export const instant = false;

/** The root has no page of its own: the app opens on the summaries. */
export default function Home() {
  redirect("/summaries");
}
