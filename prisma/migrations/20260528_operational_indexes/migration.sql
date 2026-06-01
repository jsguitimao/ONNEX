-- Operational indexes for tenant-scoped hot paths.
--
-- These support:
-- - customer duplicate checks by email/phone within one business,
-- - future active-booking checks by customer phone,
-- - CRM recurring-customer aggregation by business/customer,
-- - membership and service-assignment relation traversals.
CREATE INDEX "BusinessMembership_userId_idx" ON "BusinessMembership"("userId");

CREATE INDEX "StaffService_serviceId_idx" ON "StaffService"("serviceId");

CREATE INDEX "Customer_businessId_email_idx" ON "Customer"("businessId", "email");
CREATE INDEX "Customer_businessId_phone_idx" ON "Customer"("businessId", "phone");

CREATE INDEX "Booking_businessId_customerPhone_startsAt_idx"
ON "Booking"("businessId", "customerPhone", "startsAt");

CREATE INDEX "Booking_businessId_customerId_idx" ON "Booking"("businessId", "customerId");
