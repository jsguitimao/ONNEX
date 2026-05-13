-- Configuracoes de tempo dos lembretes WhatsApp por barbearia.
-- reminderMinutesBefore: quantos minutos antes do corte sai o lembrete + pedido de confirmacao (default 30).
-- confirmationToleranceMinutes: quantos minutos o cliente tem para confirmar antes de cancelarmos automaticamente (default 10).
ALTER TABLE "BusinessAutomation"
  ADD COLUMN "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "confirmationToleranceMinutes" INTEGER NOT NULL DEFAULT 10;
