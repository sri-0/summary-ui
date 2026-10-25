"use client";

import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/api/client";
import type { SearchDocument } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import type { Kind } from "@/lib/url/filters";
import { FileIcon, FileTextIcon, ImageIcon, type LucideIcon, PlayIcon, VideoIcon } from "lucide-react";
import { memo } from "react";

const MAX_TAGS = 3;

/** What each kind is called and drawn as, on cards and in the dialog. */
export const KIND_LABEL: Record<Kind, string> = { text: "Document", image: "Image", video: "Video", pdf: "PDF" };
const KIND_ICON: Record<Kind, LucideIcon> = { text: FileTextIcon, image: ImageIcon, video: VideoIcon, pdf: FileIcon };

/** One match in the results grid. Images and videos lead with their
 *  thumbnail (a video adds a play badge and its length); documents with
 *  their first lines, project and tags. Every card ends in the score strip.
 *  The whole card is the button that opens it. */
export const DocumentCard = memo(function DocumentCard({ document: d, onOpen }: { document: SearchDocument; onOpen: (id: string) => void }) {
  const Icon = KIND_ICON[d.kind];
  const media = d.kind === "image" || d.kind === "video";
  const thumbnail = d.thumbnail_url ?? (d.kind === "image" ? d.content_url : undefined);
  const extra = d.tags.length - MAX_TAGS;

  return (
    <button
      type="button"
      id={`document-${d.id}`}
      data-kind={d.kind}
      onClick={() => onOpen(d.id)}
      className="group flex flex-col overflow-hidden rounded-lg bg-card text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {media && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- the API serves it with the user's token; there is nothing for the image loader to do
            <img src={`${API_URL}${thumbnail}`} alt={d.title} loading="lazy" className="size-full object-cover" />
          ) : (
            <Icon className="absolute inset-0 m-auto size-8 text-muted-foreground" aria-hidden />
          )}
          {d.kind === "video" && (
            <>
              <span className="absolute inset-0 m-auto flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground" aria-hidden>
                <PlayIcon className="size-5 fill-current" />
              </span>
              {d.duration_ms !== undefined && (
                <span className="absolute right-2 bottom-2 rounded-md bg-background/80 px-1.5 text-[11px] leading-5 tabular-nums">{duration(d.duration_ms)}</span>
              )}
            </>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon className="size-3" aria-hidden />
            {KIND_LABEL[d.kind]}
          </span>
          <time dateTime={d.created_at} className="tabular-nums">
            {dayjs(d.created_at).format("D MMM YYYY")}
          </time>
        </div>
        <span className={media ? "truncate text-sm font-medium" : "line-clamp-2 text-sm font-medium"}>{d.title}</span>
        {!media && (
          <>
            <p className="line-clamp-3 text-xs text-muted-foreground">{d.excerpt}</p>
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="secondary">{d.project.name}</Badge>
              {d.tags.slice(0, MAX_TAGS).map((t) => (
                <span key={t} className="rounded-md bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground">
                  {t}
                </span>
              ))}
              {extra > 0 && <span className="text-[11px] leading-5 text-muted-foreground">+{extra}</span>}
            </div>
          </>
        )}
      </div>
      {d.score !== undefined && (
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="ai-gradient h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, d.score)) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{d.score.toFixed(2)}</span>
        </div>
      )}
    </button>
  );
});

/** "m:ss" for a video's length. */
function duration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
