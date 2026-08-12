/*
  Inline SVG icons (Lucide-style, 1.75 stroke) so we never ship emoji as UI.
  Single consistent icon family per the design system's icon rules.
*/
type P = React.SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PaperclipIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 1 1 5.19 5.19l-8.5 8.49a1.83 1.83 0 0 1-2.6-2.6l7.79-7.78" />
  </svg>
);

export const UploadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

export const ArrowLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const ExternalIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const FileIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h6" />
  </svg>
);

export const LinkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const XIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const QuoteIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4" />
    <path d="M14 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4" />
  </svg>
);

export const FilterIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const EditIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const BookmarkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const FolderIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" />
  </svg>
);

export const ChevronDownIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const BookmarkFilledIcon = (p: P) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

/** Type → icon mapping used on cards and detail. */
export const TypeIcon = ({ type, ...p }: P & { type: string }) => {
  switch (type) {
    case "book":
      return <BookIcon {...p} />;
    case "link":
      return <LinkIcon {...p} />;
    default:
      return <FileIcon {...p} />;
  }
};

/*
  Original stylized bulldog head, a nod to the Fresno State Bulldogs, drawn
  from scratch (NOT the trademarked athletics logo, which needs permission).
*/
export const BulldogMark = (p: P) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...p}
  >
    <path
      d="M9 17c0-3 2-5 5-5 1.6 0 2.4.6 3.6 1.3C19.4 10.5 21.5 9.5 24 9.5s4.6 1 6.4 3.8C31.6 12.6 32.4 12 34 12c3 0 5 2 5 5 0 1.5-.5 2.6-1.3 3.6.8 1 1.3 2.3 1.3 3.9 0 3.2-1.6 5.4-4 6.7V33a3 3 0 0 1-3 3h-1.2c-.8 2-2.4 3.2-4.6 3.6V40h-6.4v-.4c-2.2-.4-3.8-1.6-4.6-3.6H14a3 3 0 0 1-3-3v-1.8c-2.4-1.3-4-3.5-4-6.7 0-1.6.5-2.9 1.3-3.9C7.5 19.6 7 18.5 7 17"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M9 17c0-3 2-5 5-5 1.6 0 2.4.6 3.6 1.3C19.4 10.5 21.5 9.5 24 9.5s4.6 1 6.4 3.8C31.6 12.6 32.4 12 34 12c3 0 5 2 5 5 0 1.5-.5 2.6-1.3 3.6.8 1 1.3 2.3 1.3 3.9 0 3.2-1.6 5.4-4 6.7V33a3 3 0 0 1-3 3h-1.2c-.8 2-2.4 3.2-4.6 3.6V40h-6.4v-.4c-2.2-.4-3.8-1.6-4.6-3.6H14a3 3 0 0 1-3-3v-1.8c-2.4-1.3-4-3.5-4-6.7 0-1.6.5-2.9 1.3-3.9C7.5 19.6 7 18.5 7 17Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="18.5" cy="22" r="1.7" fill="currentColor" />
    <circle cx="29.5" cy="22" r="1.7" fill="currentColor" />
    <path
      d="M20 28.5c1.2 1 2.8 1 4 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M24 26.5v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
