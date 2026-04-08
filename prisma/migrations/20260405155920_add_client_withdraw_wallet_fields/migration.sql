/*
  Warnings:

  - You are about to drop the column `walletAddress` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `walletHolderName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `walletName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `walletProtocol` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "walletAddress",
DROP COLUMN "walletHolderName",
DROP COLUMN "walletName",
DROP COLUMN "walletProtocol",
ADD COLUMN     "withdrawWalletAddress" TEXT,
ADD COLUMN     "withdrawWalletName" TEXT,
ADD COLUMN     "withdrawWalletNetwork" TEXT;
