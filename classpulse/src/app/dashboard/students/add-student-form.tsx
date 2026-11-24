"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddStudentForm({ classes }: { classes: { id: string; label: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(f)),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Added ${data.admissionNo}. Temporary password: ${data.tempPassword} (they must change it at first sign-in)` });
      form.reset();
      router.refresh();
    } else setMsg({ ok: false, text: data.error ?? "Could not add student" });
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-6">
      <input name="name" className="input sm:col-span-2" placeholder="Full name" required />
      <input name="email" type="email" className="input sm:col-span-2" placeholder="Email" required />
      <select name="gender" className="input" required defaultValue="">
        <option value="" disabled>Gender</option><option value="M">Male</option><option value="F">Female</option>
      </select>
      <select name="classId" className="input" required defaultValue="">
        <option value="" disabled>Class</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input name="guardianEmail" type="email" className="input sm:col-span-4" placeholder="Parent's email (optional, must already have an account)" />
      <button className="btn sm:col-span-2" disabled={busy}>{busy ? "Adding…" : "Add student"}</button>
      {msg && <p className={`text-sm sm:col-span-6 ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
