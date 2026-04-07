-- CreateEnum
CREATE TYPE "Network" AS ENUM ('MAINNET', 'TESTNET');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "network" "Network" NOT NULL DEFAULT 'MAINNET';
