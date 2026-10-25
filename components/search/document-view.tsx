"use client";

import { Brand } from "@/components/common/brand";
import { CopyButton } from "@/components/common/copy-button";
import { Markdown } from "@/components/common/markdown";
import { KIND_LABEL } from "@/components/search/document-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL, ApiError, errorMessage } from "@/lib/api/client";
import { useDocument } from "@/lib/api/search";
import type { SearchDocument } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { serializeFilters, useFilters } from "@/lib/url/filters";
import { ClockIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

// Streamdown's own fullscreen portals fight the dialog's focus trap.
const controls = { table: { fullscreen: false }, mermaid: { fullscreen: false } };

/** One document, as the dialog and the standalone page both show it: a flat
 *  header bar (`lead` at the left, the dialog's Close or the page's brand;
 *  the title with the date beside it, its excerpt and the kind, project and
 *  tags, the project and tags linking to the AI search filtered by them with
 *  the current range, and the score; Share
 *  link, which copies the document's own route, Open summary and Download
 *  PDF at the right), then the document itself. Open summary calls
 *  `onOpenSummary` when given (the dialog swaps to the summary dialog) and
 *  otherwise links to the summary's own route. The record loads by id, so a
 *  deep link works. */
export function DocumentView({ id, lead, onOpenSummary }: { id: string; lead: ReactNode; onOpenSummary?: (summaryId: string) => void }) {
  const { filters } = useFilters();
  const range = { from: filters.from, to: filters.to };
  const { data: d, error, refetch } = useDocument(id);
  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <>
      <header className="flex shrink-0 items-start gap-3 border-b bg-sidebar px-3 py-2.5 text-sidebar-foreground">
        <div className="self-center">{lead}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h1 className="min-w-0 truncate text-base leading-7 font-semibold">{d?.title ?? (notFound ? "Document" : "")}</h1>
            {d && (
              <time dateTime={d.created_at} className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <ClockIcon className="size-3" aria-hidden />
                {dayjs(d.created_at).format("ddd D MMM YYYY, HH:mm")}
              </time>
            )}
          </div>
          {d && (
            <>
              <p className="line-clamp-2 text-sm text-muted-foreground">{d.excerpt}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{KIND_LABEL[d.kind]}</Badge>
                <Badge asChild variant="secondary">
                  <Link href={serializeFilters("/search", { ...range, project: [d.project.id] })}>{d.project.name}</Link>
                </Badge>
                {d.tags.map((t) => (
                  <Badge key={t} asChild variant="secondary">
                    <Link href={serializeFilters("/search", { ...range, tag: [t] })}>{t}</Link>
                  </Badge>
                ))}

                {d.score !== undefined && <span className="ml-1 text-xs text-muted-foreground tabular-nums">score {d.score.toFixed(2)}</span>}

              </div>
            </>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 self-center">
          {d && (
            <CopyButton text={new URL(`/documents/${d.id}`, location.href).href} variant="outline" size="sm">
              Share link
            </CopyButton>
          )}
          {d?.summary_id &&
            (onOpenSummary ? (
              <Button variant="outline" size="sm" onClick={() => onOpenSummary(d.summary_id!)}>
                <FileTextIcon data-icon="inline-start" />
                Open summary
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/summaries/${d.summary_id}`}>
                  <FileTextIcon data-icon="inline-start" />
                  Open summary
                </Link>
              </Button>
            ))}
          {d?.kind === "pdf" && (
            <Button asChild variant="outline" size="sm">
              <a href={`${API_URL}${d.content_url}`} download target="_blank" rel="noreferrer">
                <DownloadIcon data-icon="inline-start" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-card text-card-foreground">
        <article className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
          {notFound ? (
            <p className="text-sm text-muted-foreground">This document isn&apos;t available.</p>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-destructive">{errorMessage(error)}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : d ? (
            <DocumentBody document={d} />
          ) : (
            <Skeleton className="aspect-video w-full" aria-busy />
          )}
        </article>
      </div>
    </>
  );
}

/** The document at its own route, /documents/<id>, the share link's target:
 *  the same bar and body, led by the brand instead of a Close. */
export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentView id={id} lead={<Brand className="px-1" />} />;
}

/** The document itself, by kind: the media, with the caption or transcript
 *  after it; the title is in the header, and a text document's markdown
 *  carries its own. */
function DocumentBody({ document: d }: { document: SearchDocument }) {
  const content = `${API_URL}${d.content_url}`;
  switch (d.kind) {
    case "image":
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the API serves it with the user's token; there is nothing for the image loader to do */}
          <img src={content} alt={d.title} width={d.width} height={d.height} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
          {d.text && <p className="text-sm text-muted-foreground">{d.text}</p>}
        </>
      );
    case "video":
      return (
        <>
          <video controls preload="metadata" src={content} poster={d.thumbnail_url && `${API_URL}${d.thumbnail_url}`} className="mx-auto max-h-[70vh] w-full rounded-lg bg-black" />
          {d.text && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{d.text}</p>}
        </>
      );
    case "pdf":
      return d.text ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{d.text}</p> : null;
    default:
      return <Markdown controls={controls}>{d.text}</Markdown>;
  }
}
