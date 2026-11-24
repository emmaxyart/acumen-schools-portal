"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/password-field";
import Logo from "@/components/logo";
import AuthVisual from "@/components/auth-visual";
import { FadeIn } from "@/components/motion";

export default function Login() {
  const router = useRouter();

  // Arrived with a cookie for an account that no longer exists: clear it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("expired")) {
      fetch("/api/auth/logout", { method: "POST" }).then(() => router.replace("/login"));
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = (await res.json()) as { mustChangePassword?: boolean };
      router.push(data.mustChangePassword ? "/change-password" : "/dashboard");
      router.refresh();
    } else {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-white">
      <AuthVisual />
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size={80} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-brand-700">Acumen Schools Portal</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue to your portal</p>
          </div>
          <FadeIn delay={0.1}>
          <form onSubmit={submit} className="card space-y-4 p-6 shadow-lg shadow-slate-900/5">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
              <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button className="btn w-full py-2.5" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            <Link href="/forgot-password" className="block text-center text-xs text-slate-500 hover:text-brand-700 hover:underline">
              Forgot your password?
            </Link>
          </form>
          </FadeIn>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Acumen Schools Portal</p>
        </div>
      </section>
    </main>
  );
}
