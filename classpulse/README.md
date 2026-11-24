# Acumen Schools Portal

A school management platform for Nigerian schools: public website, secure login, and four role-based portals (admin, teacher, student, parent), with online fee payment through Paystack.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · JWT sessions (jose) · bcrypt · Zod · Paystack · Node.js 20.9+

## Features

- Public landing page with a responsive image gallery (placeholder tiles) and sign-in
- Role-based access, enforced in Proxy, API routes and pages
- **Students:** admin adds, edits, moves between classes, links to a parent, resets passwords, deletes
- **Attendance:** teachers mark a class per day (present / late / absent); parents and students view history
- **Results:** CA1 /20 + CA2 /20 + Exam /60, automatic totals, grades A–F, per-term report cards, downloadable as PDF
- **Fees:** termly fee items per class or school-wide, part-payments, outstanding balances in naira, payment history
- **Online payment (Paystack):** parents and students pay any amount up to the balance by card, bank transfer or USSD
- **Offline payment confirmation:** families submit a bank-transfer/cash claim, an admin confirms or rejects it, and a printable receipt is generated for confirmed payments
- **Setup (admin):** create, edit and delete classes, subjects, terms, fee items, teachers and parent accounts; switch the current term
- **Teacher assignments:** admins grant each teacher specific classes (attendance) and class+subject pairs (scores); teachers see only their assignments
- **Self-service password reset:** "Forgot password?" emails a single-use, 30-minute reset link (Resend); local development shows the link on screen when no email key is set
- **Announcements:** post to everyone or to one role

## Setup

```bash
npm ci
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET (and Paystack/Redis/email keys as needed)
npm run db:push             # local development: create / update tables
npm run db:seed             # demo data
npm run dev                 # http://localhost:3000
```

The checked-in initial migration is for new deployments. Use `npm run db:deploy` to apply
reviewed migrations in production. For a database that was previously managed with
`db:push`, verify its schema matches the migration before baselining it with
`npx prisma migrate resolve --applied 20261105160000_init`; never use `--force-reset`
against production data.

Quick local Postgres: `docker run --name classpulse-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=classpulse -p 5432:5432 -d postgres:16`

## Demo logins (password `Password123!`)

These are local development accounts only. The seed command refuses to run in production,
and you must never copy seeded demo accounts into a live database.

| Role    | Email                   |
| ------- | ----------------------- |
| Admin   | admin@classpulse.dev    |
| Teacher | teacher@classpulse.dev  |
| Parent  | parent@classpulse.dev   |
| Student | student@classpulse.dev  |

The parent account is linked to the student account, so both show the same child's results, attendance and fees.

## Turning on Paystack

1. Create a Paystack account and copy your **test secret key** (Dashboard → Settings → API Keys & Webhooks).
2. In `.env` set `PAYSTACK_SECRET_KEY="sk_test_..."` and `APP_URL` to the public address of the site (`http://localhost:3000` locally).
3. In the same Paystack settings page, set the **Webhook URL** to `https://<your-domain>/api/paystack/webhook`. Locally, expose port 3000 with a tunnel such as ngrok or Cloudflare Tunnel and use that address for both `APP_URL` and the webhook.
4. Sign in as the parent, open **Fees**, and press **Pay online**. Use Paystack's [test cards](https://paystack.com/docs/payments/test-payments/).
5. For real money, swap in the `sk_live_...` key after Paystack activates your business.

With no key set, the Pay online button is hidden and the page tells parents to pay at the bursar's office. Admins can still record cash and bank-transfer payments.

## Landing-page gallery

The gallery above the Features section shows six labelled placeholders. To use real photos, drop files into `public/gallery/` and set `src` on the matching item in `src/components/gallery.tsx`, for example `src: "/gallery/campus.jpg"`. Tiles without a `src` keep showing their placeholder. The grid adapts from two columns on phones to three on tablets and desktops.

## Report card PDF

On **Results**, students and parents see a **Download PDF** button on each report card. It calls `/api/results/report/[studentId]` (optionally `?termId=...`) which generates a real PDF with PDFKit: school logo and header, student/class/admission details, the subject table with CA1/CA2/exam/total/grade, the average and remark, and signature lines. The response is sent as an attachment, so the browser downloads it. Access is enforced server-side — a family can only download their own child's report card.

## How families pay, and how receipts work

**Online (when a Paystack key is configured):** on **Fees**, the parent/student enters an amount up to the outstanding balance and presses **Pay online**. The server creates a `PaymentIntent`, redirects to Paystack's hosted checkout, and only records a `Payment` after verifying the charge with Paystack. Both the browser callback and the webhook settle the same intent exactly once.

**Offline (always available):** if a family paid at the bank or the bursar's office, they use **Submit for confirmation** on the Fees page with the amount, method, bank/teller reference and an optional note. The claim appears in the admin's **Payment confirmations** table. An admin presses **Confirm** (which creates the official `Payment` record and reserves the balance) or **Reject**. Pending claims and pending Paystack checkouts both reduce the available balance, so the same money can't be claimed twice.

**Receipts:** confirmed payments have a **Receipt** link in the admin's recent-payments table and in the family's payment history. The receipt page shows the school logo, receipt number (the payment reference), date, student, class, fee item, term, amount and method, with a **Print / save as PDF** button. Only admins and the student/parent involved can open a receipt.

## Teacher assignments

