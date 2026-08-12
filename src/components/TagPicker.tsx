"use client";

import type { Tag } from "@/lib/types";

/** Course-tag chips, shared by bulk import and multi-PDF (applied to all). */
export default function TagPicker({
  tags,
  selected,
  onToggle,
  label = "Apply tags to all",
}: {
  tags: Tag[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  label?: string;
}) {
  const courses = tags.filter((t) => t.category === "course");
  if (!courses.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {courses.map((tag) => {
          const on = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                on
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-surface hover:border-primary"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
