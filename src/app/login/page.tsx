"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon } from "@/components/icons";
import { isAllowedEmail } from "@/lib/allowed-email";

type Mode = "signin" | "signup";
type Sent = "confirm" | "reset" | "magic";

const MIN_PASSWORD = 8;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);

  function domainOk(): boolean {
    if (isAllowedEmail(email)) return true;
    setError("Please use your Fresno State email (@mail.fresnostate.edu).");
    return false;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!domainOk()) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      // With confirmation on, there's a user but no session yet.
      if (data.session) router.replace("/");
      else setSent("confirm");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError(
        /confirm/i.test(error.message)
          ? "Please confirm your email first. Check your inbox for the link we sent when you signed up."
          : "That email and password don't match. Try again, or reset your password below.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function sendReset() {
    setError("");
    if (!domainOk()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent("reset");
  }

  async function sendMagicLink() {
    setError("");
    if (!domainOk()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent("magic");
  }

  if (sent) {
    const copy = {
      confirm: {
        title: "Confirm your email",
        body: "We sent a confirmation link to",
        tail: "Open it once and you're set. After that you'll just use your password.",
      },
      reset: {
        title: "Check your email",
        body: "We sent a password reset link to",
        tail: "Open it to choose a new password.",
      },
      magic: {
        title: "Check your email",
        body: "We sent a sign-in link to",
        tail: "Open it on this device to continue.",
      },
    }[sent];

    return (
      <Shell>
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-primary">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-lg font-semibold">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {copy.body}{" "}
            <span className="font-medium text-foreground">{email}</span>.{" "}
            {copy.tail}
          </p>
          <button
            onClick={() => {
              setSent(null);
              setPassword("");
            }}
            className="mt-4 text-sm text-muted underline hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Sign in / Create account */}
      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${
              mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Fresno State email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mail.fresnostate.edu"
            autoComplete="email"
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? `At least ${MIN_PASSWORD} characters` : ""}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-1.5 text-xs text-muted">
        {mode === "signin" && (
          <button
            onClick={sendReset}
            disabled={busy}
            className="underline hover:text-foreground disabled:opacity-50"
          >
            Forgot your password?
          </button>
        )}
        <button
          onClick={sendMagicLink}
          disabled={busy}
          className="underline hover:text-foreground disabled:opacity-50"
        >
          Email me a sign-in link instead
        </button>
        <p className="mt-1 text-center">
          {mode === "signup"
            ? "You'll confirm your email once. After that, just your password."
            : "Access is limited to the Fresno State School Psychology program."}
        </p>
      </div>
    </Shell>
  );
}

const input =
  "w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]";

function Shell({ children }: { children: React.ReactNode }) {
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
          PsychLib
        </h1>
        <p className="mt-1 text-sm text-muted">
          Fresno State · School Psychology resource library
        </p>
      </div>
      {children}
    </div>
  );
}
