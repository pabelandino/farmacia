import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { InvoiceStatus, PrismaClient, UserRole } from '@prisma/client';
import { inferSoldByUnit, markupPercent } from '@farmaplus/domain';
import { backupsDir } from '../backups-dir';

const execFileAsync = promisify(execFile);

export type EtlProgress = (step: string, extra?: Record<string, unknown>) => void;

function text(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function uniqueCatalogNames(values: unknown[]) {
  return [...new Set(values.map((value) => text(value)).filter(Boolean))].map((name) => ({ name }));
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

function flag(value: unknown) {
  return text(value) === '1';
}

function mssqlConfig() {
  return {
    server: process.env.MSSQL_SERVER || 'localhost',
    port: Number(process.env.MSSQL_PORT || 1433),
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'FarmaPlus_Restore_2026!',
    database: process.env.MSSQL_DATABASE || 'FarmaPlusV2',
    options: { encrypt: true, trustServerCertificate: true },
    requestTimeout: 600000,
  };
}

async function resetSeq(prisma: PrismaClient, table: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
  );
}

export async function collectCounts(prisma: PrismaClient) {
  const [
    users, clients, products, invoices, items, intakes, cashEntries, transfers,
    inventoryHistory, productChangeLogs, productDeleteLogs, productSnapshots,
    payables, supplierPayments, suppliers, creditRecords, receipts, writeOffs, exchangeRates,
    company, appConfig, intakeLines,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.product.count(),
    prisma.invoice.count(),
    prisma.invoiceItem.count(),
    prisma.intake.count(),
    prisma.cashEntry.count(),
    prisma.transfer.count(),
    prisma.inventoryHistory.count(),
    prisma.productChangeLog.count(),
    prisma.productDeleteLog.count(),
    prisma.productSnapshot.count(),
    prisma.payable.count(),
    prisma.supplierPayment.count(),
    prisma.supplier.count(),
    prisma.creditRecord.count(),
    prisma.receipt.count(),
    prisma.writeOff.count(),
    prisma.exchangeRate.count(),
    prisma.company.count(),
    prisma.appConfig.count(),
    prisma.intakeLine.count(),
  ]);
  return {
    users, clients, products, invoices, items, intakes, intakeLines, cashEntries, transfers,
    inventoryHistory, productChangeLogs, productDeleteLogs, productSnapshots,
    payables, supplierPayments, suppliers, creditRecords, receipts, writeOffs, exchangeRates,
    company, appConfig,
  };
}

