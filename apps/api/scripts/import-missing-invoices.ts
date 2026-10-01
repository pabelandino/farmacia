import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });
import sql from 'mssql';
import { InvoiceStatus, PrismaClient } from '@prisma/client';

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
  if (!value) return new Date('1970-01-01T00:00:00.000Z');
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const iso = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date('1970-01-01T00:00:00.000Z');
  return new Date(`${iso}T00:00:00.000Z`);
}

async function resetSeq(table: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
  );
}

async function main() {
  const database = process.env.MSSQL_COMPARE_DATABASE || 'FarmaPlusCompare';
  console.log(`Reading ${database}`);
  const pool = await sql.connect({
    server: process.env.MSSQL_SERVER || 'localhost',
    port: Number(process.env.MSSQL_PORT || 1433),
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || process.env.MSSQL_SA_PASSWORD || 'FarmaPlus_Restore_2026!',
    database,
    options: { encrypt: true, trustServerCertificate: true },
    requestTimeout: 600000,
  });

  const existing = new Set(
    (await prisma.invoice.findMany({ select: { number: true } })).map((row) => row.number),
  );
  const products = await prisma.product.findMany({ select: { id: true, sku: true } });
  const productBySku = new Map(products.map((row) => [row.sku, row.id]));

  const invoices = (await pool.request().query(`
    SELECT Id, Cliente, CodigoFactura, FormaPago, Fecha, Total, Facturador, Ganancia, Estado, Efectivo, Tarjeta
    FROM FACTURAS
  `)).recordset;

  const missing = invoices.filter((row) => {
    const number = Number.parseInt(text(row.CodigoFactura), 10) || row.Id;
    return !existing.has(number);
  });
  console.log(`FarmaPlus invoices ${invoices.length}, already in Elsa ${existing.size}, to import ${missing.length}`);

  const invoiceNumberToId = new Map<number, number>();
  for (let i = 0; i < missing.length; i += 2000) {
    const batch = missing.slice(i, i + 2000).map((row) => {
      const number = Number.parseInt(text(row.CodigoFactura), 10) || row.Id;
      invoiceNumberToId.set(number, row.Id);
      const pay = text(row.FormaPago) || 'Contado';
      const estado = text(row.Estado).toUpperCase();
      const isCredit = pay.toUpperCase().includes('CREDIT');
      return {
        id: row.Id as number,
        number,
        clientName: text(row.Cliente) || 'Cliente Generico',
        paymentMethod: pay,
        date: asDate(row.Fecha),
        total: money(row.Total),
        cashierName: text(row.Facturador),
        profit: money(row.Ganancia),
        status: estado === 'ANULADO' ? InvoiceStatus.VOID : isCredit ? InvoiceStatus.CREDIT : InvoiceStatus.PAID,
        cashAmount: money(row.Efectivo),
        cardAmount: money(row.Tarjeta),
      };
    });
    await prisma.invoice.createMany({ data: batch });
    console.log(`invoices ${Math.min(i + 2000, missing.length)}/${missing.length}`);
  }

  const numbers = [...invoiceNumberToId.keys()];
  if (!numbers.length) {
    console.log('Nothing to import');
    await pool.close();
    return;
  }

  const details = (await pool.request().query(`
    SELECT Id, CodigoFactura, CodigoProducto, Producto, Marca, Cantidad, Precio, Importe, Ganancia, Proveedor, Porcentaje
    FROM DETALLE_VENTAS
    WHERE TRY_CONVERT(int, CodigoFactura) >= ${Math.min(...numbers)}
  `)).recordset;

  let importedItems = 0;
  for (let i = 0; i < details.length; i += 3000) {
    const batch = [];
    for (const row of details.slice(i, i + 3000)) {
      const invoiceId = invoiceNumberToId.get(Number.parseInt(text(row.CodigoFactura), 10));
      if (!invoiceId) continue;
      batch.push({
        id: row.Id as number,
        invoiceId,
        productId: productBySku.get(text(row.CodigoProducto)) ?? null,
        sku: text(row.CodigoProducto),
        productName: text(row.Producto) || 'Producto',
        brand: text(row.Marca) || null,
        quantity: money(row.Cantidad),
        unitPrice: money(row.Precio),
        amount: money(row.Importe),
        profit: money(row.Ganancia),
        percent: money(row.Porcentaje),
        supplier: text(row.Proveedor) || null,
      });
    }
    if (batch.length) {
      await prisma.invoiceItem.createMany({ data: batch, skipDuplicates: true });
      importedItems += batch.length;
    }
    console.log(`items ${Math.min(i + 3000, details.length)}/${details.length}`);
  }

  await resetSeq('invoices');
  await resetSeq('invoice_items');
  await pool.close();
  console.log(`Done. Imported ${missing.length} invoices and ${importedItems} lines.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
