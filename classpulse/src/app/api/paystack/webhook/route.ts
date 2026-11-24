import { createHmac, timingSafeEqual } from "crypto";
import { settleIntent } from "@/lib/paystack";

// Paystack calls this from its servers. Set the URL in Dashboard > Settings > API Keys & Webhooks:
//   https://<your-domain>/api/paystack/webhook
export async function POST(req: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return Response.json({ error: "Not configured" }, { status: 503 });

  // The signature is computed over the exact raw bytes, so read the body as text before parsing.
  const raw = await req.text();
  const given = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", key).update(raw).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400 });
  }

  if (
    (event.event === "charge.success" || event.event === "charge.failed") &&
    typeof event.data?.reference === "string"
  ) {
    try {
      // Re-verifies with Paystack and is idempotent, so retries and duplicates are harmless.
      await settleIntent(event.data.reference);
    } catch (e) {
      console.error("[paystack] webhook settle failed", e);
      return Response.json({ error: "Try again" }, { status: 500 }); // non-2xx makes Paystack retry
    }
  }
  return Response.json({ ok: true }); // 200 for everything else so Paystack stops retrying
}
