# ClassPulse (Acumen Schools Portal) — Code Audit Report

**Scope:** `classpulse/` — Next.js App Router app (`src/`), Prisma schema (`prisma/`), migrations.
**Method:** full read of all source files in `src/`, key libs, API routes, dashboard pages, seed; `npm run typecheck` run (passed, no TS errors). Not executed against a live DB/browser.
**Evidence level:** line numbers refer to files as read; claims are based on source reading, not runtime tests.

---

## 1. App overview

**Stack:** Next.js 16 App Router · TypeScript (strict) · PostgreSQL via Prisma 5 · JWT sessions (`jose`, HS256, 7‑day expiry) · bcrypt (cost 12) · Zod 4 (server-side validation) · Paystack REST · Resend email · Tailwind 3 · `pdfkit` for report cards · Role enum `ADMIN | TEACHER | STUDENT | PARENT`.

**Roles & scoping** (`src/lib/scope.ts`, `src/lib/auth.ts`):
- Session JWT verified against DB on every request (`guard`, `requireSession`) — good: role changes and deletions take effect immediately (`src/lib/auth.ts:21-36`).
- Teachers are scope-restricted to assignments (`TeacherClass`/`TeacherSubject`, schema lines 74-97); admins unrestricted.

**Key flows:**
- **Auth:** login (`src/app/api/auth/login/route.ts`), forgot/reset/change password, session cookie `cp_session` (HttpOnly, SameSite=Lax, Secure in prod — `src/lib/token.ts:39-42`), CSRF origin check in `src/proxy.ts:36-49`, CSP nonces in `src/proxy.ts:11-28`.
- **Dashboard:** `src/app/dashboard/**` — overview stats, students, setup (classes/subjects/terms/fees/teachers/parents/assignments), results (score entry + PDF cards), fees (history, receipts), attendance, announcements.
- **Fees/payments:** admin cash payments (`/api/payments`), parent/student claims (`/api/payment-submissions`), Paystack online checkout (`/api/paystack/initialize` + verified settle via `/api/paystack/webhook` HMAC and `/api/paystack/callback`).
- **Results:** teacher score entry (`/api/scores`), per-role views, downloadable PDF (`/api/results/report/[studentId]`).

Good signs already present: password reset tokens are hashed (`src/lib/reset-token.ts`), Webhook HMAC verified with `timingSafeEqual` (`src/app/api/paystack/webhook/route.ts:14-18`), serializable transactions on money paths, current-term uniqueness enforced at DB level (`prisma/migrations/20261117000000_hardening_assignments_reset/migration.sql:2`), deletion of payments restricted with explanations (`src/app/api/manage/[entity]/[id]/route.ts`).

---

## 2. Findings (prioritized)

### 2.1 Correctness — money path: double-counted claim makes the balance check a no-op

`src/app/api/payment-submissions/[id]/route.ts:43-51`:
```ts
const balance = await outstandingFor(tx, current.studentId, current.feeItemId);
// This claim is still counted as pending, so add its own amount back before checking.
const availableBeforeClaim = balance.outstanding + current.amount;
if (current.amount > availableBeforeClaim) ...
```
But `outstandingFor` (`src/lib/balance.ts:9-28`) already subtracts `status: "PENDING"` submissions (line 20-22). So `availableBeforeClaim = outstanding + current.amount` counts the claim twice; the guard is effectively `amount > outstanding` which is nearly always false. The intended invariant should be `amount <= outstanding` (the claim itself is part of `outstanding`).

Why it matters: combined with the inconsistency in `src/app/api/payments/route.ts:28-37` (admin cash path counts only payments + PENDING intents, **not** PENDING claims), an admin can record a cash payment of the full amount, then confirm a claim on top → total received exceeds the fee. Money-affecting bug. Fix: remove the `+ current.amount` line or subtract it; also count claims in the cash path for consistency.

### 2.2 Scalability — N+1 on the admin Fees page

`src/app/dashboard/fees/page.tsx:101-106` (admin) and `:167` (families): `balances()` is awaited per student in `Promise.all(students.map(...))`. Each `balances()` call (`page.tsx:51-68`) runs 1 `feeItem.findMany` + 3 aggregates (`payments`, `intents`, `submissions`) → ~4 queries × number of students per page load. Fix: a single grouped query (`feeItem.findMany` with aggregates over `Payment`/`PaymentIntent`/`PaymentSubmission`), or Prisma `_count`/`groupBy` per fee item.

### 2.3 Scalability — unbounded `findMany` on admin/list endpoints

`findMany` without `take`/pagination (verified by grep, `src/app/api/students/route.ts:10`, `src/app/dashboard/students/page.tsx:13`, `src/app/dashboard/attendance/page.tsx:27` (take:30, ok), `src/app/dashboard/results/page.tsx:50-58` (per-kid, ok but see 2.2), `src/app/dashboard/setup/page.tsx` — fine for setups). School-scale data will eventually grow large; adding `take` + cursor/offset paging is the fix direction.

### 2.4 Scalability — per-request PDF generation

`src/app/api/results/report/[studentId]/route.ts:42-154` builds a full PDF (pdfkit) per GET request with no caching (`Cache-Control: no-store`, line 151). Fine for occasional use; adds DB + CPU per request. Fix: cache per term or use `cache`/`revalidate`, or generate once when the term closes.

### 2.5 Security — per-IP rate limit when not behind a proxy returns "unknown"

`src/lib/rate-limit.ts:89-97`: without `TRUST_PROXY=1`, `clientIp()` returns the constant `"unknown"` for everyone — the per-IP limit (e.g., login `src/app/api/auth/login/route.ts:19-23`) then applies to **all** clients collectively rather than per IP. It fails open to "not per-IP" rather than spoofable. Fix: default to `req.headers.get("x-forwarded-for")`-less behavior is fine for most deployments; document `TRUST_PROXY`, or derive from socket. Minor.

