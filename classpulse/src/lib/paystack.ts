import { db } from "@/lib/db";

const BASE = "https://api.paystack.co";

export const paystackEnabled = () => !!process.env.PAYSTACK_SECRET_KEY;

function secretKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
}

/** Public base URL for redirects. Never derive production redirects from an untrusted request host. */
export function appUrl(req: Request): string {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production");
  }
  const url = new URL(configured || new URL(req.url).origin);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("APP_URL must be a public HTTPS origin without a path in production");
  }
  return url.origin;
}

type PsEnvelope<T> = { status: boolean; message: string; data: T };

async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as PsEnvelope<T> | null;
  if (!res.ok || !json?.status) throw new Error(json?.message ?? `Paystack responded ${res.status}`);
  return json.data;
}

export function initializeTransaction(p: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: p.email,
      amount: p.amountNaira * 100, // Paystack works in kobo
      currency: "NGN",
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: p.metadata,
    },
  });
}

export function verifyTransaction(reference: string) {
  return paystack<{ status: string; reference: string; amount: number; currency: string }>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export type Settlement = "success" | "failed" | "pending" | "unknown";

/**
 * Confirms a checkout with Paystack and, if money really arrived, records the Payment exactly once.
 * Safe to call from the browser callback, the webhook, or both at the same time:
 * the status flip below is an atomic claim, so only one caller creates the Payment.
 * Throws if Paystack can't be reached, so callers can retry later.
 */
export async function settleIntent(reference: string): Promise<Settlement> {
  const intent = await db.paymentIntent.findUnique({ where: { reference } });
  if (!intent) return "unknown";
  if (intent.status === "SUCCESS") return "success";
  if (intent.status === "FAILED") return "failed";

  // Never trust the redirect or the webhook body alone: ask Paystack what actually happened.
  const charge = await verifyTransaction(reference);

  if (charge.status === "success") {
    if (charge.amount !== intent.amount * 100 || charge.currency !== "NGN") {
      console.error(
        `[paystack] amount/currency mismatch for ${reference}: expected ${intent.amount * 100} NGN kobo, got ${charge.amount} ${charge.currency}`
      );
      await db.paymentIntent.updateMany({ where: { id: intent.id, status: "PENDING" }, data: { status: "FAILED" } });
      return "failed";
    }
    const claimed = await db.$transaction(async (tx) => {
      const claimed = await tx.paymentIntent.updateMany({
        where: { id: intent.id, status: "PENDING" },
        data: { status: "SUCCESS", settledAt: new Date() },
      });
      if (claimed.count === 1) {
        await tx.payment.create({
          data: {
            studentId: intent.studentId,
            feeItemId: intent.feeItemId,
            amount: intent.amount,
            reference: intent.reference,
            method: "PAYSTACK",
          },
        });
      }
      return claimed.count === 1;
    }, { isolationLevel: "Serializable" });
    if (claimed) return "success";
    const latest = await db.paymentIntent.findUnique({ where: { id: intent.id }, select: { status: true } });
    return latest?.status === "SUCCESS" ? "success" : latest?.status === "FAILED" ? "failed" : "pending";
  }

  if (charge.status === "failed" || charge.status === "reversed" || charge.status === "abandoned") {
    await db.paymentIntent.updateMany({ where: { id: intent.id, status: "PENDING" }, data: { status: "FAILED" } });
    return "failed";
  }
  return "pending"; // abandoned / ongoing: the customer may still finish it
}
