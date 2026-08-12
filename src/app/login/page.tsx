"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon } from "@/components/icons";

const ALLOWED = ["mail.fresnostate.edu", "fresnostate.edu"];
// Admin/allowlisted addresses that may sign in without a Fresno State domain.
// Keep this in sync with public.faculty_allowlist in the database.
const ADMIN_EMAILS = ["arnavbajra1@gmail.com"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    const domain = addr.split("@")[1];
    const allowed =
      (domain && ALLOWED.includes(domain)) || ADMIN_EMAILS.includes(addr);
    if (!allowed) {
      setStatus("error");
      setMessage("Please use your Fresno State email (@mail.fresnostate.edu).");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
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
          PsychLib
        </h1>
        <p className="mt-1 text-sm text-muted">
          Fresno State · School Psychology resource library
        </p>
      </div>

      {status === "sent" ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-primary">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-lg font-semibold">
            Check your email
          </h2>
          <p className="mt-1 text-sm text-muted">
            We sent a secure sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Open
            it on this device to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
            />
          </label>
          {status === "error" && (
            <p className="rounded-lg border border-accent-soft bg-accent-soft px-3 py-2 text-sm text-primary">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          <p className="text-center text-xs text-muted">
            We&rsquo;ll email you a secure sign-in link. No password needed.
          </p>
        </form>
      )}
    </div>
  );
}