### 2.6 Correctness — attendance default "PRESENT" hides missing data

`src/app/api/attendance/route.ts:28`: `status: st.attendance[0]?.status ?? "PRESENT"` — when no record exists it reports Present. Fix: report `null`/omit or a dedicated "UNRECORDED" handling.

### 2.7 Security — missing rate limit on logout and no auditing of admin destructive actions

`src/app/api/auth/logout/route.ts` has no rate limiting (low risk, but cheap to add). The manage/delete and admin payment confirmation paths have no audit log — financial history protection is via FK restricts (good) but there's no change history. Worth a small `createdAt`/audit table for "who recorded/confirmed payment" (the confirm path stores `reviewedById` — good).

### 2.8 Hardening / future-proofing — zero-password-strength knobs, business rules hardcoded

- Grade thresholds hardcoded in `src/lib/grading.ts:1-8` (70/60/50/45/40); the 20/20/60 caps are duplicated in `src/app/dashboard/results/score-entry.tsx:7` and zod schemas (`src/app/api/scores/route.ts:42-45`). Works, but not configurable per school.
- `src/app/api/setup/route.ts:13` validates session format `^\d{4}\/\d{4}$` but doesn't validate it matches the current school year — cosmetic.
- `src/app/dashboard/students/add-student-form.tsx:23` — temp password echoed to the page after add; acceptable for admin, but `src/app/api/students/route.ts:73` also returns `tempPassword` — fine.
- Seed accounts are fixed passwords (`prisma/seed.ts:5`) — documented as dev-only in README (lines 40-50).

### 2.9 Testing — no tests

No unit/integration/E2E tests exist for app code (only `npm run typecheck`, which passes). Priority gaps: auth flows (login/rate-limit, reset link use-once), money paths (payment-submissions confirm, serializable conflicts), and RBAC checks. Suggest vitest + Playwright; note package.json has `tsx` (used by seed) but no test runner.

### 2.10 Docs — README is strong but incomplete

README (12KB) covers features, setup, demo logins, Paystack wiring — good. Missing: architecture/data-model overview, deployment notes for non-Vercel (the app uses `runtime = "nodejs"` only on the PDF route, line 9 — default runtime otherwise), and a short "known issues"/roadmap section. Minor.

### 2.11 Minor correctness / robustness notes

- `src/app/dashboard/attendance/marker.tsx` — save now disables repeat submissions, reports success/failure, and restores the button after network errors.
- `src/app/dashboard/setup/teacher-assignments.tsx` — both subject and class assignment removals now require confirmation; request failures are shown and the busy state is always cleared.
- `src/app/api/paystack/initialize/route.ts` — failed-initialization cleanup uses a conditional `updateMany`, avoiding `P2025` and preserving already-settled intents; cleanup failures are logged.
- `src/app/api/manage/[entity]/[id]/route.ts` and `prisma/schema.prisma` — parent deletion preserves students and clears their parent link. `onDelete: SetNull` is now explicit, and the initial migration also specifies `ON DELETE SET NULL`; the live production database was not available to inspect.
- `src/lib/token.ts` — the development fallback remains, but a missing `AUTH_SECRET` now emits a one-time development warning; production still throws.
- `Student.gender` — constrained to `M`/`F` with a Prisma enum; a migration converts the existing text column. Current API and seed write paths use only those values.

---

## 3. Already done well (brief)

- RBAC enforced at API routes, page guards, and nav (`src/proxy.ts`, `src/lib/auth.ts`, `src/app/dashboard/layout.tsx`).
- Secure password reset flow: hashed tokens, TTL 30 min, single-use atomic claim (`src/app/api/auth/reset-password/route.ts:30-39`), response generic when email unknown (`src/app/api/auth/forgot-password/route.ts:16-19`).
- Webhook HMAC + `timingSafeEqual`, idempotent settle with serializable claim (`src/lib/paystack.ts:82-116`).
- Money paths use serializable transactions + `P2034` handling (`src/app/api/payments/route.ts:49-56`, `src/app/api/payment-submissions/[id]/route.ts:72-79`).
- Rate limiting on auth endpoints (login, forgot, reset, change-password, paystack initialize); production cookie flags; security headers in `next.config.mjs`; nonce-based CSP.
- Indexes on hot paths (`PaymentSubmission_status_createdAt_idx`, assignment indexes, schema lines 232, 81, 96) — good for growth.
- Deletion guards prevent destroying payment/results history (`src/app/api/manage/[entity]/[id]/route.ts`).

---

## 4. Summary by priority

| # | Priority | Finding |
|---|----------|---------|
| 2.1 | P0 (money correctness) | Double-count in admin confirm can over-pay the fee; check is a no-op |
| 2.2 | P1 (scalability) | N+1 on fees pages (per-student × ~4 queries) |
| 2.3 | P1 (scalability) | Unbounded admin `findMany`s |
| 2.4 | P2 (scalability) | PDF report card generated per request |
| 2.6 | P2 (correctness) | Attendance default shows "PRESENT" when nothing recorded |
| 2.5 | P3 (security) | IP rate limit keyed on "unknown" without proxy trust |
| 2.9 | P3 (testing) | Zero tests |
| 2.10 | P4 (docs) | README covers most; architecture/deployment notes missing |
| 2.7/2.8/2.11 | P4 (hardening) | Audit log, configurable grading constants, misc minor items |

Suggested next step: fix 2.1 first (money), then 2.2/2.3 (pagination/grouped fees), then add a test suite covering the money paths and auth rate limits.
