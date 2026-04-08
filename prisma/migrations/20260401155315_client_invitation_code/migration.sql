/*
  Warnings:

  - A unique constraint covering the columns `[invitationCode]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "invitationCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_invitationCode_key" ON "Client"("invitationCode");
