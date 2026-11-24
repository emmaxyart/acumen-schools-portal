-- Preserve financial records and pending checkouts if an account is deleted concurrently.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_studentId_fkey";
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentIntent" DROP CONSTRAINT "PaymentIntent_studentId_fkey";
ALTER TABLE "PaymentIntent"
ADD CONSTRAINT "PaymentIntent_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
