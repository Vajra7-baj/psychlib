/*
  Approximate citations in three common styles. Metadata is limited (no
  journal/volume/publisher fields), so these are practical starting points
  students can refine, not guaranteed publication-ready.
*/

/** Minimal shape needed to cite, satisfied by Resource and SearchResult. */
export interface CitationInput {
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  url: string | null;
}

function link(r: CitationInput): string {
  if (r.doi) return `https://doi.org/${r.doi.replace(/^https?:\/\/doi\.org\//, "")}`;
  return r.url ?? "";
}

function joinApa(authors: string[]): string {
  const a = authors.filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]}, & ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, & ${a[a.length - 1]}`;
}

function joinAnd(authors: string[]): string {
  const a = authors.filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]}, and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function joinMla(authors: string[]): string {
  const a = authors.filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]}, and ${a[1]}`;
  return `${a[0]}, et al`;
}

export interface Citations {
  APA: string;
  MLA: string;
  Chicago: string;
}

export function buildCitations(r: CitationInput): Citations {
  const title = r.title.replace(/\.\s*$/, "");
  const l = link(r);
  const year = r.year ? String(r.year) : "n.d.";

  // APA 7: Author, A. A. (Year). Title. https://doi...
  const apaAuthors = joinApa(r.authors);
  const APA = [
    apaAuthors ? `${apaAuthors} ` : "",
    `(${year}). `,
    `${title}.`,
    l ? ` ${l}` : "",
  ]
    .join("")
    .trim();

  // MLA 9: Author. "Title." Year, https://doi...
  const mlaAuthors = joinMla(r.authors);
  const MLA = [
    mlaAuthors ? `${mlaAuthors.replace(/\.$/, "")}. ` : "",
    `“${title}.” `,
    r.year ? `${r.year}` : "",
    l ? `, ${l}` : "",
    ".",
  ]
    .join("")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .trim();

  // Chicago (author-date): Author. Year. "Title." https://doi...
  const chiAuthors = joinAnd(r.authors);
  const Chicago = [
    chiAuthors ? `${chiAuthors.replace(/\.$/, "")}. ` : "",
    `${year}. `,
    `“${title}.”`,
    l ? ` ${l}.` : "",
  ]
    .join("")
    .trim();

  return { APA, MLA, Chicago };
}
