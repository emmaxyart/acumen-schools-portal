import { Prisma, PrismaClient } from "@prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

/**
 * Outstanding naira for a student/fee item, counting confirmed payments,
 * pending Paystack checkouts and pending offline-payment claims.
 */
export async function outstandingFor(client: Client, studentId: string, feeItemId: string) {
  const fee = await client.feeItem.findUnique({ where: { id: feeItemId } });
  if (!fee) return null;

  const [paid, intents, submissions] = await Promise.all([
    client.payment.aggregate({ _sum: { amount: true }, where: { studentId, feeItemId } }),
    client.paymentIntent.aggregate({
      _sum: { amount: true },
      where: { studentId, feeItemId, status: "PENDING" },
    }),
    client.paymentSubmission.aggregate({
      _sum: { amount: true },
      where: { studentId, feeItemId, status: "PENDING" },
    }),
  ]);

  return {
    fee,
    outstanding: fee.amount - (paid._sum.amount ?? 0) - (intents._sum.amount ?? 0) - (submissions._sum.amount ?? 0),
  };
}
