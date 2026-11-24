import { clearedCookie } from "@/lib/token";

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedCookie());
  return res;
}
