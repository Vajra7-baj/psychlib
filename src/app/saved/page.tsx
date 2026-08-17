"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useBookmarks } from "@/components/BookmarksProvider";
import ResourceCard from "@/components/ResourceCard";
import CollectionPicker from "@/components/CollectionPicker";
import ExportMenu from "@/components/ExportMenu";
import { BookmarkIcon, FolderIcon } from "@/components/icons";
import type { SearchResult } from "@/lib/types";

export default function SavedPage() {
  const { map, ready, collectionOf, collections } = useBookmarks();
  const [fetched, setFetched] = useState<SearchResult[] | null>(null);

  const savedIds = [...map.keys()].join(",");
  const hasBookmarks = savedIds.length > 0;

  useEffect(() => {
    if (!ready || !hasBookmarks) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("resources")
        .select(
          "id, title, authors, year, type, url, doi, abstract, file_path, created_at",
        )
        .in("id", savedIds.split(","))
        .order("created_at", { ascending: false });
      if (active) setFetched((data ?? []) as SearchResult[]);
    })();
    return () => {
      active = false;
    };
  }, [savedIds, ready, hasBookmarks]);

  // Derived rather than stored: with nothing bookmarked there's nothing to
  // wait for, so the empty state shows immediately instead of flashing
  // "Loading" while an effect sets state.
  const resources = hasBookmarks ? (fetched ?? []) : [];
  const loading = ready && hasBookmarks && fetched === null;

  // Group resources by collection (named collections first, then uncategorized).
  const groups: { name: string | null; items: SearchResult[] }[] = [];
  for (const name of collections) {
    const items = resources.filter((r) => collectionOf(r.id) === name);
    if (items.length) groups.push({ name, items });
  }
  const uncategorized = resources.filter((r) => collectionOf(r.id) === null);
  if (uncategorized.length) groups.push({ name: null, items: uncategorized });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Saved resources
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your bookmarks, organized into collections. Export any list to APA,
            BibTeX, or RIS.
          </p>
        </div>
        {resources.length > 0 && (
          <div className="shrink-0">
            <ExportMenu items={resources} name="all-saved" />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-soft text-navy">
            <BookmarkIcon className="h-7 w-7" />
          </span>
          <p className="font-medium">No saved resources yet</p>
          <p className="max-w-sm text-sm text-muted">
            Tap the bookmark icon on any resource to save it, then file it into a
            collection like &ldquo;Week 3 reading.&rdquo;
          </p>
          <Link
            href="/"
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
          >
            Browse the library
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.name ?? "__uncategorized"}>
              <div className="mb-3 flex items-center gap-2">
                <FolderIcon
                  className={`h-4 w-4 ${group.name ? "text-navy" : "text-muted"}`}
                />
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {group.name ?? "Not in a collection"}
                </h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                  {group.items.length}
                </span>
                <div className="ml-auto">
                  <ExportMenu items={group.items} name={group.name ?? "reading-list"} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((r) => (
                  <div key={r.id} className="flex flex-col gap-1.5">
                    <ResourceCard r={r} />
                    <div className="px-1">
                      <CollectionPicker id={r.id} variant="compact" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
