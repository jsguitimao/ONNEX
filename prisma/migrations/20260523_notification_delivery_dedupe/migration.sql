-- Enforce notification dedupe at the database layer for deliveries that are
-- already in flight or completed. FAILED/SKIPPED rows remain retryable and can
-- be logged more than once for operational debugging.
CREATE UNIQUE INDEX "NotificationLog_delivery_dedupe_active_key"
ON "NotificationLog"("bookingId", "kind", "channel", "recipient")
WHERE "status" IN ('PENDING', 'SENT');
