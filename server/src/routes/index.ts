import { Router } from "express";
import { OrderStatus } from "@prisma/client";
import { authRouter } from "../modules/auth/auth.router";
import { categoriesRouter } from "../modules/categories/categories.router";
import { productsRouter } from "../modules/products/products.router";
import { materialsRouter } from "../modules/materials/materials.router";
import { customersRouter } from "../modules/customers/customers.router";
import { ordersRouter } from "../modules/orders/orders.router";
import { expensesRouter } from "../modules/expenses/expenses.router";
import { reportsRouter } from "../modules/reports/reports.router";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/response";
import { authenticate } from "../middlewares/auth";

export const apiRouter = Router();

apiRouter.get(
  "/pesanan-ringkasan-status",
  authenticate,
  asyncHandler(async (_req, res) => {
    const groups = await prisma.order.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    });
    const statuses: OrderStatus[] = [
      OrderStatus.menunggu_desain,
      OrderStatus.proses_cetak,
      OrderStatus.finishing,
      OrderStatus.selesai,
      OrderStatus.sudah_diambil,
    ];

    const data = statuses.map((status) => ({
      status,
      total: groups.find((group) => group.status === status)?._count ?? 0,
    }));

    sendSuccess(res, data);
  }),
);

apiRouter.use("/auth", authRouter);
apiRouter.use("/kategori-produk", categoriesRouter);
apiRouter.use("/produk", productsRouter);
apiRouter.use("/bahan", materialsRouter);
apiRouter.use("/pelanggan", customersRouter);
apiRouter.use("/pesanan", ordersRouter);
apiRouter.use("/pengeluaran", expensesRouter);
apiRouter.use("/laporan", reportsRouter);
