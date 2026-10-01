import { Inject, Injectable } from '@nestjs/common';
import { allocateLotRemainings, expiryStatus, expiryWindow, inventoryLineValue, splitPack, sumInventoryValues } from '@farmaplus/domain';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async sales(date = new Date().toISOString().slice(0, 10)) {
    const day = new Date(`${date}T00:00:00.000Z`);
    const invoices = await this.prisma.invoice.findMany({
      where: { date: day },
      include: { items: true },
      orderBy: { number: 'asc' },
    });
    const paid = invoices.filter((invoice) => invoice.status === InvoiceStatus.PAID);
    const voided = invoices.filter((invoice) => invoice.status === InvoiceStatus.VOID);
    const credit = invoices.filter((invoice) => invoice.status === InvoiceStatus.CREDIT);
    const total = paid.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    const cash = paid.reduce((sum, invoice) => sum + Number(invoice.cashAmount), 0);
    const card = paid.reduce((sum, invoice) => sum + Number(invoice.cardAmount), 0);
    const profit = paid.reduce((sum, invoice) => sum + Number(invoice.profit), 0);
    const creditTotal = credit.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    return {
      date,
      count: paid.length,
      voided: voided.length,
      creditCount: credit.length,
      total: Number(total.toFixed(2)),
      cash: Number(cash.toFixed(2)),
      card: Number(card.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      creditTotal: Number(creditTotal.toFixed(2)),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        clientName: invoice.clientName,
        cashierName: invoice.cashierName,
        total: invoice.total,
        cashAmount: invoice.cashAmount,
        cardAmount: invoice.cardAmount,
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
      })),
    };
  }

  async cash(date = new Date().toISOString().slice(0, 10)) {
    const day = new Date(`${date}T00:00:00.000Z`);
    const rows = await this.prisma.cashEntry.findMany({
      where: { date: day },
      orderBy: { id: 'asc' },
    });
    const income = rows.reduce((sum, row) => sum + Number(row.income), 0);
    const card = rows.reduce((sum, row) => sum + Number(row.card), 0);
    const operating = rows.reduce((sum, row) => sum + Number(row.operatingExpense), 0);
    const returns = rows.reduce((sum, row) => sum + Number(row.returnExpense), 0);
    return {
      date,
      count: rows.length,
      income: Number(income.toFixed(2)),
      card: Number(card.toFixed(2)),
      operatingExpense: Number(operating.toFixed(2)),
      returnExpense: Number(returns.toFixed(2)),
      net: Number((income + card - operating - returns).toFixed(2)),
      rows,
    };
  }

  async stock() {
    const [count, lowStock] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.$queryRaw<
        Array<{ id: number; sku: string; name: string; stock: number; minQty: number }>
      >`SELECT id, sku, name, stock, "minQty" FROM products WHERE stock <= "minQty" ORDER BY stock ASC LIMIT 200`,
    ]);
    return {
      count,
      lowStockCount: lowStock.length,
      lowStock,
    };
  }

  async dashboard(days = 14) {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const expiry = expiryWindow(new Date().toISOString().slice(0, 10));
    const expiryWhere: Prisma.IntakeLineWhereInput = {
      expiresAt: {
        gte: new Date(`${expiry.from}T00:00:00.000Z`),
        lte: new Date(`${expiry.to}T00:00:00.000Z`),
      },
    };

    const [invoices, lowStockCount, productCount, creditOpen, expiredLotRows] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { date: { gte: from }, status: { not: InvoiceStatus.VOID } },
        select: {
          date: true,
          total: true,
          paymentMethod: true,
          status: true,
          profit: true,
          cashAmount: true,
          cardAmount: true,
        },
      }),
      this.prisma.$queryRaw<Array<{ c: bigint }>>`SELECT COUNT(*)::bigint AS c FROM products WHERE stock <= "minQty"`.then((rows) => Number(rows[0]?.c || 0)),
      this.prisma.product.count(),
      this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.CREDIT },
        select: { total: true, advanceAmount: true },
      }),
      this.prisma.intakeLine.findMany({
        where: expiryWhere,
        include: {
          intake: { select: { supplier: true, date: true, documentNumber: true } },
          product: { select: { stock: true, warehouseQty: true } },
        },
        orderBy: { expiresAt: 'asc' },
      }),
    ]);

    const emptyDay = () => ({ cash: 0, credit: 0, profit: 0, invoices: 0, cashPay: 0, cardPay: 0 });
    const byDay = new Map<string, ReturnType<typeof emptyDay>>();
    for (let i = 0; i < days; i++) {
      const day = new Date(from);
      day.setUTCDate(from.getUTCDate() + i);
      byDay.set(day.toISOString().slice(0, 10), emptyDay());
    }
    let cashTotal = 0;
    let creditTotal = 0;
    let cashPayTotal = 0;
    let cardPayTotal = 0;
    for (const invoice of invoices) {
      const key = new Date(invoice.date).toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      const amount = Number(invoice.total);
      if (!bucket) continue;
      bucket.invoices += 1;
      bucket.profit += Number(invoice.profit);
      bucket.cashPay += Number(invoice.cashAmount);
      bucket.cardPay += Number(invoice.cardAmount);
      cashPayTotal += Number(invoice.cashAmount);
      cardPayTotal += Number(invoice.cardAmount);
      if (invoice.paymentMethod === 'Credito' || invoice.status === InvoiceStatus.CREDIT) {
        bucket.credit += amount;
        creditTotal += amount;
      } else {
        bucket.cash += amount;
        cashTotal += amount;
      }
    }

    const top = await this.prisma.invoiceItem.groupBy({
      by: ['productName'],
      where: { invoice: { date: { gte: from }, status: InvoiceStatus.PAID } },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 15,
    });

    const receivable = creditOpen.reduce((sum, row) => sum + Number(row.total) - Number(row.advanceAmount), 0);
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = byDay.get(todayKey) || emptyDay();
    const remainingByLot = await this.remainingByLineId(expiredLotRows.map((row) => row.productId));
    const openExpired = expiredLotRows
      .map((row) => this.mapExpiredLot(row, expiry.to, remainingByLot.get(row.id) ?? 0))
      .filter((row) => row.remaining > 0);

    return {
      days,
      todaySales: Number((today.cash + today.credit).toFixed(2)),
      cashTotal: Number(cashTotal.toFixed(2)),
      creditTotal: Number(creditTotal.toFixed(2)),
      receivable: Number(receivable.toFixed(2)),
      productCount,
      lowStockCount,
      expiredCount: openExpired.length,
      expiredFrom: expiry.from,
      expiredTo: expiry.to,
      expiredProducts: openExpired.slice(0, 15),
      salesByDay: [...byDay.entries()].map(([date, values]) => ({
        date,
        cash: Number(values.cash.toFixed(2)),
        credit: Number(values.credit.toFixed(2)),
        profit: Number(values.profit.toFixed(2)),
        invoices: values.invoices,
        cashPay: Number(values.cashPay.toFixed(2)),
        cardPay: Number(values.cardPay.toFixed(2)),
      })),
      mix: [
        { name: 'Contado', value: Number(cashTotal.toFixed(2)) },
        { name: 'Crédito', value: Number(creditTotal.toFixed(2)) },
      ],
      paymentMix: {
        cash: Number(cashPayTotal.toFixed(2)),
        card: Number(cardPayTotal.toFixed(2)),
        credit: Number(creditTotal.toFixed(2)),
      },
      stockHealth: {
        ok: Math.max(0, productCount - lowStockCount),
        low: lowStockCount,
      },
      topProducts: top.map((row) => ({
        name: row.productName,
        quantity: Number(row._sum.quantity || 0),
        amount: Number(Number(row._sum.amount || 0).toFixed(2)),
      })),
    };
  }

  async receivables() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.CREDIT },
      orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    });
    const rows = invoices.map((invoice) => {
      const total = Number(invoice.total);
      const advance = Number(invoice.advanceAmount);
      return {
        id: invoice.id,
        number: invoice.number,
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        date: invoice.date,
        dueDate: invoice.dueDate,
        total,
        advance,
        balance: Number((total - advance).toFixed(2)),
        cashierName: invoice.cashierName,
      };
    }).filter((row) => row.balance > 0.009);

    const clients = new Map<string, { clientName: string; invoices: number; total: number; advance: number; balance: number }>();
    for (const row of rows) {
      const current = clients.get(row.clientName) || { clientName: row.clientName, invoices: 0, total: 0, advance: 0, balance: 0 };
      current.invoices += 1;
      current.total += row.total;
      current.advance += row.advance;
      current.balance += row.balance;
      clients.set(row.clientName, current);
    }

    return {
      totalBalance: Number(rows.reduce((sum, row) => sum + row.balance, 0).toFixed(2)),
      invoiceCount: rows.length,
      clients: [...clients.values()].map((row) => ({
        ...row,
        total: Number(row.total.toFixed(2)),
        advance: Number(row.advance.toFixed(2)),
        balance: Number(row.balance.toFixed(2)),
      })),
      invoices: rows,
    };
  }

  async payables() {
    const rows = await this.prisma.payable.findMany({
      where: { balance: { gt: 0 } },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
    });
    const mapped = rows.map((row) => ({
      id: row.id,
      supplier: row.supplier || 'Sin proveedor',
      concept: row.concept || '',
      invoiceNumber: row.invoiceNumber || '',
      purchaseOrder: row.purchaseOrder || '',
      purchasedAt: row.purchasedAt ? row.purchasedAt.toISOString().slice(0, 10) : '',
      dueAt: row.dueAt ? row.dueAt.toISOString().slice(0, 10) : '',
      status: row.status || '',
      balance: Number(row.balance),
    }));
    const suppliers = new Map<string, { supplier: string; invoices: number; balance: number }>();
    for (const row of mapped) {
      const current = suppliers.get(row.supplier) || { supplier: row.supplier, invoices: 0, balance: 0 };
      current.invoices += 1;
      current.balance += row.balance;
      suppliers.set(row.supplier, current);
    }
    return {
      totalBalance: Number(mapped.reduce((sum, row) => sum + row.balance, 0).toFixed(2)),
      count: mapped.length,
      suppliers: [...suppliers.values()].map((row) => ({
        ...row,
        balance: Number(row.balance.toFixed(2)),
      })),
      rows: mapped,
    };
  }

  async inventory(query: { q?: string; page?: number; pageSize?: number; all?: boolean } = {}) {
    const q = query.q?.trim();
    const where = q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
            { unit: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 50));
    const page = Math.max(1, query.page || 1);
    const valueSelect = {
      stock: true,
      dispatchQty: true,
      warehouseQty: true,
      costPrice: true,
      unitPrice: true,
      unitsPerBox: true,
      salePrice1: true,
      salePrice2: true,
    } as const;
    const [count, products, valueSource] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        ...(query.all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
      query.all
        ? Promise.resolve(null)
        : this.prisma.product.findMany({ where, select: valueSelect }),
    ]);
    const rows = products.map((product) => {
      const stock = Number(product.stock);
      const pack = splitPack(stock, product.unitsPerBox);
      const value = inventoryLineValue({
        stock,
        dispatchQty: Number(product.dispatchQty),
        warehouseQty: Number(product.warehouseQty),
        costPrice: Number(product.costPrice),
        unitPrice: Number(product.unitPrice),
        unitsPerBox: product.unitsPerBox,
        salePrice1: Number(product.salePrice1),
        salePrice2: Number(product.salePrice2),
      });
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        unitsPerBox: product.unitsPerBox,
        stock,
        dispatchQty: Number(product.dispatchQty),
        warehouseQty: Number(product.warehouseQty),
        minQty: product.minQty,
        boxes: pack.boxes,
        loose: pack.loose,
        unitCost: value.unitCost,
        unitSale: value.unitSale,
        costAmount: value.costAmount,
        saleAmount: value.saleAmount,
        profitAmount: value.profitAmount,
      };
    });
    const totals = sumInventoryValues(
      (valueSource ?? products).map((product) => inventoryLineValue({
        stock: Number(product.stock),
        dispatchQty: Number(product.dispatchQty),
        warehouseQty: Number(product.warehouseQty),
        costPrice: Number(product.costPrice),
        unitPrice: Number(product.unitPrice),
        unitsPerBox: product.unitsPerBox,
        salePrice1: Number(product.salePrice1),
        salePrice2: Number(product.salePrice2),
      })),
    );
    return {
      count,
      totalStock: totals.existence,
      totalCost: totals.costAmount,
      totalSale: totals.saleAmount,
      totalProfit: totals.profitAmount,
      page: query.all ? 1 : page,
      pageSize: query.all ? count : pageSize,
      pageCount: query.all ? 1 : Math.max(1, Math.ceil(count / pageSize)),
      products: rows,
    };
  }

  async salesLines(query: { from?: string; to?: string; q?: string; page?: number; pageSize?: number; all?: boolean } = {}) {
    const range = this.dayRange(query.from, query.to);
    const q = query.q?.trim();
    const invoiceNumber = q && /^\d+$/.test(q) ? Number(q) : null;
    const where: Prisma.InvoiceItemWhereInput = {
      invoice: {
        date: { gte: range.from, lte: range.to },
        status: { not: InvoiceStatus.VOID },
      },
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: 'insensitive' } },
              { productName: { contains: q, mode: 'insensitive' } },
              { brand: { contains: q, mode: 'insensitive' } },
              { invoice: { clientName: { contains: q, mode: 'insensitive' } } },
              { invoice: { cashierName: { contains: q, mode: 'insensitive' } } },
              ...(invoiceNumber != null ? [{ invoice: { number: invoiceNumber } }] : []),
            ],
          }
        : {}),
    };
    const page = this.pageOpts(query);
    const [lineCount, sums, invoiceGroups, rows] = await Promise.all([
      this.prisma.invoiceItem.count({ where }),
      this.prisma.invoiceItem.aggregate({
        where,
        _sum: { quantity: true, amount: true, profit: true },
      }),
      this.prisma.invoiceItem.groupBy({ by: ['invoiceId'], where }),
      this.prisma.invoiceItem.findMany({
        where,
        include: { invoice: true },
        orderBy: [{ invoice: { number: 'asc' } }, { id: 'asc' }],
        ...(query.all ? {} : { skip: page.skip, take: page.pageSize }),
      }),
    ]);
    const totalSale = Number(sums._sum.amount || 0);
    const totalProfit = Number(sums._sum.profit || 0);
    return {
      from: range.fromKey,
      to: range.toKey,
      lineCount,
      invoiceCount: invoiceGroups.length,
      totalQty: this.money(sums._sum.quantity),
      totalSale: this.money(totalSale),
      totalProfit: this.money(totalProfit),
      marginPct: totalSale > 0 ? this.money((totalProfit / totalSale) * 100) : 0,
      page: query.all ? 1 : page.page,
      pageSize: query.all ? lineCount : page.pageSize,
      pageCount: query.all ? 1 : Math.max(1, Math.ceil(lineCount / page.pageSize)),
      rows: rows.map((row) => ({
        id: row.id,
        number: row.invoice.number,
        clientName: row.invoice.clientName,
        sku: row.sku,
        productName: row.productName,
        brand: row.brand,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        amount: Number(row.amount),
        profit: Number(row.profit),
        paymentMethod: row.invoice.paymentMethod,
        cashAmount: Number(row.invoice.cashAmount),
        cardAmount: Number(row.invoice.cardAmount),
        cashierName: row.invoice.cashierName,
        date: row.invoice.date.toISOString().slice(0, 10),
      })),
    };
  }

  async invoicesList(query: { from?: string; to?: string; q?: string; page?: number; pageSize?: number; all?: boolean } = {}) {
    const range = this.dayRange(query.from, query.to);
    const q = query.q?.trim();
    const invoiceNumber = q && /^\d+$/.test(q) ? Number(q) : null;
    const where: Prisma.InvoiceWhereInput = {
      date: { gte: range.from, lte: range.to },
      ...(q
        ? {
            OR: [
              { clientName: { contains: q, mode: 'insensitive' } },
              { cashierName: { contains: q, mode: 'insensitive' } },
              { paymentMethod: { contains: q, mode: 'insensitive' } },
              { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
              { items: { some: { sku: { contains: q, mode: 'insensitive' } } } },
              ...(invoiceNumber != null ? [{ number: invoiceNumber }] : []),
            ],
          }
        : {}),
    };
    const soldWhere: Prisma.InvoiceWhereInput = { ...where, status: { not: InvoiceStatus.VOID } };
    const page = this.pageOpts(query);
    const [count, paidCount, voidedCount, creditCount, sold, cashCard, creditSum, rows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.count({ where: { ...where, status: InvoiceStatus.PAID } }),
      this.prisma.invoice.count({ where: { ...where, status: InvoiceStatus.VOID } }),
      this.prisma.invoice.count({ where: { ...where, status: InvoiceStatus.CREDIT } }),
      this.prisma.invoice.aggregate({
        where: soldWhere,
        _sum: { total: true, profit: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: InvoiceStatus.PAID },
        _sum: { cashAmount: true, cardAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: InvoiceStatus.CREDIT },
        _sum: { total: true },
      }),
      this.prisma.invoice.findMany({
        where,
        include: {
          items: {
            select: { sku: true, productName: true, quantity: true },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { number: 'asc' },
        ...(query.all ? {} : { skip: page.skip, take: page.pageSize }),
      }),
    ]);
    const totalSale = Number(sold._sum.total || 0);
    const soldCount = paidCount + creditCount;
    return {
      from: range.fromKey,
      to: range.toKey,
      count,
      paidCount,
      voidedCount,
      creditCount,
      totalSale: this.money(totalSale),
      totalProfit: this.money(sold._sum.profit),
      cashTotal: this.money(cashCard._sum.cashAmount),
      cardTotal: this.money(cashCard._sum.cardAmount),
      creditTotal: this.money(creditSum._sum.total),
      avgTicket: soldCount > 0 ? this.money(totalSale / soldCount) : 0,
      page: query.all ? 1 : page.page,
      pageSize: query.all ? count : page.pageSize,
      pageCount: query.all ? 1 : Math.max(1, Math.ceil(count / page.pageSize)),
      rows: rows.map((row) => ({
        id: row.id,
        number: row.number,
        clientName: row.clientName,
        items: row.items.map((item) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: Number(item.quantity),
        })),
        total: Number(row.total),
        profit: Number(row.profit),
        paymentMethod: row.paymentMethod,
        status: row.status,
        date: row.date.toISOString().slice(0, 10),
        cashierName: row.cashierName,
        cashAmount: Number(row.cashAmount),
        cardAmount: Number(row.cardAmount),
      })),
    };
  }

  async expiredProducts(query: { from?: string; to?: string; q?: string; page?: number; pageSize?: number; all?: boolean } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const defaults = expiryWindow(today);
    const range = this.dayRange(query.from || defaults.from, query.to || defaults.to);
    const q = query.q?.trim();
    const where: Prisma.IntakeLineWhereInput = {
      expiresAt: { gte: range.from, lte: range.to },
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: 'insensitive' } },
              { productName: { contains: q, mode: 'insensitive' } },
              { brand: { contains: q, mode: 'insensitive' } },
              { lot: { contains: q, mode: 'insensitive' } },
              { intake: { supplier: { contains: q, mode: 'insensitive' } } },
              { intake: { documentNumber: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const page = this.pageOpts(query);
    const [count, qtySum, productGroups, expiredCount, rows] = await Promise.all([
      this.prisma.intakeLine.count({ where }),
      this.prisma.intakeLine.aggregate({ where, _sum: { quantity: true } }),
      this.prisma.intakeLine.groupBy({ by: ['productId'], where }),
      this.prisma.intakeLine.count({
        where: {
          ...where,
          expiresAt: { gte: range.from, lt: new Date(`${today}T00:00:00.000Z`) },
        },
      }),
      this.prisma.intakeLine.findMany({
        where,
        include: {
          intake: { select: { supplier: true, date: true, documentNumber: true } },
          product: { select: { stock: true, warehouseQty: true, unit: true } },
        },
        orderBy: [{ expiresAt: 'asc' }, { sku: 'asc' }],
        ...(query.all ? {} : { skip: page.skip, take: page.pageSize }),
      }),
    ]);
    const remainingByLot = await this.remainingByLineId(rows.map((row) => row.productId));
    const mapped = rows.map((row) => this.mapExpiredLot(row, today, remainingByLot.get(row.id) ?? 0));
    return {
      from: range.fromKey,
      to: range.toKey,
      count,
      productCount: productGroups.length,
      expiredCount,
      totalQty: Number(Number(qtySum._sum.quantity || 0).toFixed(2)),
      page: query.all ? 1 : page.page,
      pageSize: query.all ? count : page.pageSize,
      pageCount: query.all ? 1 : Math.max(1, Math.ceil(count / page.pageSize)),
      rows: mapped,
    };
  }

  private async remainingByLineId(productIds: number[]) {
    const ids = [...new Set(productIds.filter(Boolean))];
    const remaining = new Map<number, number>();
    if (!ids.length) return remaining;
    const [products, lines] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, stock: true, warehouseQty: true },
      }),
      this.prisma.intakeLine.findMany({
        where: { productId: { in: ids } },
        select: { id: true, productId: true, quantity: true, expiresAt: true },
      }),
    ]);
    const stockByProduct = new Map(products.map((row) => [row.id, Number(row.stock) + Number(row.warehouseQty)]));
    const linesByProduct = new Map<number, typeof lines>();
    for (const line of lines) {
      const current = linesByProduct.get(line.productId) || [];
      current.push(line);
      linesByProduct.set(line.productId, current);
    }
    for (const [productId, productLines] of linesByProduct) {
      for (const lot of allocateLotRemainings(
        productLines.map((row) => ({
          id: row.id,
          quantity: Number(row.quantity),
          expiresAt: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : null,
        })),
        stockByProduct.get(productId) || 0,
      )) {
        remaining.set(lot.id, lot.remaining);
      }
    }
    return remaining;
  }

  private mapExpiredLot(
    row: {
      id: number;
      sku: string;
      productName: string;
      lot: string | null;
      expiresAt: Date | null;
      quantity: Prisma.Decimal | number;
      destination: string;
      intake: { supplier: string; date: Date; documentNumber: string };
      product: { stock: Prisma.Decimal | number; warehouseQty?: Prisma.Decimal | number; unit?: string | null } | null;
    },
    asOfIso: string,
    remaining: number,
  ) {
    const expiresAt = row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : '';
    return {
      id: row.id,
      sku: row.sku,
      productName: row.productName,
      lot: row.lot || '',
      expiresAt,
      status: expiresAt ? expiryStatus(expiresAt, asOfIso) : 'expired',
      quantity: Number(row.quantity),
      remaining,
      stock: Number(row.product?.stock || 0) + Number(row.product?.warehouseQty || 0),
      unit: row.product?.unit || '',
      destination: row.destination,
      supplier: row.intake.supplier,
      intakeDate: row.intake.date.toISOString().slice(0, 10),
      documentNumber: row.intake.documentNumber,
    };
  }

  private dayRange(from?: string, to?: string) {
    const fromKey = from || new Date().toISOString().slice(0, 10);
    const toKey = to || fromKey;
    const start = fromKey <= toKey ? fromKey : toKey;
    const end = fromKey <= toKey ? toKey : fromKey;
    return {
      fromKey: start,
      toKey: end,
      from: new Date(`${start}T00:00:00.000Z`),
      to: new Date(`${end}T00:00:00.000Z`),
    };
  }

  private pageOpts(query: { page?: number; pageSize?: number }) {
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 50));
    const page = Math.max(1, query.page || 1);
    return { page, pageSize, skip: (page - 1) * pageSize };
  }

  private money(value: unknown) {
    return Number(Number(value || 0).toFixed(2));
  }
}
