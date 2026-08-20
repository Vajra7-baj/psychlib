import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ResourceForm from "@/components/ResourceForm";
import { editResource } from "@/app/actions";
import {
  getResource,
  getResourceTagIds,
  getTags,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import type { Resource } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");

  const resource = (await getResource(id)) as Resource | null;
  if (!resource) notFound();

  const [tagIds, tags] = await Promise.all([
    getResourceTagIds(id),
    getTags(),
  ]);

  const fileName = resource.file_path
    ? resource.file_path.replace(/^[0-9a-f-]+-/, "")
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href={`/resource/${id}`} className="text-sm text-muted hover:underline">
        ← Back to resource
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Edit resource
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Update the details, tags, or replace the file.
      </p>
      <ResourceForm
        tags={tags}
        action={editResource}
        submitLabel="Save changes"
        initial={{
          id: resource.id,
          title: resource.title,
          type: resource.type,
          authors: resource.authors?.join("; ") ?? "",
          year: resource.year ? String(resource.year) : "",
          url: resource.url ?? "",
          doi: resource.doi ?? "",
          abstract: resource.abstract ?? "",
          notes: resource.notes ?? "",
          // Course tags stay as checkboxes; topics come back as editable chips.
          tagIds: tagIds.filter((id) =>
            tags.some((t) => t.id === id && t.category === "course"),
          ),
          topics: tags
            .filter((t) => t.category === "topic" && tagIds.includes(t.id))
            .map((t) => t.name),
          fileName: fileName ?? undefined,
        }}
      />
    </div>
  );
}
