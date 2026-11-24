import { NextRequest, NextResponse } from "next/server";
import { readToken, COOKIE } from "@/lib/token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Called by Paystack's servers: no cookie, no Origin. It authenticates with an HMAC signature instead.
const WEBHOOK = "/api/paystack/webhook";
// The customer's browser lands here from Paystack. It only verifies with Paystack, then redirects
// to the (login-protected) fees page, so it needs no session of its own.
const PAYSTACK_CALLBACK = "/api/paystack/callback";

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' here is required by Framer Motion's generated style attributes.
    // Scripts stay locked behind the nonce above.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (process.env.NODE_ENV === "production") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  // CSRF defence in depth on top of SameSite=Lax: a browser-sent write must come from our own origin.
  if (isApi && !SAFE_METHODS.has(req.method) && pathname !== WEBHOOK) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let parsedOrigin: URL;
    try { parsedOrigin = new URL(origin ?? ""); } catch {
      return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
    if (
      parsedOrigin.host !== host?.toLowerCase() ||
      (process.env.NODE_ENV === "production" && parsedOrigin.protocol !== "https:")
    ) {
      return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
  }

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await readToken(token) : null;

  if ((pathname.startsWith("/dashboard") || pathname === "/change-password") && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // `expired` is set when the account behind a still-valid cookie no longer exists.
  if (pathname === "/login" && session && !req.nextUrl.searchParams.has("expired")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (isApi && !pathname.startsWith("/api/auth") && pathname !== WEBHOOK && pathname !== PAYSTACK_CALLBACK && !session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (isApi) return NextResponse.next();

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
