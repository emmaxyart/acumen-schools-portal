"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostForm() {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: f.title, body: f.body, audience: f.audience || null }),
    });
    if (res.ok) { form.reset(); setErr(""); router.refresh(); }
    else setErr((await res.json()).error ?? "Could not post");
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <input name="title" className="input" placeholder="Title" required />
      <textarea name="body" className="input min-h-[90px]" placeholder="Message" required />
      <div className="flex flex-wrap items-center gap-3">
        <select name="audience" className="input w-auto" defaultValue="">
          <option value="">Everyone</option>
          <option value="TEACHER">Teachers</option>
          <option value="PARENT">Parents</option>
          <option value="STUDENT">Students</option>
        </select>
        <button className="btn">Post announcement</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </form>
  );
}
