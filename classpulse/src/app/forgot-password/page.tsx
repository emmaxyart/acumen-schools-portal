"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/logo";
import AuthVisual from "@/components/auth-visual";
import { FadeIn } from "@/components/motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; devLink?: string };
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setDevLink(data.devLink ?? "");
    } else setError(data.error ?? "Could not request a reset link");
  }

  return (
    <main className="flex min-h-screen bg-white">
      <AuthVisual />
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size={80} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-700">Acumen Schools Portal</h1>
            <p className="mt-1 text-sm text-slate-500">Reset your account password</p>
          </div>
          <FadeIn delay={0.1}>
          <form onSubmit={submit} className="card space-y-4 p-6 shadow-lg shadow-slate-900/5">
            <p className="text-sm leading-relaxed text-slate-600">
              Enter your account email and we&apos;ll send you a link to choose a new password.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {done ? (
              <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                If that email has an account, a reset link has been sent. Check your inbox.
              </p>
            ) : (
              <button className="btn w-full py-2.5" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
            )}
            {/* Local-only convenience while no email provider is configured. */}
            {devLink && (
              <p className="break-all rounded bg-amber-50 p-2 text-xs text-amber-800">
                Local dev link (email isn&apos;t configured): <Link className="underline" href={devLink}>{devLink}</Link>
              </p>
            )}
            <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-brand-700 hover:underline">
              Back to sign in
            </Link>
          </form>
          </FadeIn>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Acumen Schools Portal</p>
        </div>
      </section>
    </main>
  );
}
