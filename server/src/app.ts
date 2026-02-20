import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

const findOpenApiPath = (): string | null => {
  const candidates = [
    path.join(process.cwd(), "src", "docs", "openapi.yaml"),
    path.join(process.cwd(), "dist", "docs", "openapi.yaml"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: "ok" },
  });
});

const openApiPath = findOpenApiPath();
if (openApiPath) {
  const openApiDoc = YAML.load(openApiPath) as Record<string, unknown>;
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDoc as never));
}

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
