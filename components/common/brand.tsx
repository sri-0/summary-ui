"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

/** The brand: the SLOPSHOP app icon (public/slopshop.svg, from docs/SLOPSHOP
 *  Logo.html) and the wordmark, set in the lockup's rounded face (Fredoka,
 *  bundled from npm) in the theme's own text colour, a link to the
 *  summaries. The sidebar's header and the standalone report pages both lead
 *  with it. */
export function Brand({ href = "/summaries", className, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} {...props}>
      {/* An SVG from public/ is served as it is: the image optimiser does not take SVGs. */}
      <Image src="/slopshop.svg" alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-lg" />

      <span className="truncate font-brand text-lg leading-none font-bold tracking-tight uppercase">Slopshop</span>


    </Link>
  );
}
