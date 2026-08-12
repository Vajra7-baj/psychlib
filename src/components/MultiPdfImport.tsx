"use client";

import { useState } from "react";
import Link from "next/link";
import { addResource } from "@/app/actions";
import {
  extractPdfInfo,
  fetchCrossref,
  findDoiInText,
  looksLikeJunkTitle,
  normalizeAuthors,
} from "@/lib/metadata";
import TagPicker from "@/components/TagPicker";
import { CheckIcon, TrashIcon, UploadIcon } from "@/components/icons";
import type { ResourceType, Tag } from "@/lib/types";

interface Row {
  file: File;
  title: string;
  authors: string;
  year: string;
  type: ResourceType;
  doi: string;
  url: string;
  abstract: string;
  source: "doi" | "meta" | "none";
}

export default function MultiPdfImport({ tags }: { tags: Tag[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"idle" | "reading" | "saving">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [saved, setSaved] = useState<number | null>(null);

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onFiles(fileList: FileList) {
    const files = [...fileList].filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (!files.length) return;
    setPhase("reading");
    setProgress({ done: 0, total: files.length });
    const out: Row[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const row: Row = {
        file,
        title: "",
        authors: "",
        year: "",
        type: "pdf",
        doi: "",
        url: "",
        abstract: "",
        source: "none",
      };
      try {
        const info = await extractPdfInfo(file);
        const doiInPdf = findDoiInText(info.text);
        const meta = doiInPdf ? await fetchCrossref(doiInPdf) : null;
        if (meta?.title) {
          row.title = meta.title;
          row.authors = meta.authors ?? "";
          row.year = meta.year ?? "";
          row.type = meta.type ?? "article";
          row.doi = meta.doi ?? doiInPdf ?? "";
          row.url = meta.url ?? "";
          row.abstract = meta.abstract ?? "";
          row.source = "doi";
        } else {
          if (!looksLikeJunkTitle(info.docTitle)) row.title = info.docTitle!.trim();
          row.authors = normalizeAuthors(info.docAuthor);
          if (doiInPdf) row.doi = doiInPdf;
          row.source = row.title ? "meta" : "none";
        }
      } catch {
        /* leave blank for manual entry */
      }
      if (!row.title) row.title = file.name.replace(/\.pdf$/i, "");
      out.push(row);
      setProgress({ done: i + 1, total: files.length });
    }
    setRows(out);
    setPhase("idle");
  }

  function update(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    setPhase("saving");
    setProgress({ done: 0, total: rows.length });
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const fd = new FormData();
      fd.set("file", r.file);
      fd.set("title", r.title);
      fd.set("authors", r.authors);
      fd.set("year", r.year);
      fd.set("type", r.type);
      fd.set("doi", r.doi);
      fd.set("url", r.url);
      fd.set("abstract", r.abstract);
      selectedTags.forEach((t) => fd.append("tags", t));
      const res = await addResource({ ok: false }, fd);
      if (res.ok) ok++;
      setProgress({ done: i + 1, total: rows.length });
    }
    setSaved(ok);
    setPhase("idle");
    setRows([]);
  }

  if (saved !== null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-primary">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">
          Saved {saved} {saved === 1 ? "PDF" : "PDFs"}
        </h2>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
          >
            View library
          </Link>
          <button
            onClick={() => setSaved(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-surface-2"
          >
            Add more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-10 text-center transition hover:border-primary hover:bg-accent-soft/40">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-primary shadow-sm">
          <UploadIcon className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold">
          {phase === "reading"
            ? `Reading ${progress.done}/${progress.total}…`
            : "Choose PDFs (you can select many)"}
        </span>
        <span className="text-xs text-muted">
          Each PDF is read and auto-filled
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
          }}
        />
      </label>

      {rows.length > 0 && (
        <>
          <h2 className="text-sm font-bold">
            {rows.length} {rows.length === 1 ? "PDF" : "PDFs"} to review and save
          </h2>
          <ul className="flex flex-col gap-3">
            {rows.map((r, idx) => (
              <li
                key={idx}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted">{r.file.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        r.source === "doi"
                          ? "bg-navy-soft text-navy"
                          : r.source === "meta"
                            ? "bg-surface-2 text-muted"
                            : "bg-accent-soft text-primary"
                      }`}
                    >
                      {r.source === "doi"
                        ? "Auto-filled"
                        : r.source === "meta"
                          ? "From PDF"
                          : "Check me"}
                    </span>
                    <button
                      onClick={() => removeRow(idx)}
                      aria-label="Remove"
                      className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-primary"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <input
                  value={r.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  placeholder="Title"
                  className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-medium outline-none focus:border-primary"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem]">
                  <input
                    value={r.authors}
                    onChange={(e) => update(idx, { authors: e.target.value })}
                    placeholder="Authors (Last, First; …)"
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <input
                    value={r.year}
                    onChange={(e) => update(idx, { year: e.target.value })}
                    placeholder="Year"
                    inputMode="numeric"
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </li>
            ))}
          </ul>

          <TagPicker tags={tags} selected={selectedTags} onToggle={toggleTag} />

          <button
            onClick={saveAll}
            disabled={phase === "saving"}
            className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
          >
            {phase === "saving"
              ? `Saving ${progress.done}/${progress.total}…`
              : `Save all ${rows.length}`}
          </button>
        </>
      )}
    </div>
  );
}
