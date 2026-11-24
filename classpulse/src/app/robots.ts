import { headers } from "next/headers";

export default async function robots() {
  const host = (await headers()).get("host") ?? "localhost";
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    host: `https://${host}`,
    sitemap: `https://${host}/sitemap.xml`,
  };
}
