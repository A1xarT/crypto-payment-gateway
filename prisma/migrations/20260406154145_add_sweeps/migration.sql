-- CreateEnum
CREATE TYPE "SweepStatus" AS ENUM ('PENDING', 'BROADCAST', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payout_address" TEXT;

-- CreateTable
CREATE TABLE "sweeps" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "tx_hash" TEXT,
    "amount_wei" TEXT NOT NULL,
    "gas_cost_wei" TEXT NOT NULL,
    "status" "SweepStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sweeps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sweeps_payment_id_key" ON "sweeps"("payment_id");

-- AddForeignKey
ALTER TABLE "sweeps" ADD CONSTRAINT "sweeps_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
