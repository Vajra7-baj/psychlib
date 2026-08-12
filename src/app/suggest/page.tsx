import Link from "next/link";
import { redirect } from "next/navigation";
import ResourceForm from "@/components/ResourceForm";
import { suggestResource } from "@/app/actions";
import { getTags } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tags = await getTags();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Back to library
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Suggest a resource
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Know a reading that belongs in the library? Paste its DOI or link and a
        faculty member will review it.
      </p>
      <ResourceForm
        tags={tags}
        action={suggestResource}
        submitLabel="Submit suggestion"
        allowUpload={false}
        allowTags={false}
        successTitle="Suggestion submitted"
      />
    </div>
  );
}
