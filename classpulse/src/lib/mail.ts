// Minimal email delivery through Resend's REST API (no SDK dependency).
// With no RESEND_API_KEY configured, development logs the reset link and returns it
// to the caller so the flow can be tested locally. Production requires a real key.

export type MailResult = { sent: boolean; devLink?: string };

export async function sendPasswordResetEmail(to: string, link: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] RESEND_API_KEY is not set; password reset email was not sent");
      return { sent: false };
    }
    console.log(`[password-reset] Dev link for ${to}: ${link}`);
    return { sent: false, devLink: link };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Acumen Schools Portal <onboarding@resend.dev>",
        to: [to],
        subject: "Reset your Acumen Schools Portal password",
        html: `<p>Hello,</p><p>Use the link below to choose a new Acumen Schools Portal password. It expires in 30 minutes and can be used once.</p><p><a href="${link}">Reset my password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
    return { sent: true };
  } catch (e) {
    console.error("[mail] could not send password reset email", e);
    return { sent: false };
  }
}
