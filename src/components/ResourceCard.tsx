import Link from "next/link";
import type { SearchResult } from "@/lib/types";
import { RESOURCE_TYPE_LABELS } from "@/lib/types";
import { PaperclipIcon, TypeIcon } from "@/components/icons";
import BookmarkButton from "@/components/BookmarkButton";

export default function ResourceCard({ r }: { r: SearchResult }) {
  const authors =
    r.authors?.length > 0
      ? r.authors.slice(0, 3).join(", ") + (r.authors.length > 3 ? ", et al." : "")
      : "Unknown author";

  return (
    <Link
      href={`/resource/${r.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
    >
      {/* cardinal accent that grows on hover */}
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand transition-transform duration-200 group-hover:scale-x-100" />

      <div className="flex items-center gap-2 text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
          <TypeIcon type={r.type} className="h-3.5 w-3.5" />
          {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
        </span>
        {r.year && <span className="text-xs tabular-nums">{r.year}</span>}
        {r.file_path && (
          <PaperclipIcon className="h-4 w-4 text-muted" aria-label="Has attached file" />
        )}
        <span className="ml-auto">
          <BookmarkButton id={r.id} variant="card" />
        </span>
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary">
        {r.title}
      </h3>

      <p className="text-xs font-medium text-muted">{authors}</p>

      {r.abstract && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
          {r.abstract}
        </p>
      )}
    </Link>
  );
}
