"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

/** Faculty-only gate for management actions. */
async function requireFaculty(supabase: SB): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "faculty";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export interface ManageState {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Course tags
// ---------------------------------------------------------------------------
export async function createCourseTag(
  _prev: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase)))
    return { ok: false, error: "Faculty only." };
  const name = (formData.get("name") as string)?.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Enter a course name." };
  const slug = `${slugify(name) || "course"}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase
    .from("tags")
    .insert({ name, slug, category: "course" });
  if (error) return { ok: false, error: "Could not add the course." };
  revalidatePath("/manage");
  revalidatePath("/");
  return { ok: true };
}

export async function renameCourseTag(formData: FormData) {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase))) return;
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim().slice(0, 120);
  if (!id || !UUID_RE.test(id) || !name) return;
  await supabase.from("tags").update({ name }).eq("id", id);
  revalidatePath("/manage");
  revalidatePath("/");
}

export async function deleteCourseTag(formData: FormData) {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase))) return;
  const id = formData.get("id") as string;
  if (!id || !UUID_RE.test(id)) return;
  await supabase.from("tags").delete().eq("id", id);
  revalidatePath("/manage");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Suggestion queue
// ---------------------------------------------------------------------------
export async function approveResource(formData: FormData) {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase))) return;
  const id = formData.get("id") as string;
  if (!id || !UUID_RE.test(id)) return;
  await supabase.from("resources").update({ status: "approved" }).eq("id", id);
  revalidatePath("/manage/pending");
  revalidatePath("/");
}

export async function rejectResource(formData: FormData) {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase))) return;
  const id = formData.get("id") as string;
  if (!id || !UUID_RE.test(id)) return;
  await supabase.from("resources").delete().eq("id", id);
  revalidatePath("/manage/pending");
}

// ---------------------------------------------------------------------------
// Broken link checker
// ---------------------------------------------------------------------------
export interface BrokenLink {
  id: string;
  title: string;
  url: string;
  status: string;
}

export interface LinkCheckResult {
  ok: boolean;
  error?: string;
  checked: number;
  broken: BrokenLink[];
}

async function probe(url: string): Promise<string | null> {
  // "broken" = clearly dead: 404/410, 5xx, or unreachable. We intentionally
  // do NOT flag 401/403/405/429 — those usually mean the site blocks bots,
  // not that the link is dead (avoids false positives on journal sites).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    }
    if (res.status === 404 || res.status === 410 || res.status >= 500)
      return String(res.status);
    return null;
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLinks(): Promise<LinkCheckResult> {
  const supabase = await createClient();
  if (!(await requireFaculty(supabase)))
    return { ok: false, error: "Faculty only.", checked: 0, broken: [] };

  const { data } = await supabase
    .from("resources")
    .select("id, title, url, doi")
    .eq("status", "approved");

  const targets = (data ?? [])
    .map((r) => {
      const url = r.url
        ? (r.url as string)
        : r.doi
          ? `https://doi.org/${(r.doi as string).replace(/^https?:\/\/doi\.org\//, "")}`
          : null;
      return url ? { id: r.id as string, title: r.title as string, url } : null;
    })
    .filter((t): t is { id: string; title: string; url: string } => !!t);

  const broken: BrokenLink[] = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (t) => ({ t, status: await probe(t.url) })),
    );
    for (const { t, status } of results) {
      if (status) broken.push({ ...t, status });
    }
  }

  return { ok: true, checked: targets.length, broken };
}
