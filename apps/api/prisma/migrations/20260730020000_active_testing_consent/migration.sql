ALTER TABLE "Project"
ADD COLUMN "activeTestingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "activeTestingConsentAt" TIMESTAMP(3),
ADD COLUMN "activeTestingConsentByUserId" TEXT;
