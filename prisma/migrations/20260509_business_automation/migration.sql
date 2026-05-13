-- CreateTable
CREATE TABLE "BusinessAutomation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAutomation_businessId_key" ON "BusinessAutomation"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessAutomation" ADD CONSTRAINT "BusinessAutomation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
