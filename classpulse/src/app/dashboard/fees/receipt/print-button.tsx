"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="btn no-print">
      Print / save as PDF
    </button>
  );
}
