ALTER TABLE "pesanan"
ADD COLUMN "uang_muka" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "jumlah_dibayar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sisa_pembayaran" INTEGER NOT NULL DEFAULT 0;

UPDATE "pesanan"
SET
  "uang_muka" = 0,
  "jumlah_dibayar" = CASE
    WHEN "metode_pembayaran" = 'piutang'::"metode_pembayaran_enum" THEN 0
    ELSE "total"
  END,
  "sisa_pembayaran" = CASE
    WHEN "metode_pembayaran" = 'piutang'::"metode_pembayaran_enum" THEN "total"
    ELSE 0
  END;

