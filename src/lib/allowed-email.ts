/*
  Who may hold an account. Mirrored by a database trigger, which is the real
  enforcement: this copy only gives a clear message before a request is sent.
  Keep ADMIN_EMAILS in step with public.faculty_allowlist.
*/
export const ALLOWED_DOMAINS = ["mail.fresnostate.edu", "fresnostate.edu"];

export const ADMIN_EMAILS = [
  "arnavbajra1@gmail.com",
  "alexjunava@gmail.com",
];

export function isAllowedEmail(raw: string): boolean {
  const addr = raw.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(addr)) return true;
  const domain = addr.split("@")[1];
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}
