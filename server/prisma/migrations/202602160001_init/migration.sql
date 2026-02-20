-- enums
CREATE TYPE "satuan_harga_enum" AS ENUM ('per_lembar', 'per_meter', 'per_cm', 'per_pcs');
CREATE TYPE "status_pesanan_enum" AS ENUM ('menunggu_desain', 'proses_cetak', 'finishing', 'selesai', 'sudah_diambil');
CREATE TYPE "metode_pembayaran_enum" AS ENUM ('cash', 'transfer', 'qris', 'piutang');
CREATE TYPE "peran_pengguna_enum" AS ENUM ('owner', 'admin', 'kasir', 'operator');
CREATE TYPE "jenis_pergerakan_stok_enum" AS ENUM ('restock', 'adjustment', 'order_checkout');
CREATE TYPE "arah_pergerakan_stok_enum" AS ENUM ('in', 'out');

CREATE TABLE "pengguna" (
  "id" TEXT PRIMARY KEY,
  "nama_pengguna" TEXT NOT NULL UNIQUE,
  "kata_sandi_hash" TEXT NOT NULL,
  "peran" "peran_pengguna_enum" NOT NULL DEFAULT 'admin',
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "wajib_ganti_kata_sandi" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3)
);

CREATE TABLE "kategori_produk" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL UNIQUE,
  "ikon" TEXT NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3)
);

CREATE TABLE "produk" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL,
  "kategori_produk_id" TEXT NOT NULL,
  "satuan_harga" "satuan_harga_enum" NOT NULL,
  "punya_ukuran_kustom" BOOLEAN NOT NULL DEFAULT FALSE,
  "panjang_kustom" NUMERIC(14, 4),
  "lebar_kustom" NUMERIC(14, 4),
  "biaya_finishing" INTEGER NOT NULL DEFAULT 0,
  "estimasi_menit" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "produk_kategori_produk_id_fkey" FOREIGN KEY ("kategori_produk_id") REFERENCES "kategori_produk"("id")
);

CREATE TABLE "varian_bahan_produk" (
  "id" TEXT PRIMARY KEY,
  "produk_id" TEXT NOT NULL,
  "bahan_id" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "harga_modal" INTEGER NOT NULL,
  "harga_jual" INTEGER NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "varian_bahan_produk_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id")
);

CREATE TABLE "bahan" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL UNIQUE,
  "satuan" TEXT NOT NULL,
  "stok_saat_ini" NUMERIC(14, 4) NOT NULL,
  "stok_minimum" NUMERIC(14, 4) NOT NULL,
  "terakhir_restok" TIMESTAMP(3) NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3)
);

ALTER TABLE "varian_bahan_produk"
ADD CONSTRAINT "varian_bahan_produk_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id");

CREATE TABLE "resep_bahan_varian" (
  "id" TEXT PRIMARY KEY,
  "varian_bahan_produk_id" TEXT NOT NULL,
  "bahan_id" TEXT NOT NULL,
  "pemakaian_per_satuan" NUMERIC(14, 6) NOT NULL,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resep_bahan_varian_varian_fkey" FOREIGN KEY ("varian_bahan_produk_id") REFERENCES "varian_bahan_produk"("id"),
  CONSTRAINT "resep_bahan_varian_bahan_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id")
);

CREATE TABLE "pelanggan" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL,
  "no_telepon" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "total_belanja" INTEGER NOT NULL DEFAULT 0,
  "total_pesanan" INTEGER NOT NULL DEFAULT 0,
  "poin_loyalitas" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3)
);

CREATE TABLE "pesanan" (
  "id" TEXT PRIMARY KEY,
  "nomor_pesanan" TEXT NOT NULL UNIQUE,
  "pelanggan_id" TEXT,
  "nama_pelanggan" TEXT NOT NULL,
  "telepon_pelanggan" TEXT NOT NULL,
  "metode_pembayaran" "metode_pembayaran_enum" NOT NULL,
  "status" "status_pesanan_enum" NOT NULL DEFAULT 'menunggu_desain',
  "subtotal" INTEGER NOT NULL,
  "diskon" INTEGER NOT NULL DEFAULT 0,
  "pajak" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "catatan" TEXT NOT NULL DEFAULT '',
  "tenggat_waktu" TIMESTAMP(3),
  "url_file_desain" TEXT,
  "estimasi_menit" INTEGER NOT NULL DEFAULT 0,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3),
  CONSTRAINT "pesanan_pelanggan_id_fkey" FOREIGN KEY ("pelanggan_id") REFERENCES "pelanggan"("id")
);

