ALTER TABLE "pengguna"
  ADD COLUMN "nama_lengkap" TEXT,
  ADD COLUMN "alamat" TEXT,
  ADD COLUMN "nomor_wa" TEXT;

UPDATE "pengguna"
SET "nama_lengkap" = "nama_pengguna"
WHERE "nama_lengkap" IS NULL;

ALTER TABLE "pengguna"
  DROP COLUMN "wajib_ganti_kata_sandi";

DROP INDEX IF EXISTS "pengguna_nomor_wa_aktif_unique";
CREATE UNIQUE INDEX "pengguna_nomor_wa_aktif_unique"
  ON "pengguna" ("nomor_wa")
  WHERE "dihapus_pada" IS NULL AND "nomor_wa" IS NOT NULL;
