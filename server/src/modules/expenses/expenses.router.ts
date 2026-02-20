import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/api-error";

const createExpenseSchema = z.object({
  date: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1).max(250),
  amount: z.number().int().positive(),
});

const updateExpenseSchema = createExpenseSchema.partial();

const expensesRouter = Router();
expensesRouter.use(authenticate);

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;
    const category = String(req.query.category ?? "").trim();
    const startDate = String(req.query.startDate ?? "").trim();
    const endDate = String(req.query.endDate ?? "").trim();

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    sendSuccess(res, expenses, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

expensesRouter.post(
  "/",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(createExpenseSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createExpenseSchema>;
    const expense = await prisma.expense.create({
      data: {
        date: new Date(body.date),
        category: body.category,
        description: body.description,
        amount: body.amount,
      },
    });
    sendSuccess(res, expense, undefined, 201);
  }),
);

expensesRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  validateBody(updateExpenseSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateExpenseSchema>;

    const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Data pengeluaran tidak ditemukan");
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        category: body.category,
        description: body.description,
        amount: body.amount,
      },
    });

    sendSuccess(res, updated);
  }),
);

expensesRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("owner", "admin"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new ApiError(404, "Data pengeluaran tidak ditemukan");
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, { message: "Pengeluaran berhasil dihapus" });
  }),
);

export { expensesRouter };
