-- Offline payment claims that an admin confirms before they count as received.
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE "SubmissionMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'OTHER');

CREATE TABLE "PaymentSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "SubmissionMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSubmission_paymentId_key" ON "PaymentSubmission"("paymentId");
CREATE INDEX "PaymentSubmission_status_createdAt_idx" ON "PaymentSubmission"("status", "createdAt");

ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
