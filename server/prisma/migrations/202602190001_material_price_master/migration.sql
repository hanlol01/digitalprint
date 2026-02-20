ALTER TABLE "bahan"
ADD COLUMN "harga_modal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "harga_jual" INTEGER NOT NULL DEFAULT 0;

UPDATE "bahan" AS b
SET
  "harga_modal" = v."harga_modal",
  "harga_jual" = v."harga_jual"
FROM (
  SELECT DISTINCT ON ("bahan_id")
    "bahan_id",
    "harga_modal",
    "harga_jual"
  FROM "varian_bahan_produk"
  WHERE "dihapus_pada" IS NULL
  ORDER BY "bahan_id", "diperbarui_pada" DESC
) AS v
WHERE b."id" = v."bahan_id";
