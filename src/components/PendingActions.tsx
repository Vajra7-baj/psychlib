"use client";

import { approveResource, rejectResource } from "@/app/manage/actions";
import { CheckIcon, XIcon } from "@/components/icons";

export default function PendingActions({ id }: { id: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <form action={approveResource}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-fg transition hover:bg-primary-hover"
        >
          <CheckIcon className="h-4 w-4" />
          Approve
        </button>
      </form>
      <form
        action={rejectResource}
        onSubmit={(e) => {
          if (!confirm("Reject and delete this suggestion?")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-bold text-muted transition hover:border-primary hover:text-primary"
        >
          <XIcon className="h-4 w-4" />
          Reject
        </button>
      </form>
    </div>
  );
}
