-- Suporte a "Entrar com Google": senha vira opcional, ganha coluna de vínculo
-- com a conta Google.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
