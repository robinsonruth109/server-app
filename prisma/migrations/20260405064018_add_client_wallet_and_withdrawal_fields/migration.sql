-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ADD COLUMN     "walletHolderName" TEXT,
ADD COLUMN     "walletName" TEXT,
ADD COLUMN     "walletProtocol" TEXT,
ADD COLUMN     "withdrawalPassword" TEXT;
