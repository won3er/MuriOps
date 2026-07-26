-- CreateEnum
CREATE TYPE "AutonomyLevel" AS ENUM ('MANUAL', 'SUPERVISED', 'AUTONOMOUS');

-- CreateEnum
CREATE TYPE "OrchestrationRunStatus" AS ENUM ('QUEUED', 'ANALYZING', 'EVALUATING_GATES', 'PLANNING', 'AWAITING_APPLY', 'APPLYING', 'AWAITING_OBSERVATION', 'REANALYZING', 'PASSED', 'STOPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrchestrationEventType" AS ENUM ('RUN_STARTED', 'ANALYSIS_STARTED', 'ANALYSIS_COMPLETED', 'GATE_EVALUATED', 'PLAN_GENERATED', 'APPLY_REQUESTED', 'APPLY_APPROVED', 'APPLY_COMPLETED', 'OBSERVATION_RECEIVED', 'ITERATION_ADVANCED', 'RUN_PASSED', 'RUN_STOPPED', 'RUN_FAILED');

-- CreateEnum
CREATE TYPE "AdapterKind" AS ENUM ('MANUAL_BRIDGE', 'MCP', 'GITHUB');

-- CreateEnum
CREATE TYPE "AdapterCapability" AS ENUM ('ANALYZE', 'APPLY', 'OBSERVE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "autonomyLevel" "AutonomyLevel" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "OrchestrationRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "OrchestrationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "iteration" INTEGER NOT NULL DEFAULT 1,
    "maxIterations" INTEGER NOT NULL DEFAULT 3,
    "autonomyLevel" "AutonomyLevel" NOT NULL,
    "currentAnalysisId" TEXT,
    "currentPlanId" TEXT,
    "adapterConnectionId" TEXT,
    "gateResult" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" "OrchestrationEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectQualityGate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "AnalysisCategory",
    "minScore" INTEGER NOT NULL,
    "label" TEXT,
    "sourceBlueprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectQualityGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdapterConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "AdapterKind" NOT NULL,
    "capabilities" "AdapterCapability"[],
    "mode" TEXT NOT NULL,
    "config" JSONB,
    "credentialEncrypted" TEXT,
    "webhookSecretEncrypted" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdapterConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrchestrationRun_projectId_idx" ON "OrchestrationRun"("projectId");

-- CreateIndex
CREATE INDEX "OrchestrationRun_organizationId_idx" ON "OrchestrationRun"("organizationId");

-- CreateIndex
CREATE INDEX "OrchestrationEvent_runId_idx" ON "OrchestrationEvent"("runId");

-- CreateIndex
CREATE INDEX "ProjectQualityGate_projectId_idx" ON "ProjectQualityGate"("projectId");

-- CreateIndex
CREATE INDEX "AdapterConnection_projectId_idx" ON "AdapterConnection"("projectId");

-- CreateIndex
CREATE INDEX "AdapterConnection_organizationId_idx" ON "AdapterConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdapterConnection_projectId_kind_key" ON "AdapterConnection"("projectId", "kind");

-- AddForeignKey
ALTER TABLE "OrchestrationRun" ADD CONSTRAINT "OrchestrationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationEvent" ADD CONSTRAINT "OrchestrationEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OrchestrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectQualityGate" ADD CONSTRAINT "ProjectQualityGate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdapterConnection" ADD CONSTRAINT "AdapterConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
