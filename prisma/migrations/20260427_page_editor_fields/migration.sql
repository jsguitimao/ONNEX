-- AlterTable: campos novos do BookingPage para o Page Editor.
ALTER TABLE "BookingPage"
  ADD COLUMN "heroPosterUrl"   TEXT,
  ADD COLUMN "heroMediaKind"   TEXT,
  ADD COLUMN "galleryImages"   JSONB,
  ADD COLUMN "mapsAddress"     TEXT,
  ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
