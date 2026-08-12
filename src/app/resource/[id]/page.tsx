import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFileUrl,
  getRelatedResources,
  getResource,
  getResourceTagIds,
  getTags,
} from "@/lib/queries";
import ResourceCard from "@/components/ResourceCard";
import { RESOURCE_TYPE_LABELS, type Resource } from "@/lib/types";
import { buildCitations } from "@/lib/citation";
import {
  ArrowLeftIcon,
  EditIcon,
  ExternalIcon,
  TypeIcon,
} from "@/components/icons";
import BookmarkButton from "@/components/BookmarkButton";
import CollectionPicker from "@/components/CollectionPicker";
import DeleteResourceButton from "@/components/DeleteResourceButton";
import CitationBlock from "@/components/CitationBlock";
import PdfPreview from "@/components/PdfPreview";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Defense-in-depth against stored XSS: even though the server action only
 * accepts http(s) URLs, rows written before that check (or directly to the
 * DB) must still never render a javascript:/data: href.
 */
function safeHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = (await getResource(id)) as Resource | null;
  if (!resource) notFound();

  const [tagIds, allTags, fileUrl] = await Promise.all([
    getResourceTagIds(id),
    getTags(),
    getFileUrl(resource.file_path),
  ]);
  const tags = allTags.filter((t) => tagIds.includes(t.id));
  const related = await getRelatedResources(id, tagIds);
  const user = await getCurrentUser();
  const isFaculty = user?.role === "faculty";
  const isPdf =
    resource.type === "pdf" ||
    resource.file_path?.toLowerCase().endsWith(".pdf");
  const externalUrl = safeHttpUrl(resource.url);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-navy"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to library
        </Link>
        {isFaculty && (
          <div className="flex items-center gap-2">
            <Link
              href={`/resource/${resource.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-bold transition-colors hover:bg-surface-2"
            >
              <EditIcon className="h-4 w-4" />
              Edit
            </Link>
            <DeleteResourceButton id={resource.id} />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          <TypeIcon type={resource.type} className="h-3.5 w-3.5" />
          {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
        </span>
        {resource.year && (
          <span className="text-xs tabular-nums text-muted">{resource.year}</span>
        )}
      </div>

      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {resource.title}
      </h1>
      {resource.authors?.length > 0 && (
        <p className="mt-1 text-sm text-muted">{resource.authors.join(", ")}</p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BookmarkButton id={resource.id} variant="detail" />
        <CollectionPicker id={resource.id} />
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg shadow-sm transition-colors hover:bg-primary-hover"
          >
            Open file
            <ExternalIcon className="h-4 w-4" />
          </a>
        )}
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-bold transition-colors hover:bg-surface-2"
          >
            Visit link
            <ExternalIcon className="h-4 w-4" />
          </a>
        )}
        {resource.doi && (
          <a
            href={`https://doi.org/${resource.doi.replace(/^https?:\/\/doi\.org\//, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-bold transition-colors hover:bg-surface-2"
          >
            DOI
            <ExternalIcon className="h-4 w-4" />
          </a>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {resource.abstract && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Abstract</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {resource.abstract}
          </p>
        </section>
      )}

      {resource.notes && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {resource.notes}
          </p>
        </section>
      )}

      <CitationBlock citations={buildCitations(resource)} />

      {/* PDF preview */}
      {fileUrl && isPdf && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold">Preview</h2>
          <PdfPreview url={fileUrl} title={resource.title} />
        </section>
      )}

      {/* Related resources */}
      {related.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
            Related in the library
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((r) => (
              <ResourceCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
