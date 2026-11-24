"use client";
import { useState } from "react";

export default function PayOnline({ studentId, feeItemId, due }: { studentId: string; feeItemId: string; due: number }) {
  const [amount, setAmount] = useState(String(due));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, feeItemId, amount: Number(amount) }),
      });
      const data = (await res.json().catch(() => ({}))) as { authorizationUrl?: string; error?: string };
      if (res.ok && data.authorizationUrl) {
        window.location.assign(data.authorizationUrl); // hosted Paystack checkout
        return;
      }
      setError(data.error ?? "Could not start the payment");
    } catch {
      setError("Network problem. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={pay} className="flex items-center gap-2">
      <input
        className="input w-28" type="number" min={1} max={due} step={1}
        value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to pay in naira" required
      />
      <button className="btn" disabled={busy}>{busy ? "Redirecting…" : "Pay online"}</button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
