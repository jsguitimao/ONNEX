-- Renomeia o valor 'SMS' do enum NotificationChannel para 'WHATSAPP'.
-- Todas as linhas existentes em NotificationLog com channel='SMS' passam
-- automaticamente a channel='WHATSAPP' (operacao atomica do Postgres).
ALTER TYPE "NotificationChannel" RENAME VALUE 'SMS' TO 'WHATSAPP';
