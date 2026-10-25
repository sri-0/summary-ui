import type { Metadata } from "next";
// Geist from its npm package (next/font/local underneath): the font files ship
// with the app, so nothing is fetched from Google at build or run time.
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Slopshop",
  description: "Slopshop: review AI summaries by date, severity, project and topic, and search documents, images and videos by meaning",

};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
