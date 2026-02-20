import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  APP_TZ: z.string().default("Asia/Jakarta"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:8080"),
  OWNER_SEED_USERNAME: z.string().default("owner"),
  OWNER_SEED_PASSWORD: z.string().default("owner123"),
  ADMIN_SEED_USERNAME: z.string().default("admin"),
  ADMIN_SEED_PASSWORD: z.string().default("admin123"),
  KASIR_SEED_USERNAME: z.string().default("kasir"),
  KASIR_SEED_PASSWORD: z.string().default("kasir123"),
  OPERATOR_SEED_USERNAME: z.string().default("operator"),
  OPERATOR_SEED_PASSWORD: z.string().default("operator123"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Konfigurasi environment tidak valid:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
