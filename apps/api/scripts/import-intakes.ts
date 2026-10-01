import 'dotenv/config';
import sql from 'mssql';
import { PrismaClient } from '@prisma/client';
import { markupPercent } from '@farmaplus/domain';

const prisma = new PrismaClient();

function text(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function money(value: unknown) {
  if (value == null || value === '') return 0;
  return Number(value);
}

function asDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const iso = String(value).slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

async function main() {
  const pool = await sql.connect({
    server: process.env.MSSQL_SERVER || 'localhost',
    port: Number(process.env.MSSQL_PORT || 1433),
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'FarmaPlus_Restore_2026!',
    database: process.env.MSSQL_DATABASE || 'FarmaPlusV2',
    options: { encrypt: true, trustServerCertificate: true },
  });

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE intake_lines, intakes RESTART IDENTITY CASCADE`);

  const products = await prisma.product.findMany({ select: { id: true, sku: true } });
  const productBySku = new Map(products.map((row) => [row.sku, row.id]));

  const rows = (
    await pool.request().query(`
      SELECT Id, CodigoProducto, Producto, UM, Proveedor, NumeroFactura, OrdenCompra, Facturado, Linea,
             CantidadEntrada, PrecioCompra, PrecioUnidad, PrecioVenta1, PrecioVenta2, Lote, Vencimiento, Fecha, Total
      FROM ENTRADAS_PRODUCTOS
    `)
  ).recordset;

  let skipped = 0;
  for (const row of rows) {
    const sku = text(row.CodigoProducto);
    const productId = productBySku.get(sku);
    if (!productId) {
      skipped += 1;
      continue;
    }
    const unitCost = money(row.PrecioUnidad) || money(row.PrecioCompra);
    const sale1 = money(row.PrecioVenta1);
    await prisma.intake.create({
      data: {
        id: row.Id,
        documentNumber: text(row.NumeroFactura) || '0',
        purchaseOrder: text(row.OrdenCompra) || null,
        billedAs: text(row.Facturado) || 'Entrada',
        supplier: text(row.Proveedor) || 'N/D',
        date: asDate(row.Fecha) || new Date('1970-01-01T00:00:00.000Z'),
        userName: 'migracion',
        total: money(row.Total) || unitCost * money(row.CantidadEntrada),
        lines: {
          create: {
            productId,
            sku,
            productName: text(row.Producto) || 'Producto',
            brand: null,
            line: text(row.Linea) || null,
            unit: text(row.UM) || 'Unidad',
            quantity: money(row.CantidadEntrada),
            costPrice: money(row.PrecioCompra),
            unitsPerBox: 1,
            unitCost,
            salePrice1: sale1,
            salePrice2: money(row.PrecioVenta2) || sale1,
            utilityPercent: markupPercent(sale1, unitCost),
            lot: text(row.Lote) || null,
            expiresAt: asDate(row.Vencimiento),
            destination: 'dispatch',
            amount: money(row.Total) || unitCost * money(row.CantidadEntrada),
          },
        },
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('intakes','id'), COALESCE((SELECT MAX(id) FROM intakes), 1))`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('intake_lines','id'), COALESCE((SELECT MAX(id) FROM intake_lines), 1))`,
  );

  console.log(`Intakes imported: ${await prisma.intake.count()} (skipped ${skipped} without product sku)`);
  await pool.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
