import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/api-error";

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validasi request gagal",
      errors: error.flatten().fieldErrors,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targetFields = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]) : [];
      const fieldLabelMap: Record<string, string> = {
        kode_produk: "kode produk",
        nomor_legacy: "ID produk (legacy)",
        kode_varian: "kode varian",
        kode_jasa: "kode jasa",
        kode_display: "kode display",
        kode_bahan: "kode bahan",
        kode_kategori: "kode kategori",
        nama: "nama",
        kode_satuan: "kode satuan",
        nama_satuan: "nama satuan",
        kode_finishing: "kode finishing",
        nama_finishing: "nama finishing",
        kode_material: "kode material",
        nama_material: "nama material",
        kode_rangka: "kode rangka",
        nama_rangka: "nama rangka",
      };
      const readableFields = targetFields
        .map((field) => fieldLabelMap[field] ?? field.replace(/_/g, " "))
        .filter(Boolean);
      const duplicateMessage = readableFields.length > 0
        ? `Data duplikat, nilai unik sudah digunakan pada ${readableFields.join(", ")}`
        : "Data duplikat, nilai unik sudah digunakan";
      res.status(409).json({
        success: false,
        message: duplicateMessage,
        errors: error.meta,
      });
      return;
    }
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
  });
};
