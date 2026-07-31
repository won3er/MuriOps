-- Conexão somente-leitura do Google Drive por organização para o Guardian.
-- Tokens são criptografados na aplicação antes de serem persistidos.
ALTER TABLE "Organization"
  ADD COLUMN "googleDriveRefreshTokenEncrypted" TEXT,
  ADD COLUMN "googleDriveAccessTokenEncrypted" TEXT,
  ADD COLUMN "googleDriveTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "googleDriveConnectedEmail" TEXT;
