"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ResourceFormState } from "@/app/actions";
import type { ResourceType, Tag, TagCategory } from "@/lib/types";
import { RESOURCE_TYPE_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, UploadIcon } from "@/components/icons";
import {
  extractPdfInfo,
  fetchCrossref,
  findDoiInText,
  looksLikeJunkTitle,
  normalizeAuthors,
  type ResourceMeta,
} from "@/lib/metadata";
import { removeUploadedPdf, uploadPdf, validatePdf } from "@/lib/upload";

const initialState: ResourceFormState = { ok: false };

const CATEGORY_LABELS: { key: TagCategory; label: string }[] = [
  { key: "course", label: "Courses" },
];

export interface ResourceFormInitial {
  id?: string;
  title?: string;
  type?: ResourceType;
  authors?: string;
  year?: string;
  url?: string;
  doi?: string;
  abstract?: string;
  notes?: string;
  tagIds?: string[];
  fileName?: string;
}

export default function ResourceForm({
  tags,
  action,
  initial,
  submitLabel = "Add resource",
  allowUpload = true,
  allowTags = true,
  successTitle,
}: {
  tags: Tag[];
  action: (
    prev: ResourceFormState,
    formData: FormData,
  ) => Promise<ResourceFormState>;
  initial?: ResourceFormInitial;
  submitLabel?: string;
  allowUpload?: boolean;
  allowTags?: boolean;
  successTitle?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ResourceType>(initial?.type ?? "pdf");
  const [authors, setAuthors] = useState(initial?.authors ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [doi, setDoi] = useState(initial?.doi ?? "");
  const [abstract, setAbstract] = useState(initial?.abstract ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.tagIds ?? []),
  );
  const [fileName, setFileName] = useState<string | null>(
    initial?.fileName ?? null,
  );
  // The file is uploaded to Storage as soon as it's chosen, so only its path
  // travels through the Server Action. See lib/upload.ts for why.
  const [uploaded, setUploaded] = useState<{
    path: string;
    size: number;
    text: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [dup, setDup] = useState<{ id: string; title: string } | null>(null);

  /**
   * Non-blocking duplicate check by DOI (exact) or title (case-insensitive).
   * Warns with a link but never prevents saving; the curator decides.
   */
  async function checkDuplicate(doiArg?: string, titleArg?: string) {
    const cleanDoi = (doiArg ?? doi)
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    const cleanTitle = (titleArg ?? title).trim();
    if (!cleanDoi && cleanTitle.length < 4) {
      setDup(null);
      return;
    }
    const supabase = createClient();
    let query = supabase.from("resources").select("id, title").limit(1);
    if (cleanDoi) query = query.eq("doi", cleanDoi);
    else query = query.ilike("title", cleanTitle);
    if (initial?.id) query = query.neq("id", initial.id);
    const { data } = await query;
    setDup(data && data.length ? (data[0] as { id: string; title: string }) : null);
  }

  const [doiStatus, setDoiStatus] = useState<
    "idle" | "loading" | "error" | "done"
  >("idle");
  const [analysis, setAnalysis] = useState<
    "idle" | "uploading" | "reading" | "doi" | "doi-only" | "meta" | "none"
  >("idle");

  /**
   * Apply detected metadata. `overwrite` = true for authoritative sources
   * (DOI/CrossRef); false for weaker embedded PDF info, which only fills
   * fields the user hasn't already touched. Functional updates avoid stale
   * closures.
   */
  function applyMeta(meta: ResourceMeta, overwrite: boolean) {
    const put = (
      val: string | undefined,
      setter: (fn: (prev: string) => string) => void,
    ) => {
      if (!val) return;
      setter((prev) => (overwrite || !prev.trim() ? val : prev));
    };
    put(meta.title, setTitle);
    put(meta.authors, setAuthors);
    put(meta.year, setYear);
    put(meta.abstract, setAbstract);
    put(meta.url, setUrl);
    if (meta.doi) setDoi((prev) => (overwrite || !prev.trim() ? meta.doi! : prev));
    if (meta.type) setType(meta.type);
  }

  async function autofillFromDoi() {
    if (!doi.trim()) return;
    setDoiStatus("loading");
    const meta = await fetchCrossref(doi);
    if (meta?.title) {
      applyMeta(meta, true);
      setDoiStatus("done");
      checkDuplicate(meta.doi, meta.title);
    } else {
      setDoiStatus("error");
    }
  }

  /**
   * Chosen file: upload it to Storage, then read it for auto-fill.
   * Uploading here rather than at submit keeps the Server Action payload to a
   * few strings, so file size is limited only by Storage.
   */
  async function analyzeFile(file: File) {
    setFileName(file.name);
    setUploadError(null);

    const invalid = validatePdf(file);
    if (invalid) {
      setUploadError(invalid);
      setAnalysis("idle");
      setUploaded(null);
      return;
    }

    setAnalysis("uploading");
    // Replace a previous upload from this same session so we don't leave
    // an unused file behind in Storage.
    if (uploaded?.path) removeUploadedPdf(uploaded.path);

    const res = await uploadPdf(file);
    if (res.error || !res.path) {
      setUploadError(res.error ?? "Upload failed.");
      setAnalysis("idle");
      setUploaded(null);
      return;
    }
    setUploaded({ path: res.path, size: res.size ?? file.size, text: "" });

    // Now read it locally purely to auto-fill the form. The server re-reads
    // the stored file for the search index, so nothing large is posted here.
    setAnalysis("reading");
    try {
      const info = await extractPdfInfo(file);
      const doiInPdf = findDoiInText(info.text);

      if (doiInPdf) {
        const meta = await fetchCrossref(doiInPdf);
        if (meta?.title) {
          applyMeta(meta, true);
          setAnalysis("doi");
          checkDuplicate(meta.doi, meta.title);
          return;
        }
        // DOI present but CrossRef unreachable, still capture the DOI.
        setDoi((prev) => prev || doiInPdf);
      }

      // Fallback: the PDF's own embedded title/author (only if not junk).
      let filled = false;
      if (!looksLikeJunkTitle(info.docTitle)) {
        setTitle((prev) => (prev.trim() ? prev : info.docTitle!.trim()));
        filled = true;
      }
      const authors = normalizeAuthors(info.docAuthor);
      if (authors) {
        setAuthors((prev) => (prev.trim() ? prev : authors));
        filled = true;
      }
      setAnalysis(filled ? "meta" : doiInPdf ? "doi-only" : "none");
    } catch {
      // The file is safely uploaded; only auto-fill failed.
      setAnalysis("none");
    }
  }

  function toggleTag(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (state.ok && state.resourceId) {
    // Suggest mode: the resource is pending, so the student can't view it yet.
    const isSuggest = !!successTitle;
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-primary">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">
          {successTitle ?? (isEdit ? "Changes saved" : "Resource added")}
        </h2>
        {isSuggest && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Thanks. A faculty member will review it and add it to the library.
          </p>
        )}
        {state.error && <p className="mt-1 text-sm text-primary">{state.error}</p>}
        <div className="mt-5 flex justify-center gap-3">
          {isSuggest ? (
            <Link
              href="/"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
            >
              Back to library
            </Link>
          ) : (
            <>
              <Link
                href={`/resource/${state.resourceId}`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
              >
                View resource
              </Link>
              {!isEdit && (
                <a
                  href="/add"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-surface-2"
                >
                  Add another
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}

      {state.error && (
        <p className="rounded-lg border border-accent-soft bg-accent-soft px-4 py-3 text-sm text-primary">
          {state.error}
        </p>
      )}

      {dup && (
        <p className="rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-sm">
          <span className="font-bold">Possible duplicate.</span> A resource
          titled &ldquo;{dup.title}&rdquo; may already be in the library.{" "}
          <Link
            href={`/resource/${dup.id}`}
            target="_blank"
            className="font-bold text-primary underline"
          >
            View it
          </Link>
          . You can still save this if it&rsquo;s different.
        </p>
      )}

      {/* Upload first: reading the PDF auto-fills everything it can */}
      {allowUpload && (
      <Field
        label={isEdit ? "Replace file (PDF)" : "Upload a PDF"}
        hint="Drop in a PDF and we’ll auto-fill the details below. Max 50 MB."
      >
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-8 text-center transition hover:border-primary hover:bg-accent-soft/40">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-primary shadow-sm">
            <UploadIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold">
            {fileName ?? "Click to choose a PDF"}
          </span>
          <span className="text-xs text-muted">
            We read it to auto-fill the form
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyzeFile(f);
              else {
                setFileName(null);
                setAnalysis("idle");
              }
            }}
          />
        </label>
        {uploaded && (
          <>
            <input type="hidden" name="file_path" value={uploaded.path} />
            <input type="hidden" name="file_size" value={uploaded.size} />
          </>
        )}
        {uploadError && (
          <span className="text-xs text-primary">{uploadError}</span>
        )}
        {analysis === "uploading" && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Uploading…
          </span>
        )}
        {analysis === "reading" && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Reading the PDF…
          </span>
        )}
        {analysis === "doi" && (
          <span className="text-xs text-navy">
            Found a DOI and filled the details from CrossRef. Please
            double-check them.
          </span>
        )}
        {analysis === "meta" && (
          <span className="text-xs text-navy">
            Filled from the PDF’s own info. Please double-check the details.
          </span>
        )}
        {analysis === "doi-only" && (
          <span className="text-xs text-muted">
            Found a DOI but couldn’t reach CrossRef, so we added the DOI.
            Please fill in the rest.
          </span>
        )}
        {analysis === "none" && (
          <span className="text-xs text-muted">
            Couldn’t auto-detect details (a scanned or image-only PDF). Please
            fill them in below.
          </span>
        )}
      </Field>
      )}

      <Field label="DOI" hint="Paste a DOI to auto-fill the details below.">
        <div className="flex gap-2">
          <input
            name="doi"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            onBlur={() => checkDuplicate()}
            placeholder="10.1037/edu0000123"
            className={inputClass}
          />
          <button
            type="button"
            onClick={autofillFromDoi}
            disabled={!doi.trim() || doiStatus === "loading"}
            className="shrink-0 rounded-lg border border-border-strong px-3 py-2.5 text-sm font-bold transition hover:bg-surface-2 disabled:opacity-50"
          >
            {doiStatus === "loading" ? "Fetching…" : "Auto-fill"}
          </button>
        </div>
        {doiStatus === "error" && (
          <span className="text-xs text-primary">
            Couldn&rsquo;t find that DOI. Enter the details manually.
          </span>
        )}
        {doiStatus === "done" && (
          <span className="text-xs text-muted">Details filled from CrossRef.</span>
        )}
      </Field>

      <Field label="Title" required>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => checkDuplicate()}
          placeholder="e.g. Best Practices in School-Based ADHD Assessment"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className={inputClass}
          >
            {Object.entries(RESOURCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input
            name="year"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Author(s)"
        hint="Separate authors with semicolons, each as Last, First (e.g. Carrasco, K.; Smith, J.)"
      >
        <input
          name="authors"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="Carrasco, K.; Smith, J."
          className={inputClass}
        />
      </Field>

      <Field label="Link / URL">
        <input
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>

      <Field label="Abstract / summary">
        <textarea
          name="abstract"
          rows={4}
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          placeholder="A short summary (this text is indexed for search)."
          className={inputClass}
        />
      </Field>

      <Field label="Notes" hint="Private context, e.g. “Week 3 reading”">
        <textarea
          name="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </Field>

      {allowTags && (
      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium">Tags</span>
        {CATEGORY_LABELS.map(({ key, label }) => {
          const groupTags = tags.filter((t) => t.category === key);
          if (!groupTags.length) return null;
          return (
            <div key={key} className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {groupTags.map((tag) => {
                  const on = selected.has(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                        on
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface hover:border-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="tags"
                        value={tag.id}
                        checked={on}
                        onChange={() => toggleTag(tag.id)}
                        className="hidden"
                      />
                      {tag.name}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
        >
          {pending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />
          )}
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={isEdit ? `/resource/${initial!.id}` : "/"}
          className="text-sm text-muted hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
