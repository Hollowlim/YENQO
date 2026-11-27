CREATE TABLE "CryptoInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amountMicro" INTEGER NOT NULL,
    "openAmount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "CryptoInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CryptoInvoice_openAmount_key" ON "CryptoInvoice"("openAmount");
CREATE UNIQUE INDEX "CryptoInvoice_txHash_key" ON "CryptoInvoice"("txHash");
CREATE INDEX "CryptoInvoice_userId_status_idx" ON "CryptoInvoice"("userId", "status");
ALTER TABLE "CryptoInvoice" ADD CONSTRAINT "CryptoInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
