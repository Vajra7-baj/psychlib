import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPendingResources } from "@/lib/queries";
import { RESOURCE_TYPE_LABELS } from "@/lib/types";
import { CheckIcon, TypeIcon } from "@/components/icons";
import PendingActions from "@/components/PendingActions";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (user?.role !== "faculty") redirect("/");

  const pending = await getPendingResources();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/manage" className="text-sm text-muted hover:underline">
        ← Back to manage
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Suggested resources
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Submitted by students. Approve to add to the library, or reject to
        discard. You can tag and attach files after approving, from the
        resource&rsquo;s edit page.
      </p>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-soft text-navy">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="font-medium">Nothing to review</p>
          <p className="max-w-sm text-sm text-muted">
            New student suggestions will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((r) => {
            const link = r.doi
              ? `https://doi.org/${r.doi.replace(/^https?:\/\/doi\.org\//, "")}`
              : r.url;
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-muted">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
                      <TypeIcon type={r.type} className="h-3.5 w-3.5" />
                      {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
                    </span>
                    {r.year && (
                      <span className="text-xs tabular-nums">{r.year}</span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-semibold leading-snug">
                    {r.title}
                  </h3>
                  {r.authors?.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      {r.authors.join(", ")}
                    </p>
                  )}
                  {r.abstract && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">
                      {r.abstract}
                    </p>
                  )}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block truncate text-xs text-navy underline"
                    >
                      {link}
                    </a>
                  )}
                </div>
                <PendingActions id={r.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