CREATE TABLE "item_pesanan" (
  "id" TEXT PRIMARY KEY,
  "pesanan_id" TEXT NOT NULL,
  "produk_id" TEXT NOT NULL,
  "varian_bahan_produk_id" TEXT NOT NULL,
  "nama_produk" TEXT NOT NULL,
  "nama_varian" TEXT NOT NULL,
  "satuan_harga" "satuan_harga_enum" NOT NULL,
  "harga_satuan" INTEGER NOT NULL,
  "jumlah" INTEGER NOT NULL DEFAULT 1,
  "panjang" NUMERIC(14, 4),
  "lebar" NUMERIC(14, 4),
  "catatan" TEXT NOT NULL DEFAULT '',
  "finishing" BOOLEAN NOT NULL DEFAULT FALSE,
  "biaya_finishing" INTEGER NOT NULL DEFAULT 0,
  "subtotal" INTEGER NOT NULL,
  "estimasi_menit" INTEGER NOT NULL DEFAULT 0,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "item_pesanan_pesanan_id_fkey" FOREIGN KEY ("pesanan_id") REFERENCES "pesanan"("id"),
  CONSTRAINT "item_pesanan_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id"),
  CONSTRAINT "item_pesanan_varian_id_fkey" FOREIGN KEY ("varian_bahan_produk_id") REFERENCES "varian_bahan_produk"("id")
);

CREATE TABLE "pergerakan_stok" (
  "id" TEXT PRIMARY KEY,
  "bahan_id" TEXT NOT NULL,
  "pesanan_id" TEXT,
  "pengguna_id" TEXT,
  "jenis" "jenis_pergerakan_stok_enum" NOT NULL,
  "arah" "arah_pergerakan_stok_enum" NOT NULL,
  "jumlah" NUMERIC(14, 4) NOT NULL,
  "saldo_setelah" NUMERIC(14, 4) NOT NULL,
  "catatan" TEXT NOT NULL DEFAULT '',
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pergerakan_stok_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id"),
  CONSTRAINT "pergerakan_stok_pesanan_id_fkey" FOREIGN KEY ("pesanan_id") REFERENCES "pesanan"("id"),
  CONSTRAINT "pergerakan_stok_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id")
);

CREATE TABLE "pengeluaran" (
  "id" TEXT PRIMARY KEY,
  "tanggal" TIMESTAMP(3) NOT NULL,
  "kategori" TEXT NOT NULL,
  "keterangan" TEXT NOT NULL,
  "jumlah" INTEGER NOT NULL,
  "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diperbarui_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dihapus_pada" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "resep_bahan_varian_unique" ON "resep_bahan_varian"("varian_bahan_produk_id", "bahan_id");

CREATE INDEX "pengguna_dihapus_pada_idx" ON "pengguna"("dihapus_pada");
CREATE INDEX "kategori_produk_dihapus_pada_idx" ON "kategori_produk"("dihapus_pada");
CREATE INDEX "produk_kategori_produk_id_idx" ON "produk"("kategori_produk_id");
CREATE INDEX "produk_nama_idx" ON "produk"("nama");
CREATE INDEX "produk_dihapus_pada_idx" ON "produk"("dihapus_pada");
CREATE INDEX "varian_bahan_produk_produk_id_idx" ON "varian_bahan_produk"("produk_id");
CREATE INDEX "varian_bahan_produk_bahan_id_idx" ON "varian_bahan_produk"("bahan_id");
CREATE INDEX "varian_bahan_produk_dihapus_pada_idx" ON "varian_bahan_produk"("dihapus_pada");
CREATE INDEX "bahan_nama_idx" ON "bahan"("nama");
CREATE INDEX "bahan_dihapus_pada_idx" ON "bahan"("dihapus_pada");
CREATE INDEX "resep_bahan_varian_bahan_id_idx" ON "resep_bahan_varian"("bahan_id");
CREATE INDEX "pelanggan_nama_idx" ON "pelanggan"("nama");
CREATE INDEX "pelanggan_dihapus_pada_idx" ON "pelanggan"("dihapus_pada");
CREATE INDEX "pesanan_pelanggan_id_idx" ON "pesanan"("pelanggan_id");
CREATE INDEX "pesanan_status_idx" ON "pesanan"("status");
CREATE INDEX "pesanan_dibuat_pada_idx" ON "pesanan"("dibuat_pada");
CREATE INDEX "pesanan_dihapus_pada_idx" ON "pesanan"("dihapus_pada");
CREATE INDEX "item_pesanan_pesanan_id_idx" ON "item_pesanan"("pesanan_id");
CREATE INDEX "item_pesanan_produk_id_idx" ON "item_pesanan"("produk_id");
CREATE INDEX "item_pesanan_varian_id_idx" ON "item_pesanan"("varian_bahan_produk_id");
CREATE INDEX "pergerakan_stok_bahan_id_idx" ON "pergerakan_stok"("bahan_id");
CREATE INDEX "pergerakan_stok_pesanan_id_idx" ON "pergerakan_stok"("pesanan_id");
CREATE INDEX "pergerakan_stok_dibuat_pada_idx" ON "pergerakan_stok"("dibuat_pada");
CREATE INDEX "pengeluaran_tanggal_idx" ON "pengeluaran"("tanggal");
CREATE INDEX "pengeluaran_kategori_idx" ON "pengeluaran"("kategori");
CREATE INDEX "pengeluaran_dihapus_pada_idx" ON "pengeluaran"("dihapus_pada");
