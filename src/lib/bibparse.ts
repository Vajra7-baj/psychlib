import type { ResourceType } from "@/lib/types";

/*
  Parse pasted DOIs and uploaded BibTeX/RIS files into resource items for
  bulk import. Deliberately forgiving, since real-world .bib/.ris exports are
  messy, so we extract what we can and skip the rest.
*/

export interface ParsedItem {
  title: string;
  authors: string[];
  year: number | null;
  type: ResourceType;
  url: string | null;
  doi: string | null;
  abstract: string | null;
}

/** Pull every DOI out of a blob of pasted text (one per line, commas, etc.). */
export function extractDois(text: string): string[] {
  const matches = text.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/gi) ?? [];
  const cleaned = matches.map((d) => d.replace(/[.,;)\]]+$/, ""));
  return [...new Set(cleaned)];
}

function bibType(t: string): ResourceType {
  const k = t.toLowerCase();
  if (["book", "inbook", "incollection", "booklet"].includes(k)) return "book";
  if (["misc", "online", "electronic", "www"].includes(k)) return "link";
  return "article";
}

/** Minimal BibTeX parser: entries like @article{key, title={…}, …}. */
export function parseBibTeX(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const entryRe = /@(\w+)\s*\{[^,]*,([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(text))) {
    const type = bibType(m[1]);
    const body = m[1] ? m[2] : "";
    const field = (name: string): string | null => {
      const re = new RegExp(
        `${name}\\s*=\\s*(?:\\{([\\s\\S]*?)\\}|"([\\s\\S]*?)")`,
        "i",
      );
      const fm = body.match(re);
      const v = (fm?.[1] ?? fm?.[2] ?? "").replace(/\s+/g, " ").trim();
      return v || null;
    };

    const title = field("title");
    if (!title) continue;
    const authorRaw = field("author");
    const authors = authorRaw
      ? authorRaw.split(/\s+and\s+/i).map((a) => a.trim()).filter(Boolean)
      : [];
    const yearRaw = field("year");
    const year = yearRaw ? Number.parseInt(yearRaw, 10) : null;

    items.push({
      title,
      authors,
      year: Number.isFinite(year as number) ? year : null,
      type,
      url: field("url"),
      doi: field("doi"),
      abstract: field("abstract"),
    });
  }
  return items;
}

function risType(t: string): ResourceType {
  const k = t.toUpperCase();
  if (["BOOK", "CHAP", "EBOOK"].includes(k)) return "book";
  if (["ELEC", "WEB", "ICOMM"].includes(k)) return "link";
  return "article";
}

/** Minimal RIS parser: records of `XX  - value` lines terminated by `ER  -`. */
export function parseRis(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const records = text.split(/^ER\s{2}-.*$/m);

  for (const rec of records) {
    const lines = rec.split(/\r?\n/);
    let title = "";
    const authors: string[] = [];
    let year: number | null = null;
    let type: ResourceType = "article";
    let url: string | null = null;
    let doi: string | null = null;
    let abstract: string | null = null;

    for (const line of lines) {
      const lm = line.match(/^([A-Z0-9]{2})\s{2}-\s?(.*)$/);
      if (!lm) continue;
      const [, tag, value] = lm;
      const v = value.trim();
      if (!v) continue;
      switch (tag) {
        case "TY":
          type = risType(v);
          break;
        case "TI":
        case "T1":
          title = v;
          break;
        case "AU":
        case "A1":
          authors.push(v);
          break;
        case "PY":
        case "Y1": {
          const y = Number.parseInt(v.slice(0, 4), 10);
          if (Number.isFinite(y)) year = y;
          break;
        }
        case "DO":
          doi = v;
          break;
        case "UR":
          url = v;
          break;
        case "AB":
        case "N2":
          abstract = v;
          break;
      }
    }
    if (title) items.push({ title, authors, year, type, url, doi, abstract });
  }
  return items;
}

/** Detect format from file content and parse accordingly. */
export function parseBibFile(text: string): ParsedItem[] {
  if (/^\s*@\w+\s*\{/m.test(text)) return parseBibTeX(text);
  if (/^TY\s{2}-/m.test(text)) return parseRis(text);
  return [];
}
