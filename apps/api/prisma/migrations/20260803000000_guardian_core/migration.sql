-- Tabelas do Guardian. A primeira entrega do Guardian introduziu os modelos
-- no schema sem uma migration correspondente; este arquivo permite que bancos
-- de produção já existentes recebam o pilar de forma determinística.
CREATE TYPE "GuardianStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "GuardianOverallStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

CREATE TABLE "GuardianRuleset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rules" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuardianRuleset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuardianRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "rulesetId" TEXT,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceName" TEXT,
  "documentRaw" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "GuardianStatus" NOT NULL DEFAULT 'PENDING',
  "overallStatus" "GuardianOverallStatus",
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuardianRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuardianRuleset_organizationId_idx" ON "GuardianRuleset"("organizationId");
CREATE INDEX "GuardianRun_organizationId_idx" ON "GuardianRun"("organizationId");
CREATE INDEX "GuardianRun_projectId_idx" ON "GuardianRun"("projectId");
CREATE INDEX "GuardianRun_rulesetId_idx" ON "GuardianRun"("rulesetId");

ALTER TABLE "GuardianRuleset"
  ADD CONSTRAINT "GuardianRuleset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuardianRun"
  ADD CONSTRAINT "GuardianRun_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuardianRun"
  ADD CONSTRAINT "GuardianRun_rulesetId_fkey"
  FOREIGN KEY ("rulesetId") REFERENCES "GuardianRuleset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
