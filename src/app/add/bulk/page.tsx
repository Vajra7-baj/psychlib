import Link from "next/link";
import { redirect } from "next/navigation";
import BulkImport from "@/components/BulkImport";
import { getTags } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BulkImportPage() {
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");
  const tags = await getTags();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/add" className="text-sm text-muted hover:underline">
        ← Back to add
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Bulk import
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Paste a list of DOIs, or upload a BibTeX/RIS file exported from Zotero,
        Mendeley, or a database. We&rsquo;ll fetch the details and add them all
        at once.
      </p>
      <BulkImport tags={tags} />
    </div>
  );
}
