"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import PasswordField from "@/components/password-field";
import Logo from "@/components/logo";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError("The passwords don't match");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, next }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } else setError(data.error ?? "Could not reset password");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-700">Choose a new password</h1>
        </div>
        <p className="mb-6 text-center text-sm text-slate-600">Your new password must be at least 10 characters, with a letter and a number.</p>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="next">New password</label>
            <PasswordField id="next" name="next" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="confirm">Confirm new password</label>
            <PasswordField id="confirm" name="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {done ? (
            <p role="status" className="text-sm text-brand-700">Password updated. Taking you to sign in…</p>
          ) : !token ? (
            <p className="text-sm text-red-600">This link is missing its reset token. Request a new one.</p>
          ) : (
            <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
          )}
          <Link href="/forgot-password" className="block text-center text-sm text-slate-500 hover:underline">Request a new link</Link>
        </form>
      </div>
    </main>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}>
      <ResetForm />
    </Suspense>
  );
}
