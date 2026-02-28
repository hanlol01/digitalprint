-- DropForeignKey
ALTER TABLE "item_pesanan" DROP CONSTRAINT "item_pesanan_varian_bahan_produk_id_fkey";

-- AlterTable
ALTER TABLE "katalog_display" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "katalog_jasa" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "master_finishing" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "master_material_jasa" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "master_rangka" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "master_satuan" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_varian_bahan_produk_id_fkey" FOREIGN KEY ("varian_bahan_produk_id") REFERENCES "varian_bahan_produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
