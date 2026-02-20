-- DropForeignKey
ALTER TABLE "item_pesanan" DROP CONSTRAINT "item_pesanan_pesanan_id_fkey";

-- DropForeignKey
ALTER TABLE "item_pesanan" DROP CONSTRAINT "item_pesanan_produk_id_fkey";

-- DropForeignKey
ALTER TABLE "item_pesanan" DROP CONSTRAINT "item_pesanan_varian_id_fkey";

-- DropForeignKey
ALTER TABLE "pergerakan_stok" DROP CONSTRAINT "pergerakan_stok_bahan_id_fkey";

-- DropForeignKey
ALTER TABLE "pergerakan_stok" DROP CONSTRAINT "pergerakan_stok_pengguna_id_fkey";

-- DropForeignKey
ALTER TABLE "pergerakan_stok" DROP CONSTRAINT "pergerakan_stok_pesanan_id_fkey";

-- DropForeignKey
ALTER TABLE "pesanan" DROP CONSTRAINT "pesanan_pelanggan_id_fkey";

-- DropForeignKey
ALTER TABLE "produk" DROP CONSTRAINT "produk_kategori_produk_id_fkey";

-- DropForeignKey
ALTER TABLE "resep_bahan_varian" DROP CONSTRAINT "resep_bahan_varian_bahan_fkey";

-- DropForeignKey
ALTER TABLE "resep_bahan_varian" DROP CONSTRAINT "resep_bahan_varian_varian_fkey";

-- DropForeignKey
ALTER TABLE "varian_bahan_produk" DROP CONSTRAINT "varian_bahan_produk_bahan_id_fkey";

-- DropForeignKey
ALTER TABLE "varian_bahan_produk" DROP CONSTRAINT "varian_bahan_produk_produk_id_fkey";

-- AlterTable
ALTER TABLE "bahan" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "kategori_produk" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pelanggan" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pengeluaran" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pengguna" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pesanan" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "produk" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resep_bahan_varian" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AlterTable
ALTER TABLE "varian_bahan_produk" ALTER COLUMN "diperbarui_pada" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "produk" ADD CONSTRAINT "produk_kategori_produk_id_fkey" FOREIGN KEY ("kategori_produk_id") REFERENCES "kategori_produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "varian_bahan_produk" ADD CONSTRAINT "varian_bahan_produk_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "varian_bahan_produk" ADD CONSTRAINT "varian_bahan_produk_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep_bahan_varian" ADD CONSTRAINT "resep_bahan_varian_varian_bahan_produk_id_fkey" FOREIGN KEY ("varian_bahan_produk_id") REFERENCES "varian_bahan_produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep_bahan_varian" ADD CONSTRAINT "resep_bahan_varian_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_pelanggan_id_fkey" FOREIGN KEY ("pelanggan_id") REFERENCES "pelanggan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_pesanan_id_fkey" FOREIGN KEY ("pesanan_id") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_varian_bahan_produk_id_fkey" FOREIGN KEY ("varian_bahan_produk_id") REFERENCES "varian_bahan_produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pergerakan_stok" ADD CONSTRAINT "pergerakan_stok_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pergerakan_stok" ADD CONSTRAINT "pergerakan_stok_pesanan_id_fkey" FOREIGN KEY ("pesanan_id") REFERENCES "pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pergerakan_stok" ADD CONSTRAINT "pergerakan_stok_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "item_pesanan_varian_id_idx" RENAME TO "item_pesanan_varian_bahan_produk_id_idx";

-- RenameIndex
ALTER INDEX "resep_bahan_varian_unique" RENAME TO "resep_bahan_varian_varian_bahan_produk_id_bahan_id_key";
