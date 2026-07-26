-- AlterTable
ALTER TABLE "AdapterConnection" ADD COLUMN     "bridgeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdapterConnection_bridgeToken_key" ON "AdapterConnection"("bridgeToken");

