/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `CompanyWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "network" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ADD COLUMN     "walletName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWallet_address_key" ON "CompanyWallet"("address");