export async function runLegacyEtl(prisma: PrismaClient, onProgress: EtlProgress = () => undefined) {
  const password = process.env.TEMP_USER_PASSWORD || 'FarmaPlus2026!';
  const hash = await bcrypt.hash(password, 10);
  onProgress('Conectando a SQL Server...');
  const pool = await sql.connect(mssqlConfig());

  onProgress('Vaciando tablas operativas de PostgreSQL...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      invoice_items, invoices, intake_lines, intakes, cash_entries, transfers,
      inventory_history, product_change_logs, product_delete_logs, product_snapshots,
      payables, supplier_payments, suppliers, credit_records, receipts, write_offs,
      product_brands, product_categories, products, clients, users, exchange_rates, company, app_config
    RESTART IDENTITY CASCADE
  `);

  onProgress('Migrando usuarios...');
  const users = (await pool.request().query(`SELECT * FROM USUARIO`)).recordset;
  await prisma.user.createMany({
    data: users.map((row) => ({
      id: row.Id,
      code: text(row.Codigo) || String(row.Id),
      username: text(row.Usuario) || `user${row.Id}`,
      passwordHash: hash,
      role: text(row.Rango).toUpperCase() === 'ADMINISTRADOR' ? UserRole.ADMIN : UserRole.CASHIER,
      address: text(row.Direccion) || null,
      phone: text(row.Telefono) || null,
      permissions: {
        users: flag(row.OpUsuario),
        clients: flag(row.OpCliente),
        suppliers: flag(row.OpProveedor),
        quotes: flag(row.OpCotizaciones),
        inventory: flag(row.OpInventario),
        creditInvoice: flag(row.OpFacturaCredito),
        cashInvoice: flag(row.OpFacturaContado),
        headers: flag(row.OpEncabezados),
        productSearch: flag(row.OpBusquedaProducto),
        importInventory: flag(row.OpImportInvent),
        clearDb: flag(row.OpLimpiarBD),
        payables: flag(row.OpCtasPagar),
        receivables: flag(row.OpCtasCobrar),
        reports: flag(row.OpReportes),
        expenses: flag(row.OpGastos),
        editInvoice: flag(row.OpEditarFactura),
        deleteInvoice: flag(row.OpEliminarFactura),
        exchangeRate: flag(row.OpTipoCambio),
        cashOpen: flag(row.OpAperturaCaja),
        writeOffs: flag(row.OpBajaProductos),
        inventoryHistory: flag(row.OpHistorialInventario),
      },
    })),
  });

  onProgress('Migrando clientes y proveedores...');
  const clients = (await pool.request().query(`SELECT * FROM CLIENTES`)).recordset;
  if (clients.length) {
    await prisma.client.createMany({
      data: clients.map((row) => ({
        id: row.Id,
        code: text(row.CodigoCliente) || String(row.Id),
        name: text(row.NombresApellidos) || 'Cliente',
        address: text(row.Direccion) || null,
        phone: text(row.Telefono) || null,
        cell: text(row.Celular) || null,
        nationalId: text(row.Cedula) || null,
      })),
    });
  }
  const suppliers = (await pool.request().query(`SELECT * FROM PROVEEDORES`)).recordset;
  if (suppliers.length) {
    await prisma.supplier.createMany({
      data: suppliers.map((row) => ({
        id: row.Id,
        code: Number(row.CodigoProveedor || 0),
        name: text(row.Proveedor) || 'Proveedor',
        line: text(row.Linea) || null,
        contact: text(row.Responsable) || null,
        address: text(row.Direccion) || null,
        email: text(row.EMail) || null,
        phone: text(row.Telefono) || null,
      })),
    });
  }

  onProgress('Migrando productos...');
  const products = (await pool.request().query(`SELECT * FROM PRODUCTOS`)).recordset;
  await prisma.product.createMany({
    data: products.map((row) => {
      const costPrice = money(row.PrecioCompra);
      const unitPrice = money(row.PrecioUnidad);
      const salePrice1 = money(row.PrecioVenta1);
      const unitsPerBox = Number(row.UnidadesCaja || 0);
      return {
        id: row.Id,
        sku: text(row.CodigoProducto),
        name: text(row.Producto) || 'Sin nombre',
        generic: text(row.Generico) || null,
        brand: text(row.Marca) || null,
        line: text(row.Linea) || null,
        unit: text(row.UM) || null,
        costPrice,
        unitPrice,
        salePrice1,
        salePrice2: money(row.PrecioVenta2),
        stock: money(row.Existencia),
        supplier: text(row.Proveedor) || null,
        minQty: Number(row.CantidadMinima || 0),
        maxQty: Number(row.CantidadMaxima || 0),
        unitsPerBox,
        soldByUnit: inferSoldByUnit({ salePrice: salePrice1, unitCost: unitPrice, costPrice, unitsPerBox }),
        dispatchQty: money(row.Despacho),
        warehouseQty: money(row.Bodega),
      };
    }),
  });
  await prisma.productBrand.createMany({
    data: uniqueCatalogNames(products.map((row) => row.Marca)),
    skipDuplicates: true,
  });
  await prisma.productCategory.createMany({
    data: uniqueCatalogNames(products.map((row) => row.Linea)),
    skipDuplicates: true,
  });
  const productBySku = new Map(products.filter((row) => text(row.CodigoProducto)).map((row) => [text(row.CodigoProducto), row.Id as number]));

  onProgress('Migrando facturas...');
  const invoices = (await pool.request().query(`
    SELECT Id, Cliente, CodigoFactura, FormaPago, Fecha, Total, Facturador, Ganancia, Estado, Efectivo, Tarjeta
    FROM FACTURAS
  `)).recordset;
  const invoiceNumberToId = new Map<number, number>();
  for (let i = 0; i < invoices.length; i += 2000) {
    const batch = invoices.slice(i, i + 2000).map((row) => {
      const number = Number.parseInt(text(row.CodigoFactura), 10) || row.Id;
      if (!invoiceNumberToId.has(number)) invoiceNumberToId.set(number, row.Id);
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
    onProgress('Migrando facturas...', { done: Math.min(i + 2000, invoices.length), total: invoices.length });
  }

  onProgress('Migrando detalle de ventas...');
  const details = (await pool.request().query(`
    SELECT Id, CodigoFactura, CodigoProducto, Producto, Marca, Cantidad, Precio, Importe, Ganancia, Proveedor, Porcentaje
    FROM DETALLE_VENTAS
  `)).recordset;
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
    if (batch.length) await prisma.invoiceItem.createMany({ data: batch });
    onProgress('Migrando detalle de ventas...', { done: Math.min(i + 3000, details.length), total: details.length });
  }

  onProgress('Migrando caja...');
  const cash = (await pool.request().query(`SELECT * FROM CAJA_DETALLE`)).recordset;
  for (let i = 0; i < cash.length; i += 3000) {
    await prisma.cashEntry.createMany({
      data: cash.slice(i, i + 3000).map((row) => ({
        userName: text(row.Usuario) || null,
        invoiceNumber: text(row.NumeroFactura) || null,
        income: money(row.Ingresos),
        operatingExpense: money(row.EgresosOperativos),
        returnExpense: money(row.EgresosDevoluciones),
        card: money(row.Tarjeta),
        cardAuth: text(row.TarjetaAutorizacion) || null,
        date: asDate(row.Fecha),
      })),
    });
    onProgress('Migrando caja...', { done: Math.min(i + 3000, cash.length), total: cash.length });
  }

  onProgress('Migrando ingresos, traslados e historial...');
  const entradas = (await pool.request().query(`SELECT * FROM ENTRADAS_PRODUCTOS`)).recordset;
  let skippedIntakes = 0;
  const intakeRows = [];
  const intakeLineRows = [];
  for (const row of entradas) {
    const sku = text(row.CodigoProducto);
    const productId = productBySku.get(sku);
    if (!productId) {
      skippedIntakes += 1;
      continue;
    }
    const unitCost = money(row.PrecioUnidad) || money(row.PrecioCompra);
    const sale1 = money(row.PrecioVenta1);
    const qty = money(row.CantidadEntrada);
    const amount = money(row.Total) || unitCost * qty;
    intakeRows.push({
      id: row.Id as number,
      documentNumber: text(row.NumeroFactura) || '0',
      purchaseOrder: text(row.OrdenCompra) || null,
      billedAs: text(row.Facturado) || 'Entrada',
      supplier: text(row.Proveedor) || 'N/D',
      date: asDate(row.Fecha),
      userName: 'migracion',
      total: amount,
    });
    intakeLineRows.push({
      intakeId: row.Id as number,
      productId,
      sku,
      productName: text(row.Producto) || 'Producto',
      line: text(row.Linea) || null,
      unit: text(row.UM) || 'Unidad',
      quantity: qty,
      costPrice: money(row.PrecioCompra),
      unitsPerBox: 1,
      unitCost,
      salePrice1: sale1,
      salePrice2: money(row.PrecioVenta2) || sale1,
      utilityPercent: markupPercent(sale1, unitCost),
      lot: text(row.Lote) || null,
      expiresAt: row.Vencimiento ? asDate(row.Vencimiento) : null,
      destination: 'dispatch',
      amount,
    });
  }
  for (let i = 0; i < intakeRows.length; i += 2000) {
    await prisma.intake.createMany({ data: intakeRows.slice(i, i + 2000) });
    onProgress('Migrando ingresos...', { done: Math.min(i + 2000, intakeRows.length), total: intakeRows.length });
  }
  for (let i = 0; i < intakeLineRows.length; i += 3000) {
    await prisma.intakeLine.createMany({ data: intakeLineRows.slice(i, i + 3000) });
  }

  const transfers = (await pool.request().query(`SELECT * FROM TRASLADOS`)).recordset;
  if (transfers.length) {
    await prisma.transfer.createMany({
      data: transfers.map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        productName: text(row.Producto) || null,
        sender: text(row.Envia) || null,
        origin: text(row.Origen) || null,
        destination: text(row.Destino) || null,
        quantity: Number(row.Cantidad || 0),
        receiver: text(row.Recibe) || null,
        reason: text(row.Motivo) || null,
        date: asDate(row.Fecha),
      })),
    });
  }

  const history = (await pool.request().query(`SELECT * FROM HISTORIAL_INVENTARIO`)).recordset;
  if (history.length) {
    await prisma.inventoryHistory.createMany({
      data: history.map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        productName: text(row.Producto) || null,
        brand: text(row.Marca) || null,
        supplier: text(row.Proveedor) || null,
        costPrice: money(row.PrecioCompra),
        salePrice: money(row.PrecioVenta),
        stockStart: Number(row.Existenciainicial || 0),
        entries: Number(row.Entradas || 0),
        exits: Number(row.Salidas || 0),
        writeOffs: Number(row.BajasProductos || 0),
        stockEnd: Number(row.ExistenciaFinal || 0),
      })),
    });
  }

  onProgress('Migrando créditos, recibos, bajas y cuentas...');
  const credits = (await pool.request().query(`SELECT * FROM CREDITOS`)).recordset;
  if (credits.length) {
    await prisma.creditRecord.createMany({
      data: credits.map((row) => ({
        id: row.Id,
        clientCode: text(row.CodigoCliente) || null,
        clientName: text(row.Cliente) || '',
        invoiceNumber: Number(row.NFactura || 0),
        billedAt: row.FechaFacturado ? asDate(row.FechaFacturado) : null,
        dueAt: row.FechaPago ? asDate(row.FechaPago) : null,
        status: text(row.Estado) || null,
        amount: money(row.Monto),
        cashierName: text(row.Facturador) || null,
      })),
    });
  }
  const receipts = (await pool.request().query(`SELECT * FROM RECIBOS`)).recordset;
  if (receipts.length) {
    await prisma.receipt.createMany({
      data: receipts.map((row) => ({
        id: row.Id,
        clientCode: row.CodigoCliente == null ? null : Number(row.CodigoCliente),
        clientName: text(row.Cliente) || '',
        invoiceNumber: row.Factura == null ? null : Number(row.Factura),
        concept: text(row.Concepto) || null,
        amount: money(row.Monto),
        date: row.Fecha ? asDate(row.Fecha) : null,
      })),
    });
  }
  const bajas = (await pool.request().query(`SELECT * FROM BAJAS_PRODUCTOS`)).recordset;
  if (bajas.length) {
    await prisma.writeOff.createMany({
      data: bajas.map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        name: text(row.Producto) || null,
        brand: text(row.Marca) || null,
        quantity: Number(row.Cantidad || 0),
        reason: text(row.Motivo) || null,
        userName: text(row.Usuario) || null,
        date: row.Fecha ? asDate(row.Fecha) : null,
      })),
    });
  }
  const payables = (await pool.request().query(`SELECT * FROM CTASPAGAR`)).recordset;
  if (payables.length) {
    await prisma.payable.createMany({
      data: payables.map((row) => ({
        id: row.Id,
        supplier: text(row.Proveedor) || null,
        concept: text(row.Concepto) || null,
        invoiceNumber: text(row.Factura) || null,
        balance: money(row.Saldo),
        purchaseOrder: text(row.OrdenCompra) || null,
        purchasedAt: row.FechaCompra ? asDate(row.FechaCompra) : null,
        dueAt: row.FechaPago ? asDate(row.FechaPago) : null,
        status: text(row.Estado) || null,
      })),
    });
  }
  const payments = (await pool.request().query(`SELECT * FROM PAGOS_PROVEEDORES`)).recordset;
  if (payments.length) {
    await prisma.supplierPayment.createMany({
      data: payments.map((row) => ({
        id: row.Id,
        supplier: text(row.Proveedor) || null,
        invoiceNumber: row.Factura == null ? null : Number(row.Factura),
        concept: text(row.Concepto) || null,
        amount: money(row.Abono),
        date: row.Fecha ? asDate(row.Fecha) : null,
      })),
    });
  }

  onProgress('Migrando bitácoras de productos...');
  const updates = (await pool.request().query(`SELECT * FROM ACTUALIZADOS`)).recordset;
  for (let i = 0; i < updates.length; i += 3000) {
    await prisma.productChangeLog.createMany({
      data: updates.slice(i, i + 3000).map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        name: text(row.Producto) || null,
        userName: text(row.Usuario) || null,
        date: row.Fecha ? asDate(row.Fecha) : null,
      })),
    });
  }
  const deleted = (await pool.request().query(`SELECT * FROM BORRADOS`)).recordset;
  if (deleted.length) {
    await prisma.productDeleteLog.createMany({
      data: deleted.map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        name: text(row.Producto) || null,
        userName: text(row.Usuario) || null,
        date: row.Fecha ? asDate(row.Fecha) : null,
      })),
    });
  }
  const snapshots = (await pool.request().query(`SELECT * FROM BKP_PRODUCTOS`)).recordset;
  if (snapshots.length) {
    await prisma.productSnapshot.createMany({
      data: snapshots.map((row) => ({
        id: row.Id,
        sku: text(row.CodigoProducto) || null,
        name: text(row.Producto) || null,
        generic: text(row.Generico) || null,
        brand: text(row.Marca) || null,
        line: text(row.Linea) || null,
        unit: text(row.UM) || null,
        costPrice: money(row.PrecioCompra),
        unitPrice: money(row.PrecioUnidad),
        salePrice1: money(row.PrecioVenta1),
        salePrice2: money(row.PrecioVenta2),
        stock: money(row.Existencia),
        supplier: text(row.Proveedor) || null,
        minQty: Number(row.CantidadMinima || 0),
        maxQty: Number(row.CantidadMaxima || 0),
        unitsPerBox: Number(row.UnidadesCaja || 0),
        dispatchQty: money(row.Despacho),
        warehouseQty: money(row.Bodega),
      })),
    });
  }

  onProgress('Migrando configuración y tipo de cambio...');
  const rate = (await pool.request().query(`SELECT TOP 1 TipoCambio FROM TIPO_CAMBIO`)).recordset[0];
  await prisma.exchangeRate.create({ data: { rate: money(rate?.TipoCambio) || 36.2 } });
  const header = (await pool.request().query(`SELECT TOP 1 * FROM ENCABEZADOS`)).recordset[0];
  if (header) {
    await prisma.company.create({
      data: {
        name: text(header.Empresa) || 'Farmacia',
        address: text(header.Direccion) || null,
        phone: text(header.Telefono) || null,
        ruc: text(header.RUC) || null,
        line1: text(header.Linea1) || null,
        line2: text(header.Linea2) || null,
      },
    });
  }
  const config = (await pool.request().query(`SELECT * FROM CONFIGURACION`)).recordset[0];
  const registro = (await pool.request().query(`SELECT * FROM REGISTRO`)).recordset[0];
  await prisma.appConfig.create({
    data: {
      theme: text(config?.Tema) || null,
      startedAt: config?.Inicial ? asDate(config.Inicial) : null,
      client: text(registro?.Cliente) || null,
      business: text(registro?.Comercio) || null,
    },
  });

  for (const table of [
    'users', 'clients', 'products', 'invoices', 'invoice_items', 'intakes', 'intake_lines',
    'cash_entries', 'transfers', 'inventory_history', 'product_change_logs', 'product_delete_logs',
    'product_snapshots', 'payables', 'supplier_payments', 'suppliers', 'credit_records',
    'receipts', 'write_offs', 'exchange_rates', 'company', 'app_config',
  ]) {
    await resetSeq(prisma, table);
  }

  const counts = await collectCounts(prisma);
  await pool.close();
  onProgress('Migración completa', { counts, skippedIntakes, tempPassword: password });
  return { counts, skippedIntakes, tempPassword: password };
}

async function mssqlCmd(query: string, timeout = 120000) {
  const password = process.env.MSSQL_PASSWORD || 'FarmaPlus_Restore_2026!';
  const { stdout, stderr } = await execFileAsync(
    'docker',
    [
      'exec',
      'elsasoft-mssql',
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S', 'localhost',
      '-U', 'sa',
      '-P', password,
      '-C',
      '-W',
      '-s', '|',
      '-Q', query,
    ],
    { timeout, maxBuffer: 20 * 1024 * 1024 },
  );
  return `${stdout}\n${stderr}`;
}

export async function restoreSqlBak(backupFileName: string, onProgress: EtlProgress = () => undefined) {
  onProgress('Verificando el .bak en SQL Server...');
  const hostFile = join(backupsDir(), backupFileName);
  if (!existsSync(hostFile)) {
    throw new Error(`El .bak no está en la carpeta backups (SQL Server no puede verlo): ${backupFileName}`);
  }
  const bakPath = `/var/opt/mssql/backup/${backupFileName}`;
  try {
    await execFileAsync('docker', ['exec', 'elsasoft-mssql', 'test', '-f', bakPath], { timeout: 15000 });
  } catch {
    throw new Error(`SQL Server no ve el archivo en ${bakPath}. Confirme que Docker está encendido y el volumen backups montado.`);
  }
  onProgress('Leyendo archivos lógicos del .bak...');
  const listOut = await mssqlCmd(`RESTORE FILELISTONLY FROM DISK = N'${bakPath}'`);
  const data = listOut.split('\n').map((line) => line.split('|').map((part) => part.trim()));
  const logical = data.filter((cols) => cols[2] === 'D' || cols[2] === 'L');
  const dataFile = logical.find((cols) => cols[2] === 'D')?.[0] || 'FarmaPlusV2';
  const logFile = logical.find((cols) => cols[2] === 'L')?.[0] || 'FarmaPlusV2_log';
  onProgress('Cerrando conexiones de SQL Server...');
  await mssqlCmd(
    `IF DB_ID(N'FarmaPlusV2') IS NOT NULL ALTER DATABASE [FarmaPlusV2] SET SINGLE_USER WITH ROLLBACK IMMEDIATE`,
  );
  onProgress(`Restaurando FarmaPlusV2 (${dataFile} / ${logFile})...`);
  try {
    await mssqlCmd(
      `RESTORE DATABASE [FarmaPlusV2] FROM DISK = N'${bakPath}' WITH REPLACE, MOVE N'${dataFile}' TO N'/var/opt/mssql/data/FarmaPlusV2.mdf', MOVE N'${logFile}' TO N'/var/opt/mssql/data/FarmaPlusV2_log.ldf'`,
      600000,
    );
  } finally {
    try {
      await mssqlCmd(`IF DB_ID(N'FarmaPlusV2') IS NOT NULL ALTER DATABASE [FarmaPlusV2] SET MULTI_USER`);
    } catch {
      // Restore may have failed before the database existed.
    }
  }
  onProgress('RESTORE de SQL Server listo');
}
