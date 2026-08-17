/*
  Feature test sweep. Exercises the logic and data layer directly so the parts
  that don't need a browser session are actually verified rather than assumed.
  Run:  npx tsx scripts/test-features.mts
*/
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { buildCitations } from "../src/lib/citation.js";
import { toApaList, toBibTeX, toRis, safeFileBase } from "../src/lib/export.js";
import { extractDois, parseBibTeX, parseRis, parseBibFile } from "../src/lib/bibparse.js";
import {
  findDoiInText,
  looksLikeJunkTitle,
  normalizeAuthors,
  parseCrossref,
  fetchCrossref,
  extractPdfInfo,
} from "../src/lib/metadata.js";
import {
  safeHttpUrl,
  doiUrl,
  resourceLink,
  isPublicHttpUrl,
  isBlockedHost,
} from "../src/lib/url.js";

const URL_ = "https://gdeqohgyqoolbpyaewox.supabase.co";
const KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZXFvaGd5cW9vbGJweWFld294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTQwNjUsImV4cCI6MjA5OTIzMDA2NX0.kmXAKFPgB-h8k4pBDN5xRQZzPeMyYsyfMBfxD9zjpWs";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(name + (detail ? ` :: ${detail}` : ""));
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ""}`);
  }
}
const section = (s: string) => console.log(`\n=== ${s} ===`);

const sample = {
  title: "Best Practices in School-Based ADHD Assessment",
  authors: ["Carrasco, K.", "Nguyen, T."],
  year: 2024,
  doi: "10.1037/edu0000123",
  url: null as string | null,
  type: "article",
};

async function main() {
  // ---------------------------------------------------------------- citations
  section("Citations");
  const c = buildCitations(sample);
  check("APA has author, year, title", /Carrasco, K\./.test(c.APA) && /\(2024\)/.test(c.APA) && /Best Practices/.test(c.APA));
  check("APA joins two authors with ampersand", /&/.test(c.APA), c.APA);
  check("MLA quotes the title", /[“"]Best Practices/.test(c.MLA), c.MLA);
  check("Chicago leads with author then year", /^Carrasco, K\..*2024\./.test(c.Chicago), c.Chicago);
  check("All three include the DOI link", [c.APA, c.MLA, c.Chicago].every((s) => s.includes("doi.org/10.1037/edu0000123")));

  const noAuthor = buildCitations({ ...sample, authors: [], year: null, doi: null, url: "https://example.org/x" });
  check("Handles missing author and year", noAuthor.APA.includes("n.d.") && !noAuthor.APA.includes("undefined"), noAuthor.APA);
  check("Falls back to url when no DOI", noAuthor.APA.includes("example.org"), noAuthor.APA);

  // ------------------------------------------------------------------ exports
  section("Export formats");
  const items = [
    { ...sample, type: "article" },
    { title: "Autism and Social Skills", authors: ["Park, S."], year: 2023, doi: null, url: "https://example.org/a", type: "book" },
  ];
  const bib = toBibTeX(items);
  check("BibTeX emits one entry per item", (bib.match(/^@/gm) || []).length === 2, bib.slice(0, 80));
  check("BibTeX maps book type", /@book\{/.test(bib));
  check("BibTeX joins authors with 'and'", /author = \{Carrasco, K\. and Nguyen, T\.\}/.test(bib));
  check("BibTeX has no unbalanced braces", (bib.match(/\{/g) || []).length === (bib.match(/\}/g) || []).length);

  const ris = toRis(items);
  check("RIS starts records with TY", /^TY {2}- JOUR/m.test(ris));
  check("RIS emits one AU line per author", (ris.match(/^AU {2}- /gm) || []).length === 3, String((ris.match(/^AU {2}- /gm) || []).length));
  check("RIS terminates records with ER", (ris.match(/^ER {2}- ?$/gm) || []).length === 2);

  const apaList = toApaList(items);
  check("APA list contains both entries", apaList.split("\n\n").length === 2);
  check("Filename slug is safe", safeFileBase("Week 3 reading!") === "week-3-reading", safeFileBase("Week 3 reading!"));
  check("Filename slug survives empty input", safeFileBase("") === "reading-list");

  // -------------------------------------------------------------- bib parsing
  section("Bulk import parsing");
  const dois = extractDois("10.1037/edu0000123\nhttps://doi.org/10.1016/j.jsp.2020.02.001, 10.1037/edu0000123.");
  check("Extracts DOIs and de-duplicates", dois.length === 2, JSON.stringify(dois));
  check("Strips trailing punctuation", dois.every((d) => !/[.,;)]$/.test(d)), JSON.stringify(dois));

  const bibIn = `@article{key1,
  title = {A Study of Reading},
  author = {Smith, John and Doe, Jane},
  year = {2021},
  doi = {10.1000/abc}
}

