-- "Atualizar" (UpgradePlan) agora pode ser enviado pra Aplicação como mais um
-- sourceType de RemediationPlan, unificando o executor final.
ALTER TYPE "RemediationSourceType" ADD VALUE IF NOT EXISTS 'UPGRADE';
