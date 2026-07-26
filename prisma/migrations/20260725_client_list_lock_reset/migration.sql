-- Recuperação por email do código de segurança das listas (secção Conta).
-- Guarda um código de uso único (scrypt "salt:hash") enviado ao email do dono e a
-- sua validade. Confirmar remove a proteção para o dono definir um novo código.
--
-- Operação ADITIVA: só ADD COLUMN. Não toca em tabelas/colunas existentes nem nos
-- índices parciais geridos à mão. IF NOT EXISTS torna-a idempotente.
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "clientListLockResetCodeHash" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "clientListLockResetExpiresAt" TIMESTAMP(3);
