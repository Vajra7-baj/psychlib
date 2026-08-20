"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tag, TagCategory } from "@/lib/types";
import { RESOURCE_TYPE_LABELS } from "@/lib/types";
import { FilterIcon } from "@/components/icons";

const CATEGORY_ORDER: { key: TagCategory; label: string }[] = [
  { key: "course", label: "Course" },
  { key: "topic", label: "Topic" },
];

export default function Facets({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const activeTags = new Set(params.getAll("tag"));
  const activeType = params.get("type");

  function update(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  function toggleTag(id: string) {
    update((sp) => {
      const current = sp.getAll("tag");
      sp.delete("tag");
      const next = current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id];
      next.forEach((t) => sp.append("tag", t));
    });
  }

  function toggleType(t: string) {
    update((sp) => {
      if (sp.get("type") === t) sp.delete("type");
      else sp.set("type", t);
    });
  }

  const hasFilters = activeTags.size > 0 || !!activeType;

  return (
    <div className="scroll-slim flex flex-col gap-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <FilterIcon className="h-4 w-4 text-navy" />
          Filters
        </h2>
        {hasFilters && (
          <button
            onClick={() => update((sp) => {
              sp.delete("tag");
              sp.delete("type");
            })}
            className="text-xs text-accent hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Resource type */}
      <FacetGroup label="Type">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => toggleType(value)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeType === value
                  ? "border-navy bg-navy text-navy-fg"
                  : "border-border bg-surface hover:border-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FacetGroup>

      {CATEGORY_ORDER.map(({ key, label }) => {
        const groupTags = tags.filter((t) => t.category === key);
        if (!groupTags.length) return null;
        return (
          <FacetGroup key={key} label={label}>
            <ul className="flex flex-col gap-0.5">
              {groupTags.map((tag) => {
                const checked = activeTags.has(tag.id);
                return (
                  <li key={tag.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-surface-2 ${
                        checked ? "text-foreground" : "text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTag(tag.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--navy)]"
                      />
                      <span className="leading-snug">
                        {key === "topic" ? `#${tag.name}` : tag.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </FacetGroup>
        );
      })}
    </div>
  );
}

function FacetGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </h3>
      {children}
    </div>
  );
}
