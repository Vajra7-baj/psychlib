/*
  URL handling shared by the server actions and every place a stored link is
  rendered. Two separate jobs live here:

    safeHttpUrl   - is this safe to put in an href? (blocks javascript:, data:)
    isPublicHttpUrl - is this safe for the server to fetch? (blocks internal
                    addresses, so the link checker can't be pointed at the
                    host's own network)
*/

/** Accept only http(s). Anything else becomes null rather than an href. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Build the canonical doi.org link for a stored DOI. */
export function doiUrl(doi: string | null | undefined): string | null {
  if (!doi) return null;
  const bare = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (!bare) return null;
  return `https://doi.org/${encodeURI(bare)}`;
}

/** The best outbound link for a resource: its DOI if present, else its URL. */
export function resourceLink(
  doi: string | null | undefined,
  url: string | null | undefined,
): string | null {
  return doiUrl(doi) ?? safeHttpUrl(url);
}

/*
  Addresses that must never be fetched by the server. Without this, a link
  saved in the library could point the link checker at the host's own network
  (cloud metadata endpoints, loopback, private ranges) and use the returned
  status codes to probe internal services.
*/
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local, includes cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a >= 224 // multicast and reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::1" || s === "::") return true;
  if (s.startsWith("fe80") || s.startsWith("fc") || s.startsWith("fd"))
    return true;
  // IPv4-mapped, e.g. ::ffff:127.0.0.1
  const mapped = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal"))
    return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return isPrivateIPv4(h);
  if (h.includes(":")) return isPrivateIPv6(h);
  return false;
}

/**
 * Safe for the server to request: http(s), on a host that isn't internal.
 * Hostnames that merely *resolve* to a private address are caught at fetch
 * time by re-checking every redirect hop (see the link checker).
 */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return !isBlockedHost(u.hostname);
  } catch {
    return false;
  }
}
