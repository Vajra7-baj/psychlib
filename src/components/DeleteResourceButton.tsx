"use client";

import { deleteResource } from "@/app/actions";
import { TrashIcon } from "@/components/icons";

export default function DeleteResourceButton({ id }: { id: string }) {
  return (
    <form
      action={deleteResource}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete this resource permanently? This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-bold text-muted transition-colors hover:border-primary hover:bg-accent-soft hover:text-primary"
      >
        <TrashIcon className="h-4 w-4" />
        Delete
      </button>
    </form>
  );
}
