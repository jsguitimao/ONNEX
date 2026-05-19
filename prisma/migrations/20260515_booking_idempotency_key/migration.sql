-- Idempotency key para evitar marcacoes duplicadas em retries de rede.
-- O cliente gera um UUID por tentativa de submit. O servidor faz lookup
-- antes de criar; se ja existe booking com a mesma chave, devolve esse
-- (sem duplicar nem disparar segunda notificacao).
ALTER TABLE "Booking" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
