-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StaffMember_businessId_deletedAt_idx" ON "StaffMember"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "Service_businessId_deletedAt_idx" ON "Service"("businessId", "deletedAt");
