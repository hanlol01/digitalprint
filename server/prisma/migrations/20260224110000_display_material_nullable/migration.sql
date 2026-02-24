ALTER TABLE "katalog_display"
DROP CONSTRAINT "katalog_display_bahan_id_fkey";

ALTER TABLE "katalog_display"
ALTER COLUMN "bahan_id" DROP NOT NULL;

ALTER TABLE "katalog_display"
ADD CONSTRAINT "katalog_display_bahan_id_fkey"
FOREIGN KEY ("bahan_id") REFERENCES "bahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
