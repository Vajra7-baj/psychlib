"use client";

import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_BYTES, MAX_FILE_LABEL } from "@/lib/types";

/*
  Files go straight from the browser to Supabase Storage rather than through a
  Server Action. Server Actions cap the request body at 1MB by default, and
  Vercel caps serverless request bodies around 4.5MB, so routing a real journal
  PDF through the server would fail on most of them. Uploading directly avoids
  both ceilings; the action then receives only the stored path. Storage
  policies still restrict writes to faculty.
*/

export interface UploadResult {
  path?: string;
  size?: number;
  error?: string;
}

/** Reject anything that isn't a PDF before it leaves the browser. */
export function validatePdf(file: File): string | null {
  if (file.size > MAX_FILE_BYTES)
    return `That file is larger than ${MAX_FILE_LABEL}.`;
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files can be uploaded.";
  return null;
}

export async function uploadPdf(file: File): Promise<UploadResult> {
  const invalid = validatePdf(file);
  if (invalid) return { error: invalid };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safeName}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("resources")
    .upload(path, file, { contentType: "application/pdf" });

  if (error) {
    // The most common cause is a signed-out or non-faculty session.
    return { error: "Upload failed. Check you're signed in, then try again." };
  }
  return { path, size: file.size };
}

/** Remove a file that was uploaded but never attached to a saved resource. */
export async function removeUploadedPdf(path: string) {
  try {
    const supabase = createClient();
    await supabase.storage.from("resources").remove([path]);
  } catch {
    /* best effort */
  }
}
