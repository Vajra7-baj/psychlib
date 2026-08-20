"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

/**
 * Reached from a password reset email. The link is verified by
 * /auth/confirm first, so by the time this renders the visitor holds a
 * recovery session and can set a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        /session/i.test(error.message)
          ? "This reset link has expired. Request a new one from the sign-in page."
          : error.message,
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/fresno-state-bulldog.png"
          alt="Fresno State Bulldogs"
          width={72}
          height={72}
          priority
          className="h-16 w-auto object-contain"
        />
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          Choose a new password
        </h1>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">New password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Confirm new password</span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={input}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-accent-soft bg-accent-soft px-3 py-2 text-sm text-primary">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
        >
          {busy && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />
          )}
          Save password
        </button>
      </form>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]";
