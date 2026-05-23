-- Corrige takeover cross-tenant via idempotencyKey.
-- Antes a idempotencyKey era unica GLOBAL: a mesma chave so podia existir uma
-- vez em toda a tabela, e o lookup por idempotencyKey podia devolver a reserva
-- de outro negocio (com o respetivo publicToken), permitindo gerir/cancelar
-- marcacoes alheias.
-- Agora a unicidade passa a ser por negocio (businessId + idempotencyKey):
-- a mesma chave pode coexistir em negocios diferentes sem colidir, e o lookup
-- de idempotencia e sempre scoped ao negocio correto.
-- Nota: no Postgres NULLs sao distintos num indice unico, por isso varias
-- reservas sem idempotencyKey (criadas no painel/manual) continuam permitidas.
DROP INDEX "Booking_idempotencyKey_key";
CREATE UNIQUE INDEX "Booking_businessId_idempotencyKey_key" ON "Booking"("businessId", "idempotencyKey");
