import { buildCitations, type CitationInput } from "@/lib/citation";

/*
  Turn a list of resources into an APA reference list, BibTeX, or RIS so
  students can drop a whole collection straight into a paper or into
  Zotero/Mendeley/EndNote.
*/

export interface ExportItem extends CitationInput {
  type: string; // pdf | article | book | link
}

/** APA reference list, one entry per line, alphabetized by first author. */
export function toApaList(items: ExportItem[]): string {
  return items
    .map((i) => buildCitations(i).APA)
    .sort((a, b) => a.localeCompare(b))
    .join("\n\n");
}

function doiUrl(i: ExportItem): string {
  if (i.doi) return `https://doi.org/${i.doi.replace(/^https?:\/\/doi\.org\//, "")}`;
  return i.url ?? "";
}

function bibKey(i: ExportItem, index: number): string {
  const first = i.authors[0]?.split(",")[0]?.replace(/[^a-zA-Z]/g, "") || "ref";
  const word =
    i.title.split(/\s+/).find((w) => w.length > 3)?.replace(/[^a-zA-Z]/g, "") ??
    String(index);
  return `${first}${i.year ?? ""}${word}`.toLowerCase();
}

const BIB_TYPE: Record<string, string> = {
  article: "article",
  book: "book",
  pdf: "article",
  link: "misc",
};

/** BibTeX. Braces in field values are stripped to avoid breaking the entry. */
export function toBibTeX(items: ExportItem[]): string {
  const esc = (s: string) => s.replace(/[{}]/g, "");
  return items
    .map((i, idx) => {
      const fields: [string, string][] = [];
      fields.push(["title", esc(i.title)]);
      if (i.authors.length) fields.push(["author", esc(i.authors.join(" and "))]);
      if (i.year) fields.push(["year", String(i.year)]);
      if (i.doi) fields.push(["doi", esc(i.doi)]);
      const u = doiUrl(i);
      if (u) fields.push(["url", esc(u)]);
      const body = fields
        .map(([k, v]) => `  ${k} = {${v}}`)
        .join(",\n");
      return `@${BIB_TYPE[i.type] ?? "misc"}{${bibKey(i, idx)},\n${body}\n}`;
    })
    .join("\n\n");
}

const RIS_TYPE: Record<string, string> = {
  article: "JOUR",
  book: "BOOK",
  pdf: "JOUR",
  link: "ELEC",
};

/** RIS, the format Zotero/Mendeley/EndNote import cleanly. */
export function toRis(items: ExportItem[]): string {
  return items
    .map((i) => {
      const lines: string[] = [`TY  - ${RIS_TYPE[i.type] ?? "GEN"}`];
      lines.push(`TI  - ${i.title}`);
      for (const a of i.authors) lines.push(`AU  - ${a}`);
      if (i.year) lines.push(`PY  - ${i.year}`);
      if (i.doi) lines.push(`DO  - ${i.doi}`);
      const u = doiUrl(i);
      if (u) lines.push(`UR  - ${u}`);
      lines.push("ER  - ");
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Trigger a client-side text-file download. */
export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeFileBase(name: string | null): string {
  return (name ?? "reading-list")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "reading-list";
}
