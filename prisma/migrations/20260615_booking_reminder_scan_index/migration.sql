-- Índice parcial para o scan global do cron de lembretes.
--
-- `fetchUpcomingBookings()` (sem businessId) varre TODAS as reservas numa janela
-- de `startsAt` (now .. now+240min) filtrando por status e customerPhone. Nenhum
-- dos índices existentes começa por `startsAt` (lideram por businessId/staff), por
-- isso, à escala, esta query degrada para sequential scan da tabela Booking — duas
-- vezes por execução (lembretes + auto-cancel), de 2 em 2 minutos.
--
-- Este índice parcial cobre exatamente as linhas elegíveis e mantém-se pequeno
-- (só PENDING/CONFIRMED com telefone), tornando o scan barato independentemente
-- do volume histórico de reservas concluídas/canceladas.
--
-- ÍNDICE PARCIAL gerido à mão (Prisma não suporta cláusula WHERE no @@index).
-- NÃO apagar em migrations futuras: o `prisma migrate dev` vai querer gerar um
-- DROP deste índice porque ele não aparece no schema.prisma — remover esse DROP
-- da migration gerada.
CREATE INDEX "Booking_reminder_scan_idx"
ON "Booking"("startsAt")
WHERE "status" IN ('PENDING', 'CONFIRMED') AND "customerPhone" IS NOT NULL;
