import Link from "next/link";
import { redirect } from "next/navigation";
import MultiPdfImport from "@/components/MultiPdfImport";
import { getTags } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MultiPdfPage() {
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");
  const tags = await getTags();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/add" className="text-sm text-muted hover:underline">
        ← Back to add
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Add multiple PDFs
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Drop in a stack of PDFs. We read each one, auto-fill its details, and
        save them all together.
      </p>
      <MultiPdfImport tags={tags} />
    </div>
  );
}
