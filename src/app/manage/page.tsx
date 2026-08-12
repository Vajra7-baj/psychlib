import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPendingCount, getTags } from "@/lib/queries";
import CoursesManager from "@/components/CoursesManager";
import LinkChecker from "@/components/LinkChecker";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");

  const [tags, pending] = await Promise.all([getTags(), getPendingCount()]);
  const courses = tags.filter((t) => t.category === "course");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Back to library
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Manage library
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Faculty tools for curating the collection.
      </p>

      {/* Suggestion queue */}
      <Link
        href="/manage/pending"
        className="mb-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-sm"
      >
        <div>
          <p className="text-sm font-bold">Review suggestions</p>
          <p className="mt-0.5 text-xs text-muted">
            Approve or reject resources submitted by students.
          </p>
        </div>
        <span
          className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-bold ${
            pending > 0
              ? "bg-primary text-primary-fg"
              : "bg-surface-2 text-muted"
          }`}
        >
          {pending}
        </span>
      </Link>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Courses
        </h2>
        <CoursesManager courses={courses} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Link check
        </h2>
        <LinkChecker />
      </section>
    </div>
  );
}
