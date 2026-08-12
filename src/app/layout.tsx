import type { Metadata } from "next";
import { Crimson_Pro, Atkinson_Hyperlegible } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "@/components/icons";
import SavedNavLink from "@/components/SavedNavLink";
import UserMenu from "@/components/UserMenu";
import { BookmarksProvider } from "@/components/BookmarksProvider";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const serif = Crimson_Pro({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const sans = Atkinson_Hyperlegible({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "PsychLib · Fresno State School Psychology",
  description:
    "A searchable library of readings, assessments, and resources for the Fresno State School Psychology Ed.S. program.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BookmarksProvider>
          <div className="brand-rule h-1 w-full" />
          <header className="sticky top-0 z-30 border-b border-[var(--header-border)] bg-header text-header-fg">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
              <Link href="/" className="group flex items-center gap-3">
                <Image
                  src="/fresno-state-bulldog.png"
                  alt="Fresno State Bulldogs"
                  width={48}
                  height={48}
                  priority
                  className="h-11 w-auto object-contain"
                />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-lg font-semibold tracking-tight">
                    PsychLib
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-header-muted">
                    Fresno State · School Psychology
                  </span>
                </span>
              </Link>

              {user && (
                <div className="flex items-center gap-1.5">
                  <SavedNavLink />
                  {user.role === "faculty" ? (
                    <>
                      <Link
                        href="/manage"
                        className="hidden rounded-lg px-3 py-2.5 text-sm font-bold text-header-fg/90 transition-colors hover:bg-white/10 sm:inline-block"
                      >
                        Manage
                      </Link>
                      <Link
                        href="/add"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg shadow-sm transition-colors hover:bg-primary-hover"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Add resource</span>
                        <span className="sm:hidden">Add</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/suggest"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-bold text-header-fg transition-colors hover:bg-white/10"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Suggest</span>
                      <span className="sm:hidden">Suggest</span>
                    </Link>
                  )}
                  <UserMenu email={user.email} role={user.role} />
                </div>
              )}
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-8 border-t border-border">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6">
              <span className="flex items-center gap-2">
                <Image
                  src="/fresno-state-bulldog.png"
                  alt="Fresno State Bulldogs"
                  width={24}
                  height={24}
                  className="h-5 w-auto object-contain"
                />
                <span className="font-semibold uppercase tracking-wide">
                  Fresno State Bulldogs
                </span>
              </span>
              <span>
                PsychLib · Built for the School Psychology Ed.S. program
              </span>
            </div>
          </footer>
        </BookmarksProvider>
      </body>
    </html>
  );
}
