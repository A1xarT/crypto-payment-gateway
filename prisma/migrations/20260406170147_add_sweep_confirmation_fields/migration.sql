-- AlterEnum
ALTER TYPE "SweepStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "sweeps" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "confirmed_at" TIMESTAMP(3);
