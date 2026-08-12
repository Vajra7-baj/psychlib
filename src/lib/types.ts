export type ResourceType = "pdf" | "article" | "book" | "link";

export type TagCategory = "course" | "nasp_domain" | "population" | "topic";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
}

export interface Resource {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  type: ResourceType;
  url: string | null;
  doi: string | null;
  abstract: string | null;
  notes: string | null;
  file_path: string | null;
  file_size: number | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape returned by the search_resources RPC. */
export interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  type: ResourceType;
  url: string | null;
  doi: string | null;
  abstract: string | null;
  file_path: string | null;
  created_at: string;
  rank: number;
  total_count: number;
}

export type SortOption = "relevance" | "newest" | "oldest" | "title";

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  pdf: "PDF",
  article: "Article",
  book: "Book",
  link: "Link",
};

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  course: "Course",
  nasp_domain: "NASP Domain",
  population: "Population",
  topic: "Topic",
};
