-- Adiciona "assignedStaffMemberId" a Customer: o profissional atribuído a uma
-- ficha criada/editada à mão no CRM (o "Novo cliente" não passa por marcação).
-- Coloca o cliente na lista desse barbeiro na secção Clientes. NULL = sem
-- profissional. FK com ON DELETE SET NULL: se o barbeiro for apagado, a ficha
-- fica "sem profissional" em vez de apontar para um id inexistente.
--
-- Operação ADITIVA: ADD COLUMN + FK + índice. Não toca em tabelas/colunas
-- existentes nem nos índices parciais geridos à mão. Guardas IF NOT EXISTS /
-- duplicate_object tornam-na idempotente (aplicável à mão via prisma db execute).
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "assignedStaffMemberId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Customer"
    ADD CONSTRAINT "Customer_assignedStaffMemberId_fkey"
    FOREIGN KEY ("assignedStaffMemberId") REFERENCES "StaffMember"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Customer_businessId_assignedStaffMemberId_idx"
  ON "Customer" ("businessId", "assignedStaffMemberId");
