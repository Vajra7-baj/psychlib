"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ResourceType } from "@/lib/types";

export interface ResourceFormState {
  ok: boolean;
  error?: string;
  resourceId?: string;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Pull selectable text out of a PDF so its contents feed full-text search. */
async function extractPdfText(file: File): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = (Array.isArray(text) ? text.join("\n") : text).trim();
    return clean ? clean.slice(0, 500_000) : null;
  } catch {
    return null; // image-only PDF, no text layer
  }
}

const VALID_TYPES: ResourceType[] = ["pdf", "article", "book", "link"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only allow http(s) links. Anything else (javascript:, data:, vbscript:)
 * would become a stored-XSS payload when rendered as an <a href>.
 */
function sanitizeHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Shared metadata parsing for add + edit. */
function parseFields(formData: FormData) {
  const rawType = (formData.get("type") as string) || "pdf";
  return {
    title: (formData.get("title") as string)?.trim().slice(0, 500),
    type: (VALID_TYPES.includes(rawType as ResourceType)
      ? rawType
      : "pdf") as ResourceType,
    // Split on semicolons/newlines only, since author names contain commas
    // ("Carrasco, K."), so comma can't be the separator.
    authors:
      (formData.get("authors") as string)
        ?.split(/[;\n]/)
        .map((a) => a.trim())
        .filter(Boolean) ?? [],
    year: (() => {
      const raw = (formData.get("year") as string)?.trim();
      const n = raw ? Number.parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n >= 0 && n <= 2100 ? n : null;
    })(),
    url: sanitizeHttpUrl((formData.get("url") as string)?.trim() || null),
    doi:
      (formData.get("doi") as string)
        ?.trim()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") || null,
    abstract: (formData.get("abstract") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    tagIds: formData
      .getAll("tags")
      .map(String)
      .filter((t) => UUID_RE.test(t)),
  };
}

/**
 * Server-side upload gate: PDFs only. The form's `accept` attribute is
 * client-side cosmetics; without this check anyone could upload an HTML
 * page to the public bucket and use it as a hosted phishing/XSS page.
 */
function validatePdfUpload(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return "File is larger than the 50 MB limit.";
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") || file.type !== "application/pdf")
    return "Only PDF files can be uploaded.";
  return null;
}

/**
 * Gate every write to signed-in faculty. Returns an error string to surface,
 * or null when the caller may proceed. Uses getUser() (verifies the JWT) not
 * getSession(), so a forged cookie can't slip through.
 */
async function facultyGate(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "You must be signed in.";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "faculty")
    return "Only faculty can modify the library.";
  return null;
}

export async function addResource(
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const supabase = await createClient();
  const gate = await facultyGate(supabase);
  if (gate) return { ok: false, error: gate };
  const f = parseFields(formData);
  if (!f.title) return { ok: false, error: "Title is required." };

  const file = formData.get("file") as File | null;
  let filePath: string | null = null;
  let fileSize: number | null = null;
  let extractedText: string | null = null;

  if (file && file.size > 0) {
    const invalid = validatePdfUpload(file);
    if (invalid) return { ok: false, error: invalid };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(path, file, { contentType: "application/pdf" });
    if (uploadError)
      return { ok: false, error: "Upload failed. Please try again." };
    filePath = path;
    fileSize = file.size;
    extractedText = await extractPdfText(file);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("resources")
    .insert({
      title: f.title,
      authors: f.authors,
      year: f.year,
      type: f.type,
      url: f.url,
      doi: f.doi,
      abstract: f.abstract,
      notes: f.notes,
      file_path: filePath,
      file_size: fileSize,
      extracted_text: extractedText,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (filePath) await supabase.storage.from("resources").remove([filePath]);
    return { ok: false, error: "Could not save the resource. Please try again." };
  }

  if (f.tagIds.length) {
    await supabase
      .from("resource_tags")
      .insert(f.tagIds.map((tag_id) => ({ resource_id: inserted.id, tag_id })));
  }

  revalidatePath("/");
  return { ok: true, resourceId: inserted.id };
}

/**
 * Any signed-in user may suggest a resource. It's stored as `pending` and
 * attributed to them; a faculty member approves it later. No file upload
 * (students can't write to storage) and no tags (faculty add those on review).
 */
export async function suggestResource(
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const f = parseFields(formData);
  if (!f.title) return { ok: false, error: "Title is required." };

  const { data: inserted, error } = await supabase
    .from("resources")
    .insert({
      title: f.title,
      authors: f.authors,
      year: f.year,
      type: f.type,
      url: f.url,
      doi: f.doi,
      abstract: f.abstract,
      notes: f.notes,
      status: "pending",
      added_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted)
    return { ok: false, error: "Could not submit your suggestion." };
  return { ok: true, resourceId: inserted.id };
}

export async function editResource(
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const supabase = await createClient();
  const gate = await facultyGate(supabase);
  if (gate) return { ok: false, error: gate };
  const id = formData.get("id") as string;
  if (!id || !UUID_RE.test(id))
    return { ok: false, error: "Missing resource id." };
  const f = parseFields(formData);
  if (!f.title) return { ok: false, error: "Title is required." };

  const updates: Record<string, unknown> = {
    title: f.title,
    authors: f.authors,
    year: f.year,
    type: f.type,
    url: f.url,
    doi: f.doi,
    abstract: f.abstract,
    notes: f.notes,
  };

  // Optional file replacement. The old file is only removed after the row
  // update succeeds, so a failed save never strands the record file-less.
  const file = formData.get("file") as File | null;
  let newFilePath: string | null = null;
  let oldFilePath: string | null = null;
  if (file && file.size > 0) {
    const invalid = validatePdfUpload(file);
    if (invalid) return { ok: false, error: invalid };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    newFilePath = `${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(newFilePath, file, { contentType: "application/pdf" });
    if (uploadError)
      return { ok: false, error: "Upload failed. Please try again." };

    const { data: old } = await supabase
      .from("resources")
      .select("file_path")
      .eq("id", id)
      .maybeSingle();
    oldFilePath = old?.file_path ?? null;

    updates.file_path = newFilePath;
    updates.file_size = file.size;
    updates.extracted_text = await extractPdfText(file);
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update(updates)
    .eq("id", id);
  if (updateError) {
    // Roll back the just-uploaded file so storage doesn't accumulate orphans.
    if (newFilePath)
      await supabase.storage.from("resources").remove([newFilePath]);
    return { ok: false, error: "Could not save changes. Please try again." };
  }
  if (oldFilePath && oldFilePath !== newFilePath)
    await supabase.storage.from("resources").remove([oldFilePath]);

  // Replace tag links.
  await supabase.from("resource_tags").delete().eq("resource_id", id);
  if (f.tagIds.length) {
    await supabase
      .from("resource_tags")
      .insert(f.tagIds.map((tag_id) => ({ resource_id: id, tag_id })));
  }

  revalidatePath("/");
  revalidatePath(`/resource/${id}`);
  return { ok: true, resourceId: id };
}

export interface BulkItem {
  title: string;
  authors: string[];
  year: number | null;
  type: ResourceType;
  url: string | null;
  doi: string | null;
  abstract: string | null;
}

export interface BulkResult {
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}

/**
 * Insert many metadata-only resources at once (bulk import). Files aren't
 * handled here. This is for DOI / BibTeX / RIS lists. Everything is
 * re-validated server-side; anything without a title is skipped.
 */
export async function bulkCreateResources(
  items: BulkItem[],
  tagIds: string[],
): Promise<BulkResult> {
  if (!Array.isArray(items) || items.length === 0)
    return { ok: false, inserted: 0, skipped: 0, error: "Nothing to import." };
  if (items.length > 500)
    return { ok: false, inserted: 0, skipped: 0, error: "Too many items (max 500)." };

  const supabaseGate = await createClient();
  const gate = await facultyGate(supabaseGate);
  if (gate) return { ok: false, inserted: 0, skipped: 0, error: gate };

  const cleanTags = tagIds.filter((t) => UUID_RE.test(t));
  const rows = items
    .map((i) => ({
      title: i.title?.trim().slice(0, 500),
      authors: Array.isArray(i.authors) ? i.authors.filter(Boolean) : [],
      year:
        typeof i.year === "number" && i.year >= 0 && i.year <= 2100
          ? i.year
          : null,
      type: (VALID_TYPES.includes(i.type) ? i.type : "article") as ResourceType,
      url: sanitizeHttpUrl(i.url),
      doi: i.doi?.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") || null,
      abstract: i.abstract?.trim() || null,
    }))
    .filter((r) => r.title);

  const skipped = items.length - rows.length;
  if (rows.length === 0)
    return { ok: false, inserted: 0, skipped, error: "No valid items to import." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("resources")
    .insert(rows)
    .select("id");
  if (error || !inserted)
    return { ok: false, inserted: 0, skipped, error: "Import failed. Please try again." };

  if (cleanTags.length) {
    const links = inserted.flatMap((row) =>
      cleanTags.map((tag_id) => ({ resource_id: row.id, tag_id })),
    );
    await supabase.from("resource_tags").insert(links);
  }

  revalidatePath("/");
  return { ok: true, inserted: inserted.length, skipped };
}

export async function deleteResource(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id || !UUID_RE.test(id)) return;
  const supabase = await createClient();
  if (await facultyGate(supabase)) return;

  const { data: row } = await supabase
    .from("resources")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  // Row first, file second: if the delete fails we keep both, never a
  // record pointing at a missing file.
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (!error && row?.file_path)
    await supabase.storage.from("resources").remove([row.file_path]);

  revalidatePath("/");
  redirect("/");
}
