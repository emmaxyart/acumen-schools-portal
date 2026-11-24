"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { studentId: string; feeItemId: string; label: string; due: number };

export default function RecordPayment({ options }: { options: Opt[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const o = options[Number(idx)];
    if (!o) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: o.studentId, feeItemId: o.feeItemId, amount: Number(amount) }),
    });
    const d = await res.json();
    if (res.ok) {
      setMsg({ ok: true, text: `Payment recorded. Reference ${d.reference}` });
      setIdx(""); setAmount("");
      router.refresh();
    } else setMsg({ ok: false, text: d.error ?? "Could not record payment" });
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-6">
      <select className="input sm:col-span-3" value={idx} onChange={(e) => { setIdx(e.target.value); setAmount(String(options[Number(e.target.value)]?.due ?? "")); }} required>
        <option value="" disabled>Select student and fee item</option>
        {options.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
      </select>
      <input className="input sm:col-span-2" type="number" min={1} placeholder="Amount (₦)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <button className="btn">Record payment</button>
      {msg && <p className={`text-sm sm:col-span-6 ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
