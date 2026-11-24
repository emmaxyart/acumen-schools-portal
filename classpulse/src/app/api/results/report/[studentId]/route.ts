import { readFile } from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { currentTerm } from "@/lib/scope";
import { gradeFor } from "@/lib/grading";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ studentId: string }> };

/** Generates a real, downloadable PDF report card for one student and term. */
export async function GET(req: Request, { params }: Ctx) {
  const s = await requireSession();
  if (s.role === "TEACHER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { studentId } = await params;

  // Families may only download their own child's report card.
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      ...(s.role === "STUDENT" ? { userId: s.uid } : s.role === "PARENT" ? { parent: { userId: s.uid } } : {}),
    },
    include: { user: { select: { name: true } }, class: true },
  });
  if (!student) return Response.json({ error: "Report card not found" }, { status: 404 });

  const requestedTerm = new URL(req.url).searchParams.get("termId");
  const term = requestedTerm
    ? await db.term.findUnique({ where: { id: requestedTerm } })
    : await currentTerm();
  if (!term) return Response.json({ error: "No term has been set up yet" }, { status: 404 });

  const scores = await db.score.findMany({
    where: { studentId, termId: term.id },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  // --- Build the PDF in memory, then return it as a download. ---
  const doc = new PDFDocument({ size: "A4", margin: 44, info: { Title: `Report Card - ${student.user.name}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const ink = "#0f172a";
  const brand = "#146641";
  const muted = "#64748b";
  const line = "#e2e8f0";
  const pageWidth = doc.page.width - 88;

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
    doc.image(logo, 44, 40, { width: 54 });
  } catch {
    // Logo is optional; the text header still identifies the school.
  }

  doc.fillColor(brand).font("Helvetica-Bold").fontSize(17).text("ACUMEN SCHOOLS PORTAL", 108, 46);
  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Raising future Acumen leaders", 108, 68);

  doc.moveTo(44, 104).lineTo(44 + pageWidth, 104).strokeColor(brand).lineWidth(1.5).stroke();

  doc.fillColor(ink).font("Helvetica-Bold").fontSize(16).text("STUDENT REPORT CARD", 44, 120, { align: "center" });
  doc.fillColor(muted).font("Helvetica").fontSize(10)
    .text(`${term.name}  |  ${term.session}`, 44, 144, { align: "center" });

  // Student details in two columns.
  const detailY = 172;
  const detail = (label: string, value: string, x: number, y: number) => {
    doc.fillColor(muted).font("Helvetica").fontSize(8).text(label.toUpperCase(), x, y);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(10).text(value, x, y + 12);
  };
  detail("Student", student.user.name, 44, detailY);
  detail("Admission number", student.admissionNo, 300, detailY);
  detail("Class", `${student.class.name} ${student.class.arm}`, 44, detailY + 32);
  detail("Number of subjects", String(scores.length), 300, detailY + 32);

  // Results table.
  let y = detailY + 76;
  const cols = [
    { label: "Subject", x: 44, width: 200 },
    { label: "CA1 /20", x: 252, width: 58 },
    { label: "CA2 /20", x: 312, width: 58 },
    { label: "Exam /60", x: 372, width: 62 },
    { label: "Total", x: 438, width: 48 },
    { label: "Grade", x: 490, width: 55 },
  ];

  const drawRow = (values: string[], bold = false, background?: string) => {
    const height = 26;
    if (background) doc.rect(44, y - 4, pageWidth, height).fill(background);
    doc.fillColor(ink).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    values.forEach((value, i) => doc.text(value, cols[i].x, y, { width: cols[i].width, height: 14, ellipsis: true }));
    y += height;
    doc.moveTo(44, y - 5).lineTo(44 + pageWidth, y - 5).strokeColor(line).lineWidth(0.5).stroke();
  };

  drawRow(cols.map((c) => c.label), true, "#f1f5f9");

  let totalSum = 0;
  for (const score of scores) {
    const total = score.ca1 + score.ca2 + score.exam;
    totalSum += total;
    drawRow([
      score.subject.name,
      String(score.ca1),
      String(score.ca2),
      String(score.exam),
      String(total),
      gradeFor(total).grade,
    ]);
  }

  if (!scores.length) {
    doc.fillColor(muted).font("Helvetica").fontSize(10).text("No results have been published for this term.", 44, y + 10);
    y += 30;
  }

  const average = scores.length ? totalSum / scores.length : 0;
  y += 8;
  doc.roundedRect(44, y, pageWidth, 42, 6).fill("#eefbf4");
  doc.fillColor(brand).font("Helvetica-Bold").fontSize(11).text(`Average: ${average.toFixed(1)}%`, 58, y + 15);
  doc.fontSize(10).text(`Remark: ${average >= 40 ? gradeFor(average).remark : "Fail"}`, 280, y + 15);
  y += 68;

  doc.fillColor(ink).font("Helvetica").fontSize(9)
    .text("This report card is issued by Acumen Schools Portal for the term stated above.", 44, y, { width: pageWidth });
  y += 44;

  doc.moveTo(44, y).lineTo(230, y).strokeColor(muted).lineWidth(0.5).stroke();
  doc.moveTo(330, y).lineTo(516, y).strokeColor(muted).lineWidth(0.5).stroke();
  doc.fillColor(muted).fontSize(8)
    .text("Class teacher's signature", 44, y + 6)
    .text("Parent / Guardian's signature", 330, y + 6);

  doc.fillColor(muted).fontSize(8).text(`Generated ${new Date().toLocaleDateString("en-NG")}`, 44, 790, { align: "center" });
  doc.end();

  const pdf = await finished;
  const safeName = `${student.admissionNo}-${term.name}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-card-${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
