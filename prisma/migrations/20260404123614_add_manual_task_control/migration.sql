-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "isManualTaskControl" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClientTaskControl" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "taskNo" INTEGER NOT NULL,
    "taskAmount" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTaskControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientTaskControl_clientId_taskNo_key" ON "ClientTaskControl"("clientId", "taskNo");

-- AddForeignKey
ALTER TABLE "ClientTaskControl" ADD CONSTRAINT "ClientTaskControl_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
