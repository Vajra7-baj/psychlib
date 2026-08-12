# PsychLib

A searchable resource library for the Fresno State School Psychology Ed.S.
program. Faculty curate readings, assessments, and references in one place;
students search them instantly instead of digging through Canvas.

**Live:** https://psychlib.vercel.app

## Why it exists

Course materials for the program were scattered across Canvas pages, emails,
and personal folders. Finding "that ADHD assessment reading from last
semester" meant hunting through modules. PsychLib puts everything in one
searchable collection, organized around the program's actual course structure.

## What makes the search useful

Search covers more than titles. When a PDF is uploaded, its text is extracted
and indexed, so a search for a phrase buried on page 12 of an article still
finds it. Results are ranked by where the match occurred, weighted in this
order:

| Weight | Field |
| ------ | ----- |
| A | Title |
| B | Authors |
| C | Abstract |
| D | Extracted PDF text |

A title match therefore outranks a passing mention in the body. Filters for
course and resource type stack on top, and every search is a shareable URL.

## Features

**Finding things**
- Full-text search across titles, authors, abstracts, and PDF contents
- Filter by course and resource type; sort by relevance, date, or title
- Related resources surfaced on each detail page
- In-browser PDF preview

**Adding things**
- Upload a PDF and the form fills itself: the PDF is scanned for a DOI, then
  metadata is pulled from CrossRef, with the PDF's own embedded info as a
  fallback
- Paste a DOI to auto-fill without a file
- Bulk import from a list of DOIs or a BibTeX/RIS export
- Drop many PDFs at once, each auto-filled, reviewed, and saved together
- Duplicate detection warns when a DOI or title is already in the library

**Using things**
- Bookmarks and named collections ("Week 3 reading"), synced to the account
- Citations in APA, MLA, and Chicago with one-click copy
- Export a collection as an APA reference list, BibTeX, or RIS for Zotero,
  Mendeley, or EndNote

**Curating things**
- Faculty and student roles: faculty curate, students read and bookmark
- Students can suggest resources; faculty approve or reject from a queue
- Course list managed in the app, no SQL required
- Link checker flags dead URLs and DOIs across the collection

## Stack

- **Next.js 16** (App Router, Server Actions) with **React 19** and TypeScript
- **Tailwind CSS v4** with CSS-variable theming, light and dark
- **Supabase**: Postgres, Storage, and magic-link auth
- **Postgres full-text search** with weighted `tsvector` ranking
- **unpdf** for PDF text extraction, **CrossRef** for metadata

## Access and security

Sign-in is by emailed magic link, restricted to Fresno State addresses plus an
allowlist. Row Level Security governs every table: unauthenticated requests
read nothing, students read approved resources and manage only their own
bookmarks, and writes are limited to faculty. Uploads are validated
server-side as PDFs, and outbound links are checked so only `http(s)` URLs
render.

The Supabase URL and anon key in `src/lib/supabase/config.ts` are public
values, intended to ship in client code. Access is controlled by the policies
above, not by hiding them.

## Running locally

```bash
npm install
npm run dev
```

The app connects to the shared Supabase project by default. To point it
somewhere else, create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then apply the migrations in `supabase/migrations/` in order, through the
Supabase SQL editor.

## Project layout

```
src/
  app/          Routes: library, resource detail, add, bulk, manage, auth
  components/   UI: search, facets, forms, bookmarks, citations
  lib/          Search queries, PDF and CrossRef metadata, citation and
                export formats, Supabase clients
supabase/
  migrations/   Schema, search function, RLS policies, taxonomy seed
```

## Status

Deployed and in use. The Fresno State Bulldog logo belongs to the university
and is used here for a program tool; wider distribution would need approval
from the university's brand office.
