"use client";

import { useMemo, useState } from "react";
import { XIcon } from "@/components/icons";

/**
 * Free-form topic tags, typed by whoever is adding the resource.
 *
 * Existing topics are offered as you type. Nothing is added automatically:
 * the suggestion list only surfaces tags already in the library, so
 * "executive function" doesn't end up alongside "Executive Functioning"
 * and split the vocabulary.
 */
export default function TopicTagInput({
  existing,
  initial = [],
}: {
  existing: string[];
  initial?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  const norm = (s: string) =>
    s.toLowerCase().replace(/^#+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const suggestions = useMemo(() => {
    const typed = norm(draft);
    if (!typed) return [];
    const chosen = new Set(tags.map(norm));
    return existing
      .filter((t) => norm(t).includes(typed) && !chosen.has(norm(t)))
      .slice(0, 6);
  }, [draft, existing, tags]);

  function add(raw: string) {
    const name = raw.trim().replace(/^#+/, "").trim();
    if (!name) return;
    if (tags.some((t) => norm(t) === norm(name))) {
      setDraft("");
      return;
    }
    setTags((prev) => [...prev, name]);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Submitted as one field; the server splits and de-duplicates it. */}
      <input type="hidden" name="topics" value={tags.join(",")} />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-navy-soft px-2.5 py-1 text-xs font-medium text-navy"
            >
              #{t}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="rounded-full p-0.5 transition hover:bg-navy/15"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder="Type a topic and press Enter, e.g. executive function"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
        />

        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  // onMouseDown fires before the input's blur, so the click
                  // isn't swallowed by the field losing focus.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(s);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                >
                  #{s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
