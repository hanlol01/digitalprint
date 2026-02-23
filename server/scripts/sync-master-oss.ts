import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma, PrismaClient, PricingUnit } from "@prisma/client";

type SheetRecord = Record<string, string | number | null>;
type WorkbookDump = {
  sheets: Record<string, SheetRecord[]>;
};

type SyncCounter = {
  inserted: number;
  updated: number;
  deactivated: number;
  skipped: number;
};

const prisma = new PrismaClient();

const parseArgs = (): { file: string } => {
  const args = process.argv.slice(2);
  const fileIdx = args.findIndex((arg) => arg === "--file");
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    throw new Error('Argumen wajib: --file "<path-xlsx>"');
  }
  const file = resolve(args[fileIdx + 1]);
  return { file };
};

const pythonWorkbookParser = String.raw`
import json
import os
import re
from zipfile import ZipFile
import xml.etree.ElementTree as ET

path = os.environ.get("XLSX_FILE", "")
if not path:
    raise SystemExit("XLSX_FILE env is required")

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships"

def col_to_index(col_letters: str) -> int:
    n = 0
    for ch in col_letters:
        if 'A' <= ch <= 'Z':
            n = n * 26 + (ord(ch) - ord('A') + 1)
    return n

def cell_ref_to_rc(cell_ref: str):
    m = re.match(r"([A-Z]+)(\d+)", cell_ref or "")
    if not m:
        return None, None
    return int(m.group(2)), col_to_index(m.group(1))

def extract_text(node):
    if node is None:
        return ""
    return "".join((t.text or "") for t in node.findall(f".//{{{NS_MAIN}}}t"))

def norm(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return v

with ZipFile(path, "r") as z:
    shared_strings = []
    if "xl/sharedStrings.xml" in z.namelist():
        ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in ss_root.findall(f"{{{NS_MAIN}}}si"):
            shared_strings.append(extract_text(si))

    wb_root = ET.fromstring(z.read("xl/workbook.xml"))
    rel_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rel_map = {}
    for rel in rel_root.findall(f"{{{NS_PKG}}}Relationship"):
        target = rel.attrib.get("Target")
        if target and not target.startswith("xl/"):
            target = "xl/" + target
        rel_map[rel.attrib.get("Id")] = target

    out = {"sheets": {}}
    sheets = wb_root.find(f"{{{NS_MAIN}}}sheets")
    for sheet in sheets.findall(f"{{{NS_MAIN}}}sheet"):
        name = sheet.attrib.get("name")
        rid = sheet.attrib.get(f"{{{NS_REL}}}id")
        target = rel_map.get(rid)
        if not target or target not in z.namelist():
            out["sheets"][name] = []
            continue

        root = ET.fromstring(z.read(target))
        sheet_data = root.find(f"{{{NS_MAIN}}}sheetData")
        rows = {}
        max_col = 0

        if sheet_data is not None:
            for r in sheet_data.findall(f"{{{NS_MAIN}}}row"):
                r_idx = int(r.attrib.get("r", "0"))
                if r_idx == 0:
                    continue
                row_vals = {}
                for c in r.findall(f"{{{NS_MAIN}}}c"):
                    rr, cc = cell_ref_to_rc(c.attrib.get("r", ""))
                    if rr is None:
                        continue
                    t = c.attrib.get("t")
                    v_node = c.find(f"{{{NS_MAIN}}}v")
                    val = None
                    if t == "s" and v_node is not None and v_node.text is not None:
                        try:
                            idx = int(v_node.text)
                            val = shared_strings[idx] if 0 <= idx < len(shared_strings) else None
                        except Exception:
                            val = v_node.text
                    elif t == "inlineStr":
                        val = extract_text(c.find(f"{{{NS_MAIN}}}is"))
                    elif t == "b" and v_node is not None:
                        val = 1 if v_node.text == "1" else 0
                    elif v_node is not None and v_node.text is not None:
                        txt = v_node.text
                        try:
                            val = float(txt) if "." in txt else int(txt)
                        except Exception:
                            val = txt
                    row_vals[cc] = norm(val)
                    if cc > max_col:
                        max_col = cc
                if any(v is not None for v in row_vals.values()):
                    rows[r_idx] = row_vals

        if not rows:
            out["sheets"][name] = []
            continue

        header_row = min(rows.keys())
        headers = [rows[header_row].get(c) for c in range(1, max_col + 1)]
        headers = [h if h is not None else f"col_{i+1}" for i, h in enumerate(headers)]

        records = []
        for r_idx in sorted(k for k in rows.keys() if k > header_row):
            arr = [rows[r_idx].get(c) for c in range(1, max_col + 1)]
            if not any(v is not None for v in arr):
                continue
            rec = {str(headers[i]): arr[i] for i in range(max_col)}
            records.append(rec)

        out["sheets"][name] = records

    print(json.dumps(out, ensure_ascii=False))
`;

