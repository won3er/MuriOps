-- AlterEnum
ALTER TYPE "RemediationSourceType" ADD VALUE 'PROJECT';

-- AlterTable
ALTER TABLE "RemediationPlan" ADD COLUMN "scope" TEXT;
ALTER TABLE "RemediationPlan" ADD COLUMN "apiToken" TEXT;

-- Backfill: planos existentes ganham um token aleatório.
UPDATE "RemediationPlan"
SET "apiToken" = md5(random()::text || clock_timestamp()::text || id)
WHERE "apiToken" IS NULL;

ALTER TABLE "RemediationPlan" ALTER COLUMN "apiToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RemediationPlan_apiToken_key" ON "RemediationPlan"("apiToken");
