import type { ResourceType } from "@/lib/types";

/*
  Client-side metadata helpers used by the resource form to auto-fill from an
  uploaded PDF: read the PDF's text + embedded info, find a DOI, and pull
  authoritative details from CrossRef, with a safe fallback that never writes
  obviously-junk data.
*/

export interface ResourceMeta {
  title?: string;
  authors?: string; // "Last, First; Last, First"
  year?: string;
  abstract?: string;
  url?: string;
  doi?: string;
  type?: ResourceType;
}

export interface PdfInfo {
  /** Text from the first few pages (where a DOI lives). */
  text: string;
  docTitle?: string;
  docAuthor?: string;
}

/** Strip JATS/HTML tags CrossRef returns inside abstracts. */
function stripTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/^abstract\s*/i, "")
    .trim();
}

/**
 * Find a DOI in text. Scans only the first pages (passed in) so we match the
 * article's own DOI rather than one from its reference list. Trailing
 * punctuation ("10.1/x.") is trimmed.
 */
export function findDoiInText(text: string): string | null {
  const m = text.match(/\b10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;)\]]+$/, "");
}

/** Reject filenames, "untitled", and other useless embedded titles. */
export function looksLikeJunkTitle(s: string | undefined | null): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 6) return true;
  if (/\.(docx?|pdf|tex|dvi|qxd|indd|rtf|pages)\b/i.test(t)) return true;
  if (/^(untitled|microsoft word|document\d*|layout|final|draft)\b/i.test(t))
    return true;
  if (!/[a-z]/i.test(t)) return true; // no letters at all
  return false;
}

/**
 * Normalize an embedded PDF author field into our "; "-separated form.
 * Splits only on semicolons/&/"and", NOT bare commas, since a comma usually
 * means "Last, First" and splitting there would shatter each name.
 */
export function normalizeAuthors(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .split(/\s*(?:;|&|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .join("; ");
}

const TYPE_MAP: Record<string, ResourceType> = {
  "journal-article": "article",
  "proceedings-article": "article",
  "posted-content": "article",
  "book": "book",
  "monograph": "book",
  "book-chapter": "book",
  "reference-book": "book",
};

/** Parse a CrossRef `message` object into our fields. */
export function parseCrossref(m: Record<string, unknown>): ResourceMeta {
  const meta: ResourceMeta = {};
  const title = (m.title as string[])?.[0];
  if (title) meta.title = title.trim();

  const authors = m.author as
    | { family?: string; given?: string }[]
    | undefined;
  if (Array.isArray(authors)) {
    meta.authors = authors
      .map((a) =>
        a.family ? `${a.family}${a.given ? `, ${a.given}` : ""}` : a.given,
      )
      .filter(Boolean)
      .join("; ");
  }

  const dateParts = (key: string) =>
    (m[key] as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0];
  const year =
    dateParts("issued") ??
    dateParts("published-print") ??
    dateParts("published-online") ??
    dateParts("created");
  if (year) meta.year = String(year);

  if (typeof m.abstract === "string") meta.abstract = stripTags(m.abstract);
  if (typeof m.URL === "string") meta.url = m.URL;
  if (typeof m.DOI === "string") meta.doi = m.DOI;
  if (typeof m.type === "string" && TYPE_MAP[m.type]) meta.type = TYPE_MAP[m.type];
  return meta;
}

/** Fetch + parse CrossRef for a DOI. Returns null on any failure. */
export async function fetchCrossref(doi: string): Promise<ResourceMeta | null> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (!clean) return null;
  try {
    const res = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(clean)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = parseCrossref(json.message ?? {});
    meta.doi = clean;
    return meta;
  } catch {
    return null;
  }
}

/** Read the first pages of text + embedded info from a PDF file. */
export async function extractPdfInfo(file: File): Promise<PdfInfo> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(bytes);

  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const firstPages = pages.slice(0, 3).join("\n");

  let docTitle: string | undefined;
  let docAuthor: string | undefined;
  try {
    const meta = await pdf.getMetadata();
    const info = (meta?.info ?? {}) as { Title?: string; Author?: string };
    docTitle = info.Title?.trim() || undefined;
    docAuthor = info.Author?.trim() || undefined;
  } catch {
    /* metadata is optional */
  }

  return { text: firstPages, docTitle, docAuthor };
}
