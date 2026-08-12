/*
  Supabase connection config.

  These are the PUBLIC project URL and anon key. The anon key is designed to
  ship in client-side code; the database is protected by Row Level Security,
  not by keeping this value secret. Env vars override the defaults so another
  environment can point at a different project without a code change.
*/
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://gdeqohgyqoolbpyaewox.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZXFvaGd5cW9vbGJweWFld294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTQwNjUsImV4cCI6MjA5OTIzMDA2NX0.kmXAKFPgB-h8k4pBDN5xRQZzPeMyYsyfMBfxD9zjpWs";
