// Seed a few realistic resources, exercising the real pipeline:
// generate a PDF -> extract its text (unpdf) -> upload to Storage -> insert row -> link tags.
// Run:  node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractText, getDocumentProxy } from "unpdf";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

const SAMPLES = [
  {
    title: "Best Practices in School-Based ADHD Assessment",
    authors: ["Carrasco, K.", "Nguyen, T."],
    year: 2024,
    type: "pdf",
    abstract:
      "A practitioner guide to multi-informant, culturally responsive assessment of attention-deficit/hyperactivity disorder in K-12 settings, linking data to evidence-based intervention.",
    tags: ["psych-284", "nasp-data-based-decision-making", "pop-adhd"],
    body: "ADHD assessment requires multiple informants including teachers and parents. Executive function deficits, attention, and hyperactivity are evaluated using rating scales and continuous performance tests. Culturally responsive practice is essential for English language learners.",
  },
  {
    title: "Multi-Tiered Systems of Support for Reading Intervention",
    authors: ["Alvarez, M."],
    year: 2022,
    type: "article",
    abstract:
      "Reviews MTSS frameworks for delivering academic reading interventions and progress monitoring for students with specific learning disabilities.",
    tags: ["psych-285", "nasp-academic-interventions", "pop-learning-disabilities"],
    body: "Multi-tiered systems of support (MTSS) organize reading intervention into tiers. Progress monitoring and curriculum-based measurement guide instructional decisions for students with dyslexia and specific learning disabilities.",
  },
  {
    title: "Autism Identification and Social Skills Intervention in Schools",
    authors: ["Park, S.", "Carrasco, K."],
    year: 2023,
    type: "pdf",
    abstract:
      "Evidence-based approaches to identifying autism spectrum disorder and delivering social communication interventions within a school psychology consultation model.",
    tags: ["psych-278", "nasp-consultation-collaboration", "pop-autism"],
    body: "Autism spectrum disorder identification uses observation, developmental history, and standardized measures. Social skills interventions and peer-mediated approaches support social communication in inclusive classrooms.",
  },
];

async function makePdf(title, body) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(title, { x: 56, y: 720, size: 16, font });
  const words = body.split(" ");
  let line = "";
  let y = 680;
  for (const w of words) {
    if ((line + w).length > 70) {
      page.drawText(line, { x: 56, y, size: 11, font });
      y -= 18;
      line = "";
    }
    line += w + " ";
  }
  if (line) page.drawText(line, { x: 56, y, size: 11, font });
  return Buffer.from(await doc.save());
}

for (const s of SAMPLES) {
  const pdf = await makePdf(s.title, s.body);

  // Extract text the same way the app does.
  const proxy = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(proxy, { mergePages: true });
  const extracted = (Array.isArray(text) ? text.join("\n") : text).trim();

  // Upload to Storage.
  const path = `seed/${crypto.randomUUID()}.pdf`;
  const up = await sb.storage
    .from("resources")
    .upload(path, pdf, { contentType: "application/pdf" });
  if (up.error) {
    console.error("upload failed:", up.error.message);
    continue;
  }

  // Insert resource.
  const { data: row, error } = await sb
    .from("resources")
    .insert({
      title: s.title,
      authors: s.authors,
      year: s.year,
      type: s.type,
      abstract: s.abstract,
      file_path: path,
      file_size: pdf.length,
      extracted_text: extracted,
    })
    .select("id")
    .single();
  if (error) {
    console.error("insert failed:", error.message);
    continue;
  }

  // Link tags by slug.
  const { data: tagRows } = await sb
    .from("tags")
    .select("id, slug")
    .in("slug", s.tags);
  if (tagRows?.length) {
    await sb
      .from("resource_tags")
      .insert(tagRows.map((t) => ({ resource_id: row.id, tag_id: t.id })));
  }

  console.log(`✓ ${s.title}  (extracted ${extracted.length} chars, ${tagRows?.length ?? 0} tags)`);
}

console.log("Seed complete.");
