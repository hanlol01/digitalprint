-- CreateEnum
CREATE TYPE "jenis_item_transaksi_enum" AS ENUM ('produk', 'jasa', 'display');

-- CreateTable
CREATE TABLE "master_satuan" (
  "id" TEXT NOT NULL,
  "kode_satuan" TEXT NOT NULL,
  "nama_satuan" TEXT NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "master_satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_finishing" (
  "id" TEXT NOT NULL,
  "kode_finishing" TEXT NOT NULL,
  "nama_finishing" TEXT NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "master_finishing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_material_jasa" (
  "id" TEXT NOT NULL,
  "kode_material" TEXT NOT NULL,
  "nama_material" TEXT NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "master_material_jasa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_rangka" (
  "id" TEXT NOT NULL,
  "kode_rangka" TEXT NOT NULL,
  "nama_rangka" TEXT NOT NULL,
  "stok_minimum" NUMERIC(14,4),
  "harga_beli" INTEGER,
  "stok" NUMERIC(14,4),
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "master_rangka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "katalog_jasa" (
  "id" TEXT NOT NULL,
  "kode_jasa" TEXT NOT NULL,
  "produk_id" TEXT NOT NULL,
  "kategori_produk_id" TEXT NOT NULL,
  "satuan_id" TEXT NOT NULL,
  "material_jasa_id" TEXT NOT NULL,
  "finishing_id" TEXT NOT NULL,
  "harga_jual" INTEGER NOT NULL,
  "estimasi_teks" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "katalog_jasa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "katalog_display" (
  "id" TEXT NOT NULL,
  "kode_display" TEXT NOT NULL,
  "nama_display" TEXT NOT NULL,
  "produk_id" TEXT NOT NULL,
  "kategori_produk_id" TEXT NOT NULL,
  "satuan_id" TEXT NOT NULL,
  "rangka_id" TEXT NOT NULL,
  "bahan_id" TEXT NOT NULL,
  "finishing_id" TEXT NOT NULL,
  "harga_jual" INTEGER NOT NULL,
  "minimum_order" INTEGER NOT NULL DEFAULT 1,
  "estimasi_teks" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "katalog_display_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "kategori_produk"
ADD COLUMN "kode_kategori" TEXT;

-- AlterTable
ALTER TABLE "produk"
ADD COLUMN "kode_produk" TEXT,
ADD COLUMN "nomor_legacy" INTEGER,
ADD COLUMN "satuan_id" TEXT;

-- AlterTable
ALTER TABLE "bahan"
ADD COLUMN "kode_bahan" TEXT;

-- AlterTable
ALTER TABLE "varian_bahan_produk"
ADD COLUMN "kode_varian" TEXT,
ADD COLUMN "satuan_id" TEXT,
ADD COLUMN "finishing_id" TEXT,
ADD COLUMN "minimum_order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "estimasi_teks" TEXT;

-- AlterTable
ALTER TABLE "item_pesanan"
ALTER COLUMN "varian_bahan_produk_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "item_pesanan"
ADD COLUMN "katalog_jasa_id" TEXT,
ADD COLUMN "katalog_display_id" TEXT,
ADD COLUMN "jenis_item" "jenis_item_transaksi_enum" NOT NULL DEFAULT 'produk',
ADD COLUMN "label_item" TEXT,
ADD COLUMN "label_satuan" TEXT,
ADD COLUMN "kode_referensi" TEXT;

-- Backfill
UPDATE "item_pesanan" SET "jenis_item" = 'produk' WHERE "jenis_item" IS NULL;

-- Unique indexes
CREATE UNIQUE INDEX "master_satuan_kode_satuan_key" ON "master_satuan"("kode_satuan");
CREATE UNIQUE INDEX "master_finishing_kode_finishing_key" ON "master_finishing"("kode_finishing");
CREATE UNIQUE INDEX "master_material_jasa_kode_material_key" ON "master_material_jasa"("kode_material");
CREATE UNIQUE INDEX "master_rangka_kode_rangka_key" ON "master_rangka"("kode_rangka");
CREATE UNIQUE INDEX "katalog_jasa_kode_jasa_key" ON "katalog_jasa"("kode_jasa");
CREATE UNIQUE INDEX "katalog_display_kode_display_key" ON "katalog_display"("kode_display");
CREATE UNIQUE INDEX "kategori_produk_kode_kategori_key" ON "kategori_produk"("kode_kategori");
CREATE UNIQUE INDEX "produk_kode_produk_key" ON "produk"("kode_produk");
CREATE UNIQUE INDEX "produk_nomor_legacy_key" ON "produk"("nomor_legacy");
CREATE UNIQUE INDEX "bahan_kode_bahan_key" ON "bahan"("kode_bahan");
CREATE UNIQUE INDEX "varian_bahan_produk_kode_varian_key" ON "varian_bahan_produk"("kode_varian");

-- Standard indexes
CREATE INDEX "master_satuan_dihapus_pada_idx" ON "master_satuan"("dihapus_pada");
CREATE INDEX "master_satuan_nama_satuan_idx" ON "master_satuan"("nama_satuan");
CREATE INDEX "master_finishing_dihapus_pada_idx" ON "master_finishing"("dihapus_pada");
CREATE INDEX "master_finishing_nama_finishing_idx" ON "master_finishing"("nama_finishing");
CREATE INDEX "master_material_jasa_dihapus_pada_idx" ON "master_material_jasa"("dihapus_pada");
CREATE INDEX "master_material_jasa_nama_material_idx" ON "master_material_jasa"("nama_material");
CREATE INDEX "master_rangka_dihapus_pada_idx" ON "master_rangka"("dihapus_pada");
CREATE INDEX "master_rangka_nama_rangka_idx" ON "master_rangka"("nama_rangka");
CREATE INDEX "katalog_jasa_produk_id_idx" ON "katalog_jasa"("produk_id");
CREATE INDEX "katalog_jasa_kategori_produk_id_idx" ON "katalog_jasa"("kategori_produk_id");
CREATE INDEX "katalog_jasa_satuan_id_idx" ON "katalog_jasa"("satuan_id");
CREATE INDEX "katalog_jasa_material_jasa_id_idx" ON "katalog_jasa"("material_jasa_id");
CREATE INDEX "katalog_jasa_finishing_id_idx" ON "katalog_jasa"("finishing_id");
CREATE INDEX "katalog_jasa_dihapus_pada_idx" ON "katalog_jasa"("dihapus_pada");
CREATE INDEX "katalog_display_produk_id_idx" ON "katalog_display"("produk_id");
CREATE INDEX "katalog_display_kategori_produk_id_idx" ON "katalog_display"("kategori_produk_id");
CREATE INDEX "katalog_display_satuan_id_idx" ON "katalog_display"("satuan_id");
CREATE INDEX "katalog_display_rangka_id_idx" ON "katalog_display"("rangka_id");
CREATE INDEX "katalog_display_bahan_id_idx" ON "katalog_display"("bahan_id");
CREATE INDEX "katalog_display_finishing_id_idx" ON "katalog_display"("finishing_id");
CREATE INDEX "katalog_display_dihapus_pada_idx" ON "katalog_display"("dihapus_pada");
CREATE INDEX "produk_satuan_id_idx" ON "produk"("satuan_id");
CREATE INDEX "varian_bahan_produk_satuan_id_idx" ON "varian_bahan_produk"("satuan_id");
CREATE INDEX "varian_bahan_produk_finishing_id_idx" ON "varian_bahan_produk"("finishing_id");
CREATE INDEX "item_pesanan_katalog_jasa_id_idx" ON "item_pesanan"("katalog_jasa_id");
CREATE INDEX "item_pesanan_katalog_display_id_idx" ON "item_pesanan"("katalog_display_id");
CREATE INDEX "item_pesanan_jenis_item_idx" ON "item_pesanan"("jenis_item");

-- Foreign keys
ALTER TABLE "produk"
ADD CONSTRAINT "produk_satuan_id_fkey"
FOREIGN KEY ("satuan_id") REFERENCES "master_satuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "varian_bahan_produk"
ADD CONSTRAINT "varian_bahan_produk_satuan_id_fkey"
FOREIGN KEY ("satuan_id") REFERENCES "master_satuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "varian_bahan_produk"
ADD CONSTRAINT "varian_bahan_produk_finishing_id_fkey"
FOREIGN KEY ("finishing_id") REFERENCES "master_finishing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "katalog_jasa"
ADD CONSTRAINT "katalog_jasa_produk_id_fkey"
FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_jasa"
ADD CONSTRAINT "katalog_jasa_kategori_produk_id_fkey"
FOREIGN KEY ("kategori_produk_id") REFERENCES "kategori_produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_jasa"
ADD CONSTRAINT "katalog_jasa_satuan_id_fkey"
FOREIGN KEY ("satuan_id") REFERENCES "master_satuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_jasa"
ADD CONSTRAINT "katalog_jasa_material_jasa_id_fkey"
FOREIGN KEY ("material_jasa_id") REFERENCES "master_material_jasa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_jasa"
ADD CONSTRAINT "katalog_jasa_finishing_id_fkey"
FOREIGN KEY ("finishing_id") REFERENCES "master_finishing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_produk_id_fkey"
FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_kategori_produk_id_fkey"
FOREIGN KEY ("kategori_produk_id") REFERENCES "kategori_produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_satuan_id_fkey"
FOREIGN KEY ("satuan_id") REFERENCES "master_satuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_rangka_id_fkey"
FOREIGN KEY ("rangka_id") REFERENCES "master_rangka"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_bahan_id_fkey"
FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_finishing_id_fkey"
FOREIGN KEY ("finishing_id") REFERENCES "master_finishing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_pesanan"
ADD CONSTRAINT "item_pesanan_katalog_jasa_id_fkey"
FOREIGN KEY ("katalog_jasa_id") REFERENCES "katalog_jasa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "item_pesanan"
ADD CONSTRAINT "item_pesanan_katalog_display_id_fkey"
FOREIGN KEY ("katalog_display_id") REFERENCES "katalog_display"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Check constraint
ALTER TABLE "item_pesanan"
ADD CONSTRAINT "item_pesanan_jenis_item_check"
CHECK (
  ("jenis_item" = 'produk'::"jenis_item_transaksi_enum" AND "varian_bahan_produk_id" IS NOT NULL AND "katalog_jasa_id" IS NULL AND "katalog_display_id" IS NULL)
  OR
  ("jenis_item" = 'jasa'::"jenis_item_transaksi_enum" AND "katalog_jasa_id" IS NOT NULL AND "varian_bahan_produk_id" IS NULL AND "katalog_display_id" IS NULL)
  OR
  ("jenis_item" = 'display'::"jenis_item_transaksi_enum" AND "katalog_display_id" IS NOT NULL AND "varian_bahan_produk_id" IS NULL AND "katalog_jasa_id" IS NULL)
);
