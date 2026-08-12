"use client";

import { useState } from "react";
import Link from "next/link";
import { bulkCreateResources, type BulkResult } from "@/app/actions";
import { fetchCrossref } from "@/lib/metadata";
import { extractDois, parseBibFile, type ParsedItem } from "@/lib/bibparse";
import TagPicker from "@/components/TagPicker";
import { CheckIcon, TrashIcon } from "@/components/icons";
import type { Tag } from "@/lib/types";

type Mode = "doi" | "file";

export default function BulkImport({ tags }: { tags: Tag[] }) {
  const [mode, setMode] = useState<Mode>("doi");
  const [rawDois, setRawDois] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "parsing" | "importing">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BulkResult | null>(null);

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function parseDois() {
    const dois = extractDois(rawDois);
    if (!dois.length) {
      setItems([]);
      return;
    }
    setStatus("parsing");
    setProgress({ done: 0, total: dois.length });
    const out: ParsedItem[] = [];
    for (let i = 0; i < dois.length; i++) {
      const meta = await fetchCrossref(dois[i]);
      out.push({
        title: meta?.title ?? `Untitled (DOI ${dois[i]})`,
        authors: meta?.authors ? meta.authors.split("; ").filter(Boolean) : [],
        year: meta?.year ? Number.parseInt(meta.year, 10) : null,
        type: meta?.type ?? "article",
        url: meta?.url ?? null,
        doi: dois[i],
        abstract: meta?.abstract ?? null,
      });
      setProgress({ done: i + 1, total: dois.length });
    }
    setItems(out);
    setStatus("idle");
  }

  async function onFile(file: File) {
    setStatus("parsing");
    const text = await file.text();
    setItems(parseBibFile(text));
    setStatus("idle");
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function doImport() {
    setStatus("importing");
    const res = await bulkCreateResources(items, [...selectedTags]);
    setResult(res);
    setStatus("idle");
    if (res.ok) setItems([]);
  }

  if (result?.ok) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-primary">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">
          Imported {result.inserted}{" "}
          {result.inserted === 1 ? "resource" : "resources"}
        </h2>
        {result.skipped > 0 && (
          <p className="mt-1 text-sm text-muted">
            {result.skipped} skipped (missing title).
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
          >
            View library
          </Link>
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-surface-2"
          >
            Import more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {(["doi", "file"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${
              mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            {m === "doi" ? "Paste DOIs" : "Upload .bib / .ris"}
          </button>
        ))}
      </div>

      {mode === "doi" ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={rawDois}
            onChange={(e) => setRawDois(e.target.value)}
            rows={6}
            placeholder={"One DOI per line, e.g.\n10.1037/edu0000123\n10.1016/j.jsp.2020.02.001"}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
          />
          <button
            onClick={parseDois}
            disabled={!rawDois.trim() || status === "parsing"}
            className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "parsing"
              ? `Fetching ${progress.done}/${progress.total}…`
              : "Fetch metadata"}
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-8 text-center transition hover:border-primary">
          <span className="text-sm font-bold">Choose a .bib or .ris file</span>
          <span className="text-xs text-muted">
            Exported from Zotero, Mendeley, EndNote, or a database
          </span>
          <input
            type="file"
            accept=".bib,.ris,.txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      )}

      {/* Review */}
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              {items.length} {items.length === 1 ? "item" : "items"} to import
            </h2>
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.title}</p>
                  <p className="truncate text-xs text-muted">
                    {[it.authors.join(", "), it.year].filter(Boolean).join(" · ") ||
                      "No author/year"}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  aria-label="Remove"
                  className="shrink-0 rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-primary"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <TagPicker
            tags={tags}
            selected={selectedTags}
            onToggle={toggleTag}
          />

          {result && !result.ok && (
            <p className="rounded-lg border border-accent-soft bg-accent-soft px-4 py-3 text-sm text-primary">
              {result.error}
            </p>
          )}

          <button
            onClick={doImport}
            disabled={status === "importing"}
            className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
          >
            {status === "importing"
              ? "Importing…"
              : `Import ${items.length} ${items.length === 1 ? "resource" : "resources"}`}
          </button>
        </>
      )}
    </div>
  );
}
