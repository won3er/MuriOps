-- CreateEnum
CREATE TYPE "UpgradeStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "UpgradePlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "packageJsonRaw" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "status" "UpgradeStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpgradePlan_apiToken_key" ON "UpgradePlan"("apiToken");

-- CreateIndex
CREATE INDEX "UpgradePlan_organizationId_idx" ON "UpgradePlan"("organizationId");

-- CreateIndex
CREATE INDEX "UpgradePlan_projectId_idx" ON "UpgradePlan"("projectId");

-- AddForeignKey
ALTER TABLE "UpgradePlan" ADD CONSTRAINT "UpgradePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
