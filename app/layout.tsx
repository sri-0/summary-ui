import type { Metadata } from "next";
// Geist from its npm package (next/font/local underneath): the font files ship
// with the app, so nothing is fetched from Google at build or run time.
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

// The wordmark's rounded face, from Fontsource's npm package: bundled like
// Geist, so nothing is fetched at build or run time.
const fredoka = localFont({
  src: "../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});

/** The tab reads SLOPSHOP on its own and "SLOPSHOP · <page>" on every page
 *  that names itself. */
export const metadata: Metadata = {
  title: { default: "SLOPSHOP", template: "SLOPSHOP · %s" },

  description: "Slopshop: review AI summaries by date, severity, project and topic, and search documents, images and videos by meaning",

};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${fredoka.variable} h-full antialiased`}>

      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
