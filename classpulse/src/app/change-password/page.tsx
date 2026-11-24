"use client";
import { useState } from "react";
import PasswordField from "@/components/password-field";
import Logo from "@/components/logo";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.next !== f.confirm) return setError("The new passwords don't match");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: f.current, next: f.next }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not change password");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-700">Choose a new password</h1>
        </div>
        <p className="mb-6 text-center text-sm text-slate-600">
          For your security, replace the temporary password you were given before continuing.
        </p>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="current">Current (temporary) password</label>
            <PasswordField id="current" name="current" autoComplete="current-password" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="next">New password</label>
            <PasswordField id="next" name="next" autoComplete="new-password" minLength={10} required />
            <p className="mt-1 text-xs text-slate-500">At least 10 characters, with a letter and a number.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="confirm">Confirm new password</label>
            <PasswordField id="confirm" name="confirm" autoComplete="new-password" required />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button>
        </form>
      </div>
    </main>
  );
}
