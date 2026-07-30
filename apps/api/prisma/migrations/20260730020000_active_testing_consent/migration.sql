-- Valor novo do enum de categoria de análise, usado pelo Teste Ativo Autorizado.
ALTER TYPE "AnalysisCategory" ADD VALUE 'ACTIVE_SECURITY_TEST';

ALTER TABLE "Project"
ADD COLUMN "activeTestingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "activeTestingConsentAt" TIMESTAMP(3),
ADD COLUMN "activeTestingConsentByUserId" TEXT;