const parseWorkbook = (filePath: string): WorkbookDump => {
  const result = spawnSync("python", ["-"], {
    input: pythonWorkbookParser,
    encoding: "utf8",
    env: { ...process.env, XLSX_FILE: filePath },
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || "Gagal parse file XLSX dengan Python");
  }
  return JSON.parse(result.stdout) as WorkbookDump;
};

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str;
};

const asInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
};

const asDecimal = (value: unknown): Prisma.Decimal | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return new Prisma.Decimal(num);
};

const normalizeJasaCode = (value: string): string => {
  const match = value.match(/^js-oo(\d{1,3})$/i);
  if (!match) return value.toLowerCase();
  return `js-${match[1].padStart(3, "0")}`;
};

const pricingFromUnitName = (unitName: string): PricingUnit => {
  const value = unitName.toLowerCase();
  if (value === "m2") return PricingUnit.per_meter;
  if (value === "cm") return PricingUnit.per_cm;
  if (value === "lembar" || value === "a3") return PricingUnit.per_lembar;
  return PricingUnit.per_pcs;
};

const main = async (): Promise<void> => {
  const { file } = parseArgs();
  if (!existsSync(file)) {
    throw new Error(`File tidak ditemukan: ${file}`);
  }

  const workbook = parseWorkbook(file);
  const warnings: string[] = [];
  const counters: Record<string, SyncCounter> = {
    kategori: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    satuan: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    bahan: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    finishing: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    materialJasa: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    rangka: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    produk: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    varian: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    jasa: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
    display: { inserted: 0, updated: 0, deactivated: 0, skipped: 0 },
  };

  const categoriesRaw = workbook.sheets.mst_kategori ?? [];
  const unitsRaw = workbook.sheets.mst_satuan ?? [];
  const productsRaw = workbook.sheets.mst_produk ?? [];
  const materialsRaw = workbook.sheets.mst_bahan ?? [];
  const finishingsRaw = workbook.sheets.mst_finishing ?? [];
  const serviceMaterialsRaw = workbook.sheets.mst_material ?? [];
  const framesRaw = workbook.sheets.mst_rangka ?? [];
  const variantsRaw = workbook.sheets.mst_varian ?? [];
  const servicesRaw = workbook.sheets.mst_jasa ?? [];
  const displaysRaw = workbook.sheets.mst_display ?? [];

  await prisma.$transaction(async (tx) => {
    const importedCategoryIds: string[] = [];
    const importedUnitIds: string[] = [];
    const importedMaterialIds: string[] = [];
    const importedFinishingIds: string[] = [];
    const importedServiceMaterialIds: string[] = [];
    const importedFrameIds: string[] = [];
    const importedProductIds: string[] = [];
    const importedVariantIds: string[] = [];
    const importedServiceIds: string[] = [];
    const importedDisplayIds: string[] = [];

    const categoryCodeToId = new Map<string, string>();
    const unitCodeToId = new Map<string, string>();
    const materialCodeToId = new Map<string, string>();
    const finishingCodeToId = new Map<string, string>();
    const serviceMaterialCodeToId = new Map<string, string>();
    const frameCodeToId = new Map<string, string>();
    const productLegacyToId = new Map<number, string>();
    const productIdToName = new Map<string, string>();
    const unitCodeToName = new Map<string, string>();
    const finishingIdToName = new Map<string, string>();
    const materialIdToName = new Map<string, string>();
    const serviceMaterialIdToName = new Map<string, string>();
    const materialCostById = new Map<string, number>();

    for (const row of unitsRaw) {
      const code = asText(row.kode_satuan)?.toLowerCase();
      const name = asText(row.nama_satuan);
      if (!code || !name) {
        counters.satuan.skipped += 1;
        continue;
      }

      const existing = await tx.unitMaster.findUnique({ where: { code } });
      const data = {
        code,
        name,
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.unitMaster.update({ where: { id: existing.id }, data })
        : await tx.unitMaster.create({ data });

      importedUnitIds.push(saved.id);
      unitCodeToId.set(code, saved.id);
      unitCodeToName.set(code, saved.name);
      if (existing) counters.satuan.updated += 1;
      else counters.satuan.inserted += 1;
    }
    const deactivatedUnits = await tx.unitMaster.updateMany({
      where: { id: { notIn: importedUnitIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.satuan.deactivated = deactivatedUnits.count;

    for (const row of categoriesRaw) {
      const code = asText(row.kode_kategori)?.toLowerCase();
      const name = asText(row.nama_kategori);
      if (!code || !name) {
        counters.kategori.skipped += 1;
        continue;
      }

      const existing = await tx.productCategory.findFirst({
        where: {
          OR: [{ code }, { name }],
        },
      });
      const data = {
        code,
        name,
        icon: existing?.icon ?? "box",
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.productCategory.update({ where: { id: existing.id }, data })
        : await tx.productCategory.create({ data });

      importedCategoryIds.push(saved.id);
      categoryCodeToId.set(code, saved.id);
      if (existing) counters.kategori.updated += 1;
      else counters.kategori.inserted += 1;
    }
    const deactivatedCategories = await tx.productCategory.updateMany({
      where: { id: { notIn: importedCategoryIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.kategori.deactivated = deactivatedCategories.count;

    for (const row of finishingsRaw) {
      const code = asText(row.kode_finishing)?.toLowerCase();
      const name = asText(row.nama_finishing);
      if (!code || !name) {
        counters.finishing.skipped += 1;
        continue;
      }

      const existing = await tx.finishingMaster.findUnique({ where: { code } });
      const data = {
        code,
        name,
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.finishingMaster.update({ where: { id: existing.id }, data })
        : await tx.finishingMaster.create({ data });

      importedFinishingIds.push(saved.id);
      finishingCodeToId.set(code, saved.id);
      finishingIdToName.set(saved.id, saved.name);
      if (existing) counters.finishing.updated += 1;
      else counters.finishing.inserted += 1;
    }
    const deactivatedFinishings = await tx.finishingMaster.updateMany({
      where: { id: { notIn: importedFinishingIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.finishing.deactivated = deactivatedFinishings.count;

    for (const row of serviceMaterialsRaw) {
      const code = asText(row.kode_material)?.toLowerCase();
      const name = asText(row.nama_material);
      if (!code || !name) {
        counters.materialJasa.skipped += 1;
        continue;
      }

      const existing = await tx.serviceMaterialMaster.findUnique({ where: { code } });
      const data = {
        code,
        name,
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.serviceMaterialMaster.update({ where: { id: existing.id }, data })
        : await tx.serviceMaterialMaster.create({ data });

      importedServiceMaterialIds.push(saved.id);
      serviceMaterialCodeToId.set(code, saved.id);
      serviceMaterialIdToName.set(saved.id, saved.name);
      if (existing) counters.materialJasa.updated += 1;
      else counters.materialJasa.inserted += 1;
    }
    const deactivatedServiceMaterials = await tx.serviceMaterialMaster.updateMany({
      where: { id: { notIn: importedServiceMaterialIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.materialJasa.deactivated = deactivatedServiceMaterials.count;

    for (const row of framesRaw) {
      const code = asText(row.kode_rangka)?.toLowerCase();
      const name = asText(row.nama_rangka);
      if (!code || !name) {
        counters.rangka.skipped += 1;
        continue;
      }

      const existing = await tx.frameMaster.findUnique({ where: { code } });
      const data = {
        code,
        name,
        minStock: asDecimal(row.stok_min),
        buyPrice: asInt(row.harga_beli),
        stock: asDecimal(row.stok),
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.frameMaster.update({ where: { id: existing.id }, data })
        : await tx.frameMaster.create({ data });

      importedFrameIds.push(saved.id);
      frameCodeToId.set(code, saved.id);
      if (existing) counters.rangka.updated += 1;
      else counters.rangka.inserted += 1;
    }
    const deactivatedFrames = await tx.frameMaster.updateMany({
      where: { id: { notIn: importedFrameIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.rangka.deactivated = deactivatedFrames.count;

    for (const row of materialsRaw) {
      const code = asText(row.kode_bahan)?.toLowerCase();
      const name = asText(row.nama_bahan);
      if (!code || !name) {
        counters.bahan.skipped += 1;
        continue;
      }

      const costPrice = asInt(row.harga_beli) ?? 0;
      const minStock = asDecimal(row.stok_min) ?? new Prisma.Decimal(0);
      const stock = asDecimal(row.stok) ?? new Prisma.Decimal(0);

      const existing = await tx.material.findFirst({
        where: { OR: [{ code }, { name }] },
      });

      const data = {
        code,
        name,
        unit: existing?.unit ?? "unit",
        costPrice,
        sellingPrice: existing?.sellingPrice ?? Math.max(costPrice, 0),
        currentStock: stock,
        minStock,
        lastRestocked: new Date(),
        isActive: true,
        deletedAt: null as Date | null,
      };

      const saved = existing
        ? await tx.material.update({ where: { id: existing.id }, data })
        : await tx.material.create({ data });

      importedMaterialIds.push(saved.id);
      materialCodeToId.set(code, saved.id);
      materialIdToName.set(saved.id, saved.name);
      materialCostById.set(saved.id, saved.costPrice);
      if (existing) counters.bahan.updated += 1;
      else counters.bahan.inserted += 1;
    }
    const deactivatedMaterials = await tx.material.updateMany({
      where: { id: { notIn: importedMaterialIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.bahan.deactivated = deactivatedMaterials.count;

    for (const row of productsRaw) {
      const code = asText(row.kode_produk)?.toLowerCase();
      const name = asText(row.nama_produk);
      const legacyNumber = asInt(row.id_produk);
      const categoryCode = asText(row.kode_kategori)?.toLowerCase();
      const unitCode = asText(row.kode_satuan)?.toLowerCase();
      if (!code || !name || !legacyNumber || !categoryCode) {
        counters.produk.skipped += 1;
        continue;
      }
      const categoryId = categoryCodeToId.get(categoryCode);
      if (!categoryId) {
        counters.produk.skipped += 1;
        warnings.push(`Produk ${code} di-skip: kategori ${categoryCode} tidak ditemukan`);
        continue;
      }

      const unitId = unitCode ? unitCodeToId.get(unitCode) ?? null : null;
      const unitName = unitCode ? unitCodeToName.get(unitCode) ?? "pcs" : "pcs";
      const pricingUnit = pricingFromUnitName(unitName);
      const hasCustomSize = pricingUnit === PricingUnit.per_meter || pricingUnit === PricingUnit.per_cm;
      const existing = await tx.product.findFirst({
        where: {
          OR: [{ code }, { legacyNumber }, { AND: [{ name }, { categoryId }] }],
        },
      });

      const data = {
        code,
        legacyNumber,
        name,
        categoryId,
        unitId,
        pricingUnit,
        hasCustomSize,
        customWidth: hasCustomSize ? new Prisma.Decimal(1) : null,
        customHeight: hasCustomSize ? new Prisma.Decimal(1) : null,
        finishingCost: 0,
        estimatedMinutes: existing?.estimatedMinutes ?? 0,
        isActive: true,
        deletedAt: null as Date | null,
      };

      const saved = existing
        ? await tx.product.update({ where: { id: existing.id }, data })
        : await tx.product.create({ data });

      importedProductIds.push(saved.id);
      productLegacyToId.set(legacyNumber, saved.id);
      productIdToName.set(saved.id, saved.name);
      if (existing) counters.produk.updated += 1;
      else counters.produk.inserted += 1;
    }
    const deactivatedProducts = await tx.product.updateMany({
      where: { id: { notIn: importedProductIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.produk.deactivated = deactivatedProducts.count;

    for (const row of variantsRaw) {
      const code = asText(row.kode_varian)?.toLowerCase();
      const legacyProductNumber = asInt(row.id_produk);
      const materialCode = asText(row.kode_bahan)?.toLowerCase();
      const finishingCode = asText(row.kode_finishing)?.toLowerCase();
      const unitCode = asText(row.kode_satuan)?.toLowerCase();
      if (!code || !legacyProductNumber || !materialCode) {
        counters.varian.skipped += 1;
        continue;
      }

      const productId = productLegacyToId.get(legacyProductNumber);
      const materialId = materialCodeToId.get(materialCode);
      if (!productId || !materialId) {
        counters.varian.skipped += 1;
        warnings.push(`Varian ${code} di-skip: relasi produk/bahan tidak valid`);
        continue;
      }

      const finishingId = finishingCode ? finishingCodeToId.get(finishingCode) ?? null : null;
      const unitId = unitCode ? unitCodeToId.get(unitCode) ?? null : null;
      const productName = productIdToName.get(productId) ?? "Produk";
      const materialName = materialIdToName.get(materialId) ?? "Bahan";
      const finishingName = finishingId ? finishingIdToName.get(finishingId) ?? "Finishing" : "Tanpa Finishing";
      const variantName = `${productName} - ${materialName} - ${finishingName}`;
      const sellingPrice = asInt(row.harga_jual) ?? 0;
      const minimumOrder = Math.max(asInt(row.minimal_order) ?? 1, 1);
      const estimateText = asText(row.estimasi);
      const costPrice = materialCostById.get(materialId) ?? 0;

      const existing = await tx.productMaterialVariant.findUnique({ where: { code } });
      const data = {
        code,
        productId,
        materialId,
        unitId,
        finishingId,
        name: variantName,
        costPrice,
        sellingPrice,
        minimumOrder,
        estimateText,
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.productMaterialVariant.update({ where: { id: existing.id }, data })
        : await tx.productMaterialVariant.create({ data });

      importedVariantIds.push(saved.id);
      if (existing) counters.varian.updated += 1;
      else counters.varian.inserted += 1;
    }
    const deactivatedVariants = await tx.productMaterialVariant.updateMany({
      where: { id: { notIn: importedVariantIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.varian.deactivated = deactivatedVariants.count;

    for (const row of servicesRaw) {
      const rawCode = asText(row.kode_jasa)?.toLowerCase();
      const code = rawCode ? normalizeJasaCode(rawCode) : null;
      const legacyProductNumber = asInt(row.id_produk);
      const categoryCode = asText(row.kode_kategori)?.toLowerCase();
      const unitCode = asText(row.kode_satuan)?.toLowerCase();
      const serviceMaterialCode = asText(row.kode_material)?.toLowerCase();
      const finishingCode = asText(row.kode_finishing)?.toLowerCase();
      if (!code || !legacyProductNumber || !categoryCode || !unitCode || !serviceMaterialCode || !finishingCode) {
        counters.jasa.skipped += 1;
        continue;
      }

      const productId = productLegacyToId.get(legacyProductNumber);
      const categoryId = categoryCodeToId.get(categoryCode);
      const unitId = unitCodeToId.get(unitCode);
      const serviceMaterialId = serviceMaterialCodeToId.get(serviceMaterialCode);
      const finishingId = finishingCodeToId.get(finishingCode);
      if (!productId || !categoryId || !unitId || !serviceMaterialId || !finishingId) {
        counters.jasa.skipped += 1;
        warnings.push(`Jasa ${code} di-skip: relasi tidak valid`);
        continue;
      }

      const existing = await tx.serviceCatalog.findUnique({ where: { code } });
      const data = {
        code,
        productId,
        categoryId,
        unitId,
        serviceMaterialId,
        finishingId,
        sellingPrice: asInt(row.harga_jual) ?? 0,
        estimateText: asText(row.estimasi),
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.serviceCatalog.update({ where: { id: existing.id }, data })
        : await tx.serviceCatalog.create({ data });

      importedServiceIds.push(saved.id);
      if (existing) counters.jasa.updated += 1;
      else counters.jasa.inserted += 1;
    }
    const deactivatedServices = await tx.serviceCatalog.updateMany({
      where: { id: { notIn: importedServiceIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.jasa.deactivated = deactivatedServices.count;

    for (const row of displaysRaw) {
      const code = asText(row.kode_display)?.toLowerCase();
      const name = asText(row.nama_display);
      const legacyProductNumber = asInt(row.id_produk);
      const categoryCode = asText(row.kode_kategori)?.toLowerCase();
      const unitCode = asText(row.kode_satuan)?.toLowerCase();
      const frameCode = asText(row.kode_rangka)?.toLowerCase();
      const materialCode = asText(row.kode_bahan)?.toLowerCase();
      const finishingCode = asText(row.kode_finishing)?.toLowerCase();

      if (!code || !name || !legacyProductNumber || !categoryCode || !unitCode || !frameCode || !materialCode || !finishingCode) {
        counters.display.skipped += 1;
        continue;
      }

      if (materialCode === "-") {
        counters.display.skipped += 1;
        warnings.push(`Display ${code} di-skip: kode_bahan "-" tidak valid`);
        continue;
      }

      const productId = productLegacyToId.get(legacyProductNumber);
      const categoryId = categoryCodeToId.get(categoryCode);
      const unitId = unitCodeToId.get(unitCode);
      const frameId = frameCodeToId.get(frameCode);
      const materialId = materialCodeToId.get(materialCode);
      const finishingId = finishingCodeToId.get(finishingCode);

      if (!productId || !categoryId || !unitId || !frameId || !materialId || !finishingId) {
        counters.display.skipped += 1;
        warnings.push(`Display ${code} di-skip: relasi tidak valid`);
        continue;
      }

      const existing = await tx.displayCatalog.findUnique({ where: { code } });
      const data = {
        code,
        name,
        productId,
        categoryId,
        unitId,
        frameId,
        materialId,
        finishingId,
        sellingPrice: asInt(row.harga_jual) ?? 0,
        minimumOrder: Math.max(asInt(row.min_order) ?? 1, 1),
        estimateText: asText(row.estimasi),
        isActive: true,
        deletedAt: null as Date | null,
      };
      const saved = existing
        ? await tx.displayCatalog.update({ where: { id: existing.id }, data })
        : await tx.displayCatalog.create({ data });

      importedDisplayIds.push(saved.id);
      if (existing) counters.display.updated += 1;
      else counters.display.inserted += 1;
    }
    const deactivatedDisplays = await tx.displayCatalog.updateMany({
      where: { id: { notIn: importedDisplayIds }, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    counters.display.deactivated = deactivatedDisplays.count;
  });

  const output = {
    file,
    counters,
    warningCount: warnings.length,
    warnings: warnings.slice(0, 100),
  };

  console.log(JSON.stringify(output, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

