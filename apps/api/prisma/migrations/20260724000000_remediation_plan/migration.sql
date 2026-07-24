-- CreateEnum
CREATE TYPE "RemediationSourceType" AS ENUM ('ANALYSIS', 'BLUEPRINT');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "RemediationPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "sourceType" "RemediationSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "RemediationStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemediationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemediationPlan_organizationId_idx" ON "RemediationPlan"("organizationId");

-- CreateIndex
CREATE INDEX "RemediationPlan_projectId_idx" ON "RemediationPlan"("projectId");

-- CreateIndex
CREATE INDEX "RemediationPlan_sourceType_sourceId_idx" ON "RemediationPlan"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "RemediationPlan" ADD CONSTRAINT "RemediationPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
