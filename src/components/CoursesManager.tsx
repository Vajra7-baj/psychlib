"use client";

import { useActionState } from "react";
import {
  createCourseTag,
  deleteCourseTag,
  renameCourseTag,
  type ManageState,
} from "@/app/manage/actions";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { Tag } from "@/lib/types";

const initial: ManageState = { ok: false };

export default function CoursesManager({ courses }: { courses: Tag[] }) {
  const [state, addAction, pending] = useActionState(createCourseTag, initial);

  return (
    <div className="flex flex-col gap-4">
      {/* Add */}
      <form action={addAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          required
          placeholder="New course, e.g. PSYCH 250 · Consultation"
          className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          Add course
        </button>
      </form>
      {state.error && (
        <p className="rounded-lg border border-accent-soft bg-accent-soft px-3 py-2 text-sm text-primary">
          {state.error}
        </p>
      )}

      {/* Existing courses */}
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {courses.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">No courses yet.</li>
        )}
        {courses.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-2">
            <form
              action={renameCourseTag}
              className="flex flex-1 items-center gap-2"
            >
              <input type="hidden" name="id" value={c.id} />
              <input
                name="name"
                defaultValue={c.name}
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:border-border focus:border-primary focus:bg-surface"
              />
              <button
                type="submit"
                className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-bold transition hover:bg-surface-2"
              >
                Save
              </button>
            </form>
            <form
              action={deleteCourseTag}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Delete "${c.name}"? It will be removed from any resources tagged with it.`,
                  )
                )
                  e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                aria-label={`Delete ${c.name}`}
                className="rounded-md p-1.5 text-muted transition hover:bg-accent-soft hover:text-primary"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