Teachers start with no access to classes. In **Setup → Teacher assignments**, an admin grants:

- a **class** — the teacher can view/mark attendance for it, and
- a **class + subject** pair — the teacher can enter scores for it (this also grants the class for attendance).

The navigation, attendance picker and score-entry picker show only what the teacher is assigned to, and the API re-checks assignments on every request (including that submitted student IDs belong to the selected class). Admins are unrestricted. The seeded demo teacher is assigned to all classes and subjects.

## Password reset

The sign-in page has a **Forgot your password?** link. It always responds generically so accounts can't be enumerated. A reset stores only a SHA-256 hash of a random token, expires after 30 minutes, is single-use, and is claimed atomically.

To send real email, set `RESEND_API_KEY` and `EMAIL_FROM`, and verify your sending domain in Resend. Without a key, non-production environments print the link to the server console and show it on the confirmation screen so the flow can be tested locally. Admins can still issue a new one-time password from the Students/Setup tables.

### How a payment is kept safe

- The amount is decided on the server from the fee balance, never trusted from the browser, and cannot exceed the remaining amount after payments and pending checkouts.
- Only the student, or their linked parent, can start a payment for that student.
- A checkout is stored as a pending `PaymentIntent`. It becomes a `Payment` only after the server asks Paystack's API what really happened and checks the amount (in kobo) and currency match.
- The browser redirect and the webhook both lead to the same settlement function. It claims the intent atomically, so a payment is recorded once even if both arrive at the same moment or Paystack retries.
- The webhook rejects any request whose `x-paystack-signature` (HMAC-SHA512 of the raw body) doesn't verify, using a constant-time comparison.
- The secret key lives only on the server.

## Security measures

- Random one-time passwords for new students, teachers and parents. Users must choose their own (10+ characters, with a letter and a number, at most 72 UTF-8 bytes) at first sign-in, and the API refuses everything else until they do.
- Admins can issue a new one-time password for a forgotten login.
- Login is rate limited per account and per IP, and unknown emails take the same time as wrong passwords.
- API routes re-check the database on every call, so a deleted user or changed role loses access immediately, not when the cookie expires.
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Browser-sent writes must come from the site's own origin.
- Session signing and verification reject a missing or weak `AUTH_SECRET` in production.
- Security headers: `nosniff`, frame denial, referrer policy, permissions policy, HSTS.
- Deletes are guarded: a student with payments or an active checkout, a class with students, a subject or term with results, or a fee item with payments or an active checkout cannot be deleted, so financial and academic history is never lost by accident.

## Project layout

```
prisma/schema.prisma           database models
prisma/seed.ts                 demo data
src/proxy.ts                   route protection, origin check, nonce-based CSP
src/lib/token.ts               session tokens (edge-safe)
src/lib/auth.ts                session, guard(), currentUser()
src/lib/password.ts            hashing, temp passwords, password policy
src/lib/rate-limit.ts          login / payment throttling (memory or Upstash Redis)
src/lib/paystack.ts            Paystack client + settlement
src/lib/reset-token.ts         reset-token hashing + lifetime
src/lib/mail.ts                Resend email delivery (dev link fallback)
src/app/api/                   auth, students, attendance, scores, payments, announcements, setup, manage, paystack
src/app/dashboard/             role-aware portal pages
src/components/row-actions.tsx edit / delete / reset-password control
```

## Before going live

- Use a production PostgreSQL database and set `DATABASE_URL`, a random `AUTH_SECRET`
  (`openssl rand -base64 32`, at least 32 bytes), and `APP_URL` to the canonical public
  HTTPS origin (for example `https://school.example.com`, with no path or trailing slash).
  Production session signing and verification reject a missing/weak secret; payment redirects reject an
  unset or invalid production URL.
- Run `npm run build` before deployment and `npm run start` to serve the production build.
  Apply schema changes with a reviewed database migration and take a backup before changing
  production data. `db:push` is intended for initial setup and local development, not as a
  substitute for a production migration process.
- For a new production database, the deployment sequence is `npm ci`, `npm run db:deploy`,
  `npm run build`, then `npm run start` (or your hosting provider's equivalent start command).
- Do not run `npm run db:seed` against a live database. It creates predictable demo logins
  and sample school data; the seed command also refuses to run when `NODE_ENV=production`.
- Configure Paystack with live keys only after testing the webhook, callback, and settlement
  flow using test keys. Keep `PAYSTACK_SECRET_KEY` server-side and set the webhook URL to
  `https://<your-domain>/api/paystack/webhook`.
- The login rate limiter uses in-memory counters by default (single server). For serverless or several instances, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to switch to Redis; if Redis is unreachable it falls back to memory. Set `TRUST_PROXY=1` only behind a reverse proxy you control, so forwarding headers can be used for per-IP limiting without trusting client-supplied values.
- Configure `RESEND_API_KEY` and `EMAIL_FROM` (and verify the sending domain) before relying on self-service password reset. Without a key, no reset email is sent in production.
- A per-request nonce-based Content-Security-Policy is enabled in Proxy. Pages are rendered
  dynamically so each response can receive a fresh nonce. Review its source and destination
  allowlists if you add external scripts, fonts, images, or APIs.
- Passwords are reset by an admin handing over a one-time password. Add email delivery (for example through Resend) if you want self-service "forgot password".
- Take regular database backups, because payment records live there.
