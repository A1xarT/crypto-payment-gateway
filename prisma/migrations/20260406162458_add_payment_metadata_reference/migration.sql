-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE INDEX "payments_user_id_reference_idx" ON "payments"("user_id", "reference");
