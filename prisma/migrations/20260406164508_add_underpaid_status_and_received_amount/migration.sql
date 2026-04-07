-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UNDERPAID';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "received_amount" DECIMAL(30,0);
