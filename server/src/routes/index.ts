import { Router } from "express";
import { OrderStatus, TransactionItemType } from "@prisma/client";
import { authRouter } from "../modules/auth/auth.router";
import { categoriesRouter } from "../modules/categories/categories.router";
import { productsRouter } from "../modules/products/products.router";
import { materialsRouter } from "../modules/materials/materials.router";
import { unitsRouter } from "../modules/units/units.router";
import { finishingsRouter } from "../modules/finishings/finishings.router";
import { serviceMaterialsRouter } from "../modules/service-materials/service-materials.router";
import { framesRouter } from "../modules/frames/frames.router";
import { servicesRouter } from "../modules/services/services.router";
import { displaysRouter } from "../modules/displays/displays.router";
import { customersRouter } from "../modules/customers/customers.router";
import { ordersRouter } from "../modules/orders/orders.router";
import { expensesRouter } from "../modules/expenses/expenses.router";
import { reportsRouter } from "../modules/reports/reports.router";
import { employeesRouter } from "../modules/employees/employees.router";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/response";
import { authenticate } from "../middlewares/auth";

export const apiRouter = Router();

apiRouter.get(
  "/pesanan-ringkasan-status",
  authenticate,
  asyncHandler(async (req, res) => {
    const itemTypeQuery = String(req.query.itemType ?? "").trim();
    const itemType = Object.values(TransactionItemType).includes(itemTypeQuery as TransactionItemType)
      ? (itemTypeQuery as TransactionItemType)
      : undefined;

    const groups = await prisma.order.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        ...(itemType ? { items: { some: { itemType } } } : {}),
      },
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
apiRouter.use("/satuan", unitsRouter);
apiRouter.use("/finishing", finishingsRouter);
apiRouter.use("/material-jasa", serviceMaterialsRouter);
apiRouter.use("/rangka", framesRouter);
apiRouter.use("/jasa", servicesRouter);
apiRouter.use("/display", displaysRouter);
apiRouter.use("/pelanggan", customersRouter);
apiRouter.use("/pesanan", ordersRouter);
apiRouter.use("/pengeluaran", expensesRouter);
apiRouter.use("/laporan", reportsRouter);
apiRouter.use("/karyawan", employeesRouter);
