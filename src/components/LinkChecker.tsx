"use client";

import { useState } from "react";
import Link from "next/link";
import { checkLinks, type BrokenLink } from "@/app/manage/actions";
import { CheckIcon, ExternalIcon } from "@/components/icons";

export default function LinkChecker() {
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");
  const [broken, setBroken] = useState<BrokenLink[]>([]);
  const [checked, setChecked] = useState(0);

  async function run() {
    setStatus("checking");
    const res = await checkLinks();
    setBroken(res.broken);
    setChecked(res.checked);
    setStatus("done");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Check every resource link and DOI for dead pages. Sites that block
        automated checks (403/405) are treated as healthy to avoid false alarms.
      </p>
      <button
        onClick={run}
        disabled={status === "checking"}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "checking" && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />
        )}
        {status === "checking" ? "Checking…" : "Check links"}
      </button>

      {status === "done" &&
        (broken.length === 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-navy">
            <CheckIcon className="h-4 w-4" />
            All {checked} links look healthy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-primary">
              {broken.length} of {checked} may be broken:
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {broken.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="truncate text-xs text-muted">
                      {b.status} · {b.url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open link"
                      className="rounded-md p-1.5 text-muted transition hover:bg-surface-2"
                    >
                      <ExternalIcon className="h-4 w-4" />
                    </a>
                    <Link
                      href={`/resource/${b.id}/edit`}
                      className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-bold transition hover:bg-surface-2"
                    >
                      Fix
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
