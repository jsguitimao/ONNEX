-- AlterTable
ALTER TABLE "Business" ADD COLUMN "autoAcceptBookings" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "customerConfirmedAt" TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'BOOKING_CONFIRMATION_REQUEST';
ALTER TYPE "NotificationKind" ADD VALUE 'BOOKING_ADVANCEMENT';
