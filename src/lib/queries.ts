import { createClient } from "@/lib/supabase/server";
import type { SearchResult, SortOption, Tag } from "@/lib/types";

/** All taxonomy tags, grouped for the facet sidebar. */
export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug, category")
    .order("name");
  if (error) throw new Error(`Failed to load tags: ${error.message}`);
  return (data ?? []) as Tag[];
}

export interface SearchParams {
  q?: string;
  tagIds?: string[];
  type?: string | null;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

/** Ranked full-text search via the search_resources RPC. */
export async function searchResources(
  params: SearchParams,
): Promise<SearchResponse> {
  const {
    q = "",
    tagIds = [],
    type = null,
    sort = q.trim() ? "relevance" : "newest",
    page = 1,
    pageSize = 30,
  } = params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_resources", {
    q,
    tag_ids: tagIds.length ? tagIds : null,
    type_filter: type,
    sort,
    lim: pageSize,
    off: (page - 1) * pageSize,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);

  const results = (data ?? []) as SearchResult[];
  const total = results.length ? Number(results[0].total_count) : 0;
  return { results, total, page, pageSize };
}

/** Tag ids attached to a single resource (for the detail page). */
export async function getResourceTagIds(resourceId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource_tags")
    .select("tag_id")
    .eq("resource_id", resourceId);
  if (error) throw new Error(`Failed to load resource tags: ${error.message}`);
  return (data ?? []).map((r) => r.tag_id as string);
}

/** Full record for the detail view. */
export async function getResource(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load resource: ${error.message}`);
  return data;
}

/** Other resources sharing at least one tag (course) with this one. */
export async function getRelatedResources(
  id: string,
  tagIds: string[],
  limit = 6,
): Promise<SearchResult[]> {
  if (!tagIds.length) return [];
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("resource_tags")
    .select("resource_id")
    .in("tag_id", tagIds)
    .neq("resource_id", id);

  const ids = [...new Set((links ?? []).map((l) => l.resource_id as string))].slice(
    0,
    limit,
  );
  if (!ids.length) return [];

  const { data } = await supabase
    .from("resources")
    .select(
      "id, title, authors, year, type, url, doi, abstract, file_path, created_at",
    )
    .in("id", ids);
  return (data ?? []) as SearchResult[];
}

/** Pending suggestions awaiting faculty review (faculty-visible via RLS). */
export async function getPendingResources(): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select(
      "id, title, authors, year, type, url, doi, abstract, file_path, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as SearchResult[];
}

/** Count of pending suggestions (for the Review badge). */
export async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

/** Public URL for a file stored in the `resources` bucket. */
export async function getFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
}
