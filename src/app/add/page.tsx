import Link from "next/link";
import { redirect } from "next/navigation";
import ResourceForm from "@/components/ResourceForm";
import { addResource } from "@/app/actions";
import { getTags } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");
  const tags = await getTags();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Back to library
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Add a resource
      </h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        Upload a PDF (we auto-fill the details) or paste a DOI. Adding a lot at
        once? Use one of the bulk options.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/add/pdfs"
          className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
        >
          <p className="text-sm font-bold">Add multiple PDFs</p>
          <p className="mt-0.5 text-xs text-muted">
            Drop a stack of PDFs. Each one is auto-filled and saved together.
          </p>
        </Link>
        <Link
          href="/add/bulk"
          className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
        >
          <p className="text-sm font-bold">Bulk import (DOIs / BibTeX / RIS)</p>
          <p className="mt-0.5 text-xs text-muted">
            Paste DOIs or upload a reference file to import many at once.
          </p>
        </Link>
      </div>

      <ResourceForm tags={tags} action={addResource} submitLabel="Add resource" />
    </div>
  );
}
