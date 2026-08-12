import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import Facets from "@/components/Facets";
import ResourceCard from "@/components/ResourceCard";
import SortSelect from "@/components/SortSelect";
import { BookIcon } from "@/components/icons";
import { getTags, searchResources } from "@/lib/queries";
import type { SortOption } from "@/lib/types";

const PAGE_SIZE = 30;

// Query params are attacker-controlled: anything not strictly valid is
// dropped rather than forwarded to Postgres (a bad uuid in ?tag= would
// otherwise 500 the page).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TYPES = new Set(["pdf", "article", "book", "link"]);
const VALID_SORTS = new Set(["relevance", "newest", "oldest", "title"]);

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 200);
  const tagIds = asArray(sp.tag).filter((t) => UUID_RE.test(t));
  const type =
    typeof sp.type === "string" && VALID_TYPES.has(sp.type) ? sp.type : null;
  const sort =
    typeof sp.sort === "string" && VALID_SORTS.has(sp.sort)
      ? (sp.sort as SortOption)
      : undefined;
  const page = Math.max(1, Number.parseInt((sp.page as string) ?? "1", 10) || 1);

  const [tags, { results, total }] = await Promise.all([
    getTags(),
    searchResources({ q, tagIds, type, sort, page, pageSize: PAGE_SIZE }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number): string {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (type) qs.set("type", type);
    if (sort) qs.set("sort", sort);
    tagIds.forEach((t) => qs.append("tag", t));
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero + search */}
      <section className="mb-9 flex flex-col gap-5">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            School Psychology Ed.S.
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            The program&rsquo;s resource library
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Search readings, assessments, and references across the whole
            program. Look by title, author, topic, or even the text inside a
            PDF. No more digging through Canvas.
          </p>
        </div>
        <SearchBar />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:block">
          <Facets tags={tags} />
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {total} {total === 1 ? "resource" : "resources"}
              {q && (
                <>
                  {" "}
                  for <span className="font-medium text-foreground">“{q}”</span>
                </>
              )}
            </p>
            {total > 0 && <SortSelect />}
          </div>

          {results.length === 0 ? (
            <EmptyState hasQuery={!!q || tagIds.length > 0 || !!type} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((r) => (
                  <ResourceCard key={r.id} r={r} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link
                      href={pageHref(page - 1)}
                      className="rounded-lg border border-border-strong px-3 py-2 text-sm font-bold transition hover:bg-surface-2"
                    >
                      ← Prev
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted opacity-50">
                      ← Prev
                    </span>
                  )}
                  <span className="text-sm text-muted">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={pageHref(page + 1)}
                      className="rounded-lg border border-border-strong px-3 py-2 text-sm font-bold transition hover:bg-surface-2"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted opacity-50">
                      Next →
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-primary">
        <BookIcon className="h-7 w-7" />
      </span>
      {hasQuery ? (
        <>
          <p className="font-medium">No matching resources</p>
          <p className="max-w-sm text-sm text-muted">
            Try different keywords or clear some filters.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">The library is empty</p>
          <p className="max-w-sm text-sm text-muted">
            Add the first reading, PDF, or link to get started.
          </p>
          <Link
            href="/add"
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            Add a resource
          </Link>
        </>
      )}
    </div>
  );
}
