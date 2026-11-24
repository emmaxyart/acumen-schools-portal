import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";

/** Public, indexable pages. Auth-protected dashboard routes are excluded. */
const PAGES = ["/", "/login", "/forgot-password", "/reset-password"];

function lastModified(page: string): Date | undefined {
  const file = path.join(process.cwd(), page === "/" ? "src/app/page.tsx" : `src/app${page}.tsx`);
  try {
    return fs.statSync(file).mtime;
  } catch {
    return undefined;
  }
}

export default async function sitemap() {
  const host = (await headers()).get("host") ?? "localhost";
  return PAGES.map((page) => ({
    url: `https://${host}${page}`,
    lastModified: lastModified(page),
  }));
}
