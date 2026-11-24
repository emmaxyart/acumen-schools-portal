import { NextResponse } from "next/server";
import { appUrl, settleIntent } from "@/lib/paystack";

// Paystack sends the customer's browser back here after checkout (?reference=...&trxref=...).
// The query string is untrusted: we only use it to look up our own intent and ask Paystack what happened.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const reference = sp.get("reference") ?? sp.get("trxref") ?? "";

  let outcome: string = "failed";
  if (/^CP-[0-9a-f]{16}$/.test(reference)) {
    try {
      const r = await settleIntent(reference);
      outcome = r === "success" ? "success" : r === "pending" ? "pending" : "failed";
    } catch (e) {
      console.error("[paystack] callback verify failed", e);
      outcome = "pending"; // the webhook will still settle it
    }
  }
  return NextResponse.redirect(new URL(`/dashboard/fees?payment=${outcome}`, appUrl(req)));
}
