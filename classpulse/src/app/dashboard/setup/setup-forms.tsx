"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: string; label: string };
type TermOpt = Opt & { current: boolean };
type Msg = { ok: boolean; text: string } | null;

export default function SetupForms({ classes, terms }: { classes: Opt[]; terms: TermOpt[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "PATCH", body: unknown, okText: (d: Record<string, unknown>) => string) {
    setBusy(true);
    const res = await fetch("/api/setup", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: okText(data) });
      router.refresh();
      return true;
    }
    setMsg({ ok: false, text: String(data.error ?? "Something went wrong") });
    return false;
  }

  // Builds a submit handler that turns the form's fields into the request body.
  const handle =
    (build: (f: Record<string, string>) => unknown, okText: (d: Record<string, unknown>) => string) =>
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
      if (await send("POST", build(f), okText)) form.reset();
    };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="card flex flex-wrap items-end gap-2"
          onSubmit={handle((f) => ({ kind: "class", name: f.name, arm: f.arm }), () => "Class added.")}
        >
          <p className="w-full text-sm font-semibold">Add class</p>
          <input name="name" className="input w-40" placeholder="JSS 1" required />
          <input name="arm" className="input w-20" placeholder="A" required />
          <button className="btn" disabled={busy}>Add</button>
        </form>

        <form
          className="card flex flex-wrap items-end gap-2"
          onSubmit={handle((f) => ({ kind: "subject", name: f.name, code: f.code }), () => "Subject added.")}
        >
          <p className="w-full text-sm font-semibold">Add subject</p>
          <input name="name" className="input w-48" placeholder="Mathematics" required />
          <input name="code" className="input w-24" placeholder="MTH" required />
          <button className="btn" disabled={busy}>Add</button>
        </form>

        <form
          className="card flex flex-wrap items-end gap-2"
          onSubmit={handle(
            (f) => ({ kind: "term", name: f.name, session: f.session, current: f.current === "on" }),
            () => "Term added."
          )}
        >
          <p className="w-full text-sm font-semibold">Add term</p>
          <select name="name" className="input w-40" defaultValue="First Term">
            <option>First Term</option><option>Second Term</option><option>Third Term</option>
          </select>
          <input name="session" className="input w-32" placeholder="2026/2027" required />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="current" /> Make current</label>
          <button className="btn" disabled={busy}>Add</button>
        </form>

        <div className="card space-y-2">
          <p className="text-sm font-semibold">Current term</p>
          <select
            className="input"
            value={terms.find((t) => t.current)?.id ?? ""}
            disabled={busy || terms.length === 0}
            onChange={(e) => send("PATCH", { termId: e.target.value }, () => "Current term updated.")}
          >
            <option value="" disabled>Select a term</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className="text-xs text-slate-500">Results and fees pages show this term.</p>
        </div>
      </div>

      <form
        className="card grid gap-3 sm:grid-cols-6"
        onSubmit={handle(
          (f) => ({
            kind: "fee",
            title: f.title,
            amount: Number(f.amount),
            termId: f.termId,
            classId: f.classId || null,
          }),
          () => "Fee item added."
        )}
      >
        <p className="text-sm font-semibold sm:col-span-6">Add fee item</p>
        <input name="title" className="input sm:col-span-2" placeholder="Tuition" required />
        <input name="amount" type="number" min={1} className="input" placeholder="Amount (₦)" required />
        <select name="termId" className="input sm:col-span-2" required defaultValue="">
          <option value="" disabled>Term</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select name="classId" className="input" defaultValue="">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button className="btn sm:col-span-6 sm:w-40" disabled={busy}>Add fee item</button>
      </form>

      <form
        className="card grid gap-3 sm:grid-cols-6"
        onSubmit={handle(
          (f) => ({ kind: "teacher", name: f.name, email: f.email }),
          (d) => `Teacher account created. Temporary password: ${String(d.tempPassword)} (they must change it at first sign-in)`
        )}
      >
        <p className="text-sm font-semibold sm:col-span-6">Add teacher account</p>
        <input name="name" className="input sm:col-span-2" placeholder="Full name" required />
        <input name="email" type="email" className="input sm:col-span-3" placeholder="Email" required />
        <button className="btn" disabled={busy}>Add teacher</button>
      </form>

      <form
        className="card grid gap-3 sm:grid-cols-6"
        onSubmit={handle(
          (f) => ({ kind: "parent", name: f.name, email: f.email, phone: f.phone || undefined }),
          (d) => `Parent account created. Temporary password: ${String(d.tempPassword)} (they must change it at first sign-in)`
        )}
      >
        <p className="text-sm font-semibold sm:col-span-6">Add parent account</p>
        <input name="name" className="input sm:col-span-2" placeholder="Full name" required />
        <input name="email" type="email" className="input sm:col-span-2" placeholder="Email" required />
        <input name="phone" className="input" placeholder="Phone (optional)" />
        <button className="btn" disabled={busy}>Add parent</button>
      </form>

      {msg && <p className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
