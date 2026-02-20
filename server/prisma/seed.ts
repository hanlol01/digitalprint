import { PrismaClient, PricingUnit, UserRole } from "@prisma/client";
import { config } from "dotenv";
import { hashPassword } from "../src/utils/password";

config();

const prisma = new PrismaClient();

const seedUsers = async (): Promise<void> => {
  const users = [
    {
      username: process.env.OWNER_SEED_USERNAME ?? "owner",
      password: process.env.OWNER_SEED_PASSWORD ?? "owner123",
      role: UserRole.owner,
    },
    {
      username: process.env.ADMIN_SEED_USERNAME ?? "admin",
      password: process.env.ADMIN_SEED_PASSWORD ?? "admin123",
      role: UserRole.admin,
    },
    {
      username: process.env.KASIR_SEED_USERNAME ?? "kasir",
      password: process.env.KASIR_SEED_PASSWORD ?? "kasir123",
      role: UserRole.kasir,
    },
    {
      username: process.env.OPERATOR_SEED_USERNAME ?? "operator",
      password: process.env.OPERATOR_SEED_PASSWORD ?? "operator123",
      role: UserRole.operator,
    },
  ];

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        passwordHash,
        role: user.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        username: user.username,
        passwordHash,
        role: user.role,
        isActive: true,
        mustChangePassword: true,
      },
    });
  }
};

const seedMasterData = async (): Promise<void> => {
  const categories = [
    { name: "Print A4/A3", icon: "\u{1F5A8}\uFE0F" },
    { name: "Banner & Spanduk", icon: "\u{1F3F7}\uFE0F" },
    { name: "Stiker & Vinyl", icon: "\u{1F4CB}" },
    { name: "Kartu Nama", icon: "\u{1F4B3}" },
    { name: "Brosur & Flyer", icon: "\u{1F4C4}" },
    { name: "Cetak Foto", icon: "\u{1F4F8}" },
    { name: "Jilid & Laminating", icon: "\u{1F4DA}" },
    { name: "Custom Order", icon: "\u{2728}" },
  ];

  const categoryMap = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.productCategory.upsert({
      where: { name: category.name },
      update: { icon: category.icon, isActive: true, deletedAt: null },
      create: category,
    });
    categoryMap.set(category.name, row.id);
  }

  const materials = [
    { name: "Tinta Cyan", unit: "ml", stock: 500, min: 200, costPrice: 1000, sellingPrice: 1200 },
    { name: "Tinta Magenta", unit: "ml", stock: 500, min: 200, costPrice: 1000, sellingPrice: 1200 },
    { name: "Tinta Yellow", unit: "ml", stock: 500, min: 200, costPrice: 1000, sellingPrice: 1200 },
    { name: "Tinta Black", unit: "ml", stock: 500, min: 200, costPrice: 1000, sellingPrice: 1200 },
    { name: "Flexi China 280gsm", unit: "meter", stock: 80, min: 20, costPrice: 25000, sellingPrice: 35000 },
    { name: "HVS 80gsm", unit: "lembar", stock: 2000, min: 500, costPrice: 1200, sellingPrice: 1500 },
  ];

  const materialMap = new Map<string, string>();
  for (const material of materials) {
    const row = await prisma.material.upsert({
      where: { name: material.name },
      update: {
        unit: material.unit,
        costPrice: material.costPrice,
        sellingPrice: material.sellingPrice,
        currentStock: material.stock,
        minStock: material.min,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: material.name,
        unit: material.unit,
        costPrice: material.costPrice,
        sellingPrice: material.sellingPrice,
        currentStock: material.stock,
        minStock: material.min,
        lastRestocked: new Date(),
      },
    });
    materialMap.set(material.name, row.id);
  }

  const products = [
    {
      name: "Print A4 Warna",
      categoryName: "Print A4/A3",
      pricingUnit: PricingUnit.per_lembar,
      hasCustomSize: false,
      customWidth: null,
      customHeight: null,
      finishingCost: 0,
      estimatedMinutes: 5,
      variants: [
        {
          name: "HVS 80gsm",
          materialName: "HVS 80gsm",
          costPrice: 1200,
          sellingPrice: 1500,
          recipes: [
            { materialName: "HVS 80gsm", usagePerUnit: 1 },
            { materialName: "Tinta Cyan", usagePerUnit: 0.2 },
            { materialName: "Tinta Magenta", usagePerUnit: 0.2 },
            { materialName: "Tinta Yellow", usagePerUnit: 0.2 },
            { materialName: "Tinta Black", usagePerUnit: 0.2 },
          ],
        },
      ],
    },
    {
      name: "Banner Indoor",
      categoryName: "Banner & Spanduk",
      pricingUnit: PricingUnit.per_meter,
      hasCustomSize: true,
      customWidth: 1,
      customHeight: 1,
      finishingCost: 10000,
      estimatedMinutes: 30,
      variants: [
        {
          name: "Flexi China",
          materialName: "Flexi China 280gsm",
          costPrice: 25000,
          sellingPrice: 35000,
          recipes: [
            { materialName: "Flexi China 280gsm", usagePerUnit: 1 },
            { materialName: "Tinta Cyan", usagePerUnit: 8 },
            { materialName: "Tinta Magenta", usagePerUnit: 8 },
            { materialName: "Tinta Yellow", usagePerUnit: 8 },
            { materialName: "Tinta Black", usagePerUnit: 8 },
          ],
        },
      ],
    },
  ];

  for (const product of products) {
    const categoryId = categoryMap.get(product.categoryName);
    if (!categoryId) continue;

    const existing = await prisma.product.findFirst({ where: { name: product.name, categoryId, deletedAt: null } });
    if (existing) {
      continue;
    }

    const created = await prisma.product.create({
      data: {
        name: product.name,
        categoryId,
        pricingUnit: product.pricingUnit,
        hasCustomSize: product.hasCustomSize,
        customWidth: product.hasCustomSize ? product.customWidth : null,
        customHeight: product.hasCustomSize ? product.customHeight : null,
        finishingCost: product.finishingCost,
        estimatedMinutes: product.estimatedMinutes,
      },
    });
    const productId = created.id;

    for (const variant of product.variants) {
      const materialIdForVariant = materialMap.get(variant.materialName);
      if (!materialIdForVariant) continue;
      const createdVariant = await prisma.productMaterialVariant.create({
        data: {
          productId,
          materialId: materialIdForVariant,
          name: variant.name,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
        },
      });

      for (const recipe of variant.recipes) {
        const materialId = materialMap.get(recipe.materialName);
        if (!materialId) continue;
        await prisma.variantMaterialRecipe.create({
          data: {
            variantId: createdVariant.id,
            materialId,
            usagePerUnit: recipe.usagePerUnit,
          },
        });
      }
    }
  }
};

async function main(): Promise<void> {
  await seedUsers();
  await seedMasterData();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