@book{key2,
  title = {Assessment Handbook},
  author = {Lee, Amy},
  year = {2019}
}`;
  const parsedBib = parseBibTeX(bibIn);
  check("Parses both BibTeX entries", parsedBib.length === 2, String(parsedBib.length));
  check("Parses BibTeX title", parsedBib[0]?.title === "A Study of Reading", parsedBib[0]?.title);
  check("Splits BibTeX authors on 'and'", parsedBib[0]?.authors.length === 2, JSON.stringify(parsedBib[0]?.authors));
  check("Maps @book to book type", parsedBib[1]?.type === "book", parsedBib[1]?.type);
  check("Parses BibTeX year as number", parsedBib[0]?.year === 2021, String(parsedBib[0]?.year));

  const risIn = `TY  - JOUR
TI  - Executive Function in Children
AU  - Brown, Chris
AU  - Green, Pat
PY  - 2022
DO  - 10.1000/xyz
ER  -

TY  - BOOK
TI  - Intervention Manual
AU  - White, Sam
PY  - 2018
ER  - `;
  const parsedRis = parseRis(risIn);
  check("Parses both RIS records", parsedRis.length === 2, String(parsedRis.length));
  check("Parses RIS authors", parsedRis[0]?.authors.length === 2, JSON.stringify(parsedRis[0]?.authors));
  check("Maps RIS BOOK type", parsedRis[1]?.type === "book", parsedRis[1]?.type);
  check("Auto-detects BibTeX format", parseBibFile(bibIn).length === 2);
  check("Auto-detects RIS format", parseBibFile(risIn).length === 2);
  check("Unknown format yields nothing", parseBibFile("just some text").length === 0);

  // ------------------------------------------------------------ metadata bits
  section("Metadata helpers");
  check("Finds a DOI in body text", findDoiInText("see https://doi.org/10.1037/edu0000123 for more") === "10.1037/edu0000123");
  check("Returns null when no DOI", findDoiInText("no identifier here") === null);
  check("Rejects filename as title", looksLikeJunkTitle("Microsoft Word - draft3.docx"));
  check("Rejects 'untitled'", looksLikeJunkTitle("Untitled"));
  check("Accepts a real title", !looksLikeJunkTitle("Cognitive Assessment of Preschool Children"));
  check("Keeps 'Last, First' intact", normalizeAuthors("Carrasco, Kelly") === "Carrasco, Kelly", normalizeAuthors("Carrasco, Kelly"));
  check("Splits authors on semicolon", normalizeAuthors("Smith, J; Doe, A").split("; ").length === 2);
  check("Splits authors on 'and'", normalizeAuthors("Smith, J and Doe, A").split("; ").length === 2);

  const cr = parseCrossref({
    title: ["Sample Title"],
    author: [{ family: "Rudasill", given: "Kathleen" }],
    issued: { "date-parts": [[2017, 5]] },
    type: "journal-article",
    DOI: "10.1/x",
    abstract: "<jats:p>Some abstract.</jats:p>",
  });
  check("CrossRef parse gets title", cr.title === "Sample Title");
  check("CrossRef parse formats author", cr.authors === "Rudasill, Kathleen", cr.authors);
  check("CrossRef parse gets year", cr.year === "2017", cr.year);
  check("CrossRef strips markup from abstract", cr.abstract === "Some abstract.", cr.abstract);
  check("CrossRef maps journal-article to article", cr.type === "article");

  // ------------------------------------------------------- live CrossRef + PDF
  section("Live CrossRef and PDF reading");
  const live = await fetchCrossref("10.1037/edu0000123");
  check("Fetches real metadata from CrossRef", !!live?.title, live?.title ?? "no title");
  const bad = await fetchCrossref("10.9999/definitely-not-real-xyz");
  check("Bad DOI returns null, not a crash", bad === null);

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Executive Function and ADHD in Schools", { x: 56, y: 720, size: 16, font });
  page.drawText("https://doi.org/10.1037/edu0000123", { x: 56, y: 690, size: 11, font });
  doc.setTitle("Executive Function and ADHD in Schools");
  doc.setAuthor("Carrasco, Kelly");
  const bytes = await doc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const file = new File([blob], "test-article.pdf", { type: "application/pdf" });

  const info = await extractPdfInfo(file);
  check("Reads text out of a PDF", info.text.includes("Executive Function"), info.text.slice(0, 60));
  check("Finds the DOI printed in the PDF", findDoiInText(info.text) === "10.1037/edu0000123", String(findDoiInText(info.text)));
  check("Reads the PDF's embedded title", info.docTitle === "Executive Function and ADHD in Schools", info.docTitle ?? "none");
  check("Reads the PDF's embedded author", normalizeAuthors(info.docAuthor) === "Carrasco, Kelly", info.docAuthor ?? "none");

  // ----------------------------------------------------------- URL safety
  section("URL safety");
  check("Blocks javascript: URLs", safeHttpUrl("javascript:alert(1)") === null);
  check("Blocks data: URLs", safeHttpUrl("data:text/html,<script>x</script>") === null);
  check("Blocks vbscript: URLs", safeHttpUrl("vbscript:msgbox(1)") === null);
  check("Allows https", safeHttpUrl("https://example.org/a") === "https://example.org/a");
  check("Allows http", !!safeHttpUrl("http://example.org"));
  check("Null on garbage input", safeHttpUrl("not a url") === null);
  check("DOI builds a doi.org link", doiUrl("10.1/x") === "https://doi.org/10.1/x");
  check("DOI strips an existing doi.org prefix", doiUrl("https://doi.org/10.1/x") === "https://doi.org/10.1/x");
  check("Resource link prefers DOI", resourceLink("10.1/x", "https://other.org") === "https://doi.org/10.1/x");
  check("Resource link falls back to URL", resourceLink(null, "https://other.org") === "https://other.org/");
  check("Resource link rejects unsafe URL", resourceLink(null, "javascript:alert(1)") === null);

  // Server-side fetch guard (SSRF)
  check("Blocks localhost", !isPublicHttpUrl("http://localhost/x"));
  check("Blocks 127.0.0.1", !isPublicHttpUrl("http://127.0.0.1:3000/"));
  check("Blocks cloud metadata address", !isPublicHttpUrl("http://169.254.169.254/latest/meta-data/"));
  check("Blocks 10.x private range", !isPublicHttpUrl("http://10.0.0.5/"));
  check("Blocks 192.168.x private range", !isPublicHttpUrl("http://192.168.1.1/"));
  check("Blocks 172.16-31 private range", !isPublicHttpUrl("http://172.20.0.1/"));
  check("Allows a normal public host", isPublicHttpUrl("https://doi.org/10.1/x"));
  check("Blocks IPv6 loopback", !isPublicHttpUrl("http://[::1]/"));
  check("Blocks IPv4-mapped IPv6 loopback", isBlockedHost("::ffff:127.0.0.1"));
  check("Blocks .internal hostnames", !isPublicHttpUrl("http://db.internal/"));

  // ------------------------------------------------------------- data + policy
  section("Database and access rules");
  const anon = createClient(URL_, KEY);

  const { data: tags } = await anon.from("tags").select("id, category");
  check("Signed-out users cannot read tags", (tags ?? []).length === 0, `${(tags ?? []).length} rows`);

  const { data: res } = await anon.from("resources").select("id");
  check("Signed-out users cannot read resources", (res ?? []).length === 0, `${(res ?? []).length} rows`);

  const { error: writeErr } = await anon.from("resources").insert({ title: "SHOULD NOT SAVE" });
  check("Signed-out users cannot write", !!writeErr, writeErr?.message ?? "insert succeeded");

  const { error: rpcErr } = await anon.rpc("search_resources", { q: "adhd" });
  check("Search function is callable", !rpcErr, rpcErr?.message ?? "");

  const { error: statusErr } = await anon.from("resources").select("status").limit(1);
  check("Suggestion status column exists", !statusErr, statusErr?.message ?? "");

  const bucket = await fetch(`${URL_}/storage/v1/object/public/resources/`, { method: "HEAD" });
  check("Storage bucket responds", bucket.status < 500, String(bucket.status));

  // ------------------------------------------------------------------- summary
  console.log(`\n${"=".repeat(46)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log("\n  Failures:");
    failures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log(`${"=".repeat(46)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(1);
});
