export function gradeFor(total: number): { grade: string; remark: string } {
  if (total >= 70) return { grade: "A", remark: "Excellent" };
  if (total >= 60) return { grade: "B", remark: "Very Good" };
  if (total >= 50) return { grade: "C", remark: "Good" };
  if (total >= 45) return { grade: "D", remark: "Fair" };
  if (total >= 40) return { grade: "E", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
}

export const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/** Normalise a YYYY-MM-DD string to a UTC midnight Date. */
export function dayOf(input: string): Date {
  const [y, m, d] = input.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** True for a real calendar date in YYYY-MM-DD form (rejects 2026-13-45, 2026-02-31). */
export function isValidDay(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const d = dayOf(input);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === input;
}

export const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
