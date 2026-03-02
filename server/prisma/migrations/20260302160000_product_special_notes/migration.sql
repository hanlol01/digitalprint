ALTER TABLE "produk"
ADD COLUMN "catatan_khusus_aktif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "opsi_catatan_khusus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "item_pesanan"
ADD COLUMN "catatan_khusus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
