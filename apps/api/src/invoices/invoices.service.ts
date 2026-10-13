import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { consumeDispatchFirst, existenceQty, higherSalePrice, lineAmount, lineProfit, markupPercent, stockFieldsFromBins, voidRestoreSplit } from '@farmaplus/domain';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dateOnly } from '../dates';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

@Injectable()
export class InvoicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async nextNumber() {
    const last = await this.prisma.invoice.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
    return (last?.number ?? 0) + 1;
  }

  private searchWhere(query: InvoiceQueryDto): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {};
    if (query.date) where.date = dateOnly(query.date);
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    const q = query.q?.trim();
    if (q) {
      const asNumber = Number(q);
      where.OR = [
        { clientName: { contains: q, mode: 'insensitive' } },
        { cashierName: { contains: q, mode: 'insensitive' } },
        { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
        { items: { some: { sku: { contains: q, mode: 'insensitive' } } } },
        ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
      ];
    }
    return where;
  }

  async search(query: InvoiceQueryDto) {
    return this.prisma.invoice.findMany({
      where: this.searchWhere(query),
      include: { items: true, client: true },
      orderBy: { number: 'desc' },
      take: 80,
    });
  }

  async recent(query: InvoiceQueryDto) {
    const pageSize = Math.min(query.pageSize || 15, 50);
    const page = query.page || 1;
    const where = this.searchWhere(query);
    const [count, rows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          items: {
            select: { sku: true, productName: true, quantity: true },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      count,
      pageCount: Math.max(1, Math.ceil(count / pageSize)),
      rows,
    };
  }

  async get(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, client: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async create(dto: CreateInvoiceDto, cashier: { sub: number; username: string }) {
    const paymentMethod = dto.paymentMethod === 'Credito' ? 'Credito' : 'Contado';
    const cashAmount = dto.cashAmount ?? 0;
    const cardAmount = dto.cardAmount ?? 0;
    const advanceAmount = dto.advanceAmount ?? 0;

    if (paymentMethod === 'Contado' && cashAmount + cardAmount <= 0) {
      throw new BadRequestException('Indique efectivo o tarjeta');
    }

    const client = dto.clientId
      ? await this.prisma.client.findUnique({ where: { id: dto.clientId } })
      : await this.prisma.client.findFirst({ where: { name: { equals: 'Cliente Generico', mode: 'insensitive' } } });

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((product) => [product.id, product]));

    const reserved = new Map<number, number>();
    const lines = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException(`Producto ${item.productId} no existe`);
      const used = reserved.get(item.productId) || 0;
      const available = existenceQty(Number(product.stock), Number(product.warehouseQty)) - used;
      if (available < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para ${product.name}`);
      }
      reserved.set(item.productId, used + item.quantity);
      const unitPrice = item.unitPrice ?? higherSalePrice(Number(product.salePrice1), Number(product.salePrice2));
      const amount = lineAmount(unitPrice, item.quantity);
      const cost = Number(product.unitPrice) || Number(product.costPrice);
      const profit = lineProfit(unitPrice, cost, item.quantity);
      const percent = markupPercent(unitPrice, cost);
      return { item, product, unitPrice, amount, profit, percent };
    });

    const total = Number(lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2));
    const profit = Number(lines.reduce((sum, line) => sum + line.profit, 0).toFixed(2));

    if (paymentMethod === 'Contado' && cashAmount + cardAmount + 0.009 < total) {
      throw new BadRequestException('El pago no cubre el total');
    }
    if (paymentMethod === 'Credito' && advanceAmount - 0.009 > total) {
      throw new BadRequestException('El adelanto no puede ser mayor al total');
    }

    const issuedAt = paymentMethod === 'Credito' && dto.date ? dateOnly(dto.date) : dateOnly();
    const dueDate = paymentMethod === 'Credito'
      ? (dto.dueDate ? dateOnly(dto.dueDate) : addDays(issuedAt, 30))
      : null;

    return this.prisma.$transaction(async (tx) => {
      const bins = new Map(
        products.map((product) => [
          product.id,
          { dispatch: Number(product.dispatchQty), warehouse: Number(product.warehouseQty) },
        ]),
      );
      const prepared = lines.map((line) => {
        const current = bins.get(line.product.id) || { dispatch: 0, warehouse: 0 };
        const split = consumeDispatchFirst(current.dispatch, current.warehouse, line.item.quantity);
        bins.set(line.product.id, { dispatch: split.dispatchQty, warehouse: split.warehouseQty });
        return { ...line, split };
      });

      const last = await tx.invoice.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
      const number = (last?.number ?? 0) + 1;
      const invoice = await tx.invoice.create({
        data: {
          number,
          clientId: client?.id,
          clientName: dto.clientName || client?.name || 'Cliente Generico',
          clientAddress: dto.clientAddress || client?.address || 'Desconocido',
          paymentMethod,
          date: issuedAt,
          dueDate,
          total,
          cashierId: cashier.sub,
          cashierName: cashier.username,
          profit,
          status: paymentMethod === 'Credito' ? InvoiceStatus.CREDIT : InvoiceStatus.PAID,
          cashAmount,
          cardAmount,
          advanceAmount,
          items: {
            create: prepared.map((line) => ({
              productId: line.product.id,
              sku: line.product.sku,
              productName: line.product.name,
              brand: line.product.brand,
              quantity: line.item.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
              profit: line.profit,
              percent: line.percent,
              supplier: line.product.supplier,
              fromDispatch: line.split.fromDispatch,
              fromWarehouse: line.split.fromWarehouse,
            })),
          },
        },
        include: { items: true, client: true },
      });

      const seen = new Set<number>();
      for (const line of prepared) {
        if (seen.has(line.product.id)) continue;
        seen.add(line.product.id);
        const next = bins.get(line.product.id);
        if (!next) continue;
        await tx.product.update({
          where: { id: line.product.id },
          data: stockFieldsFromBins(next.dispatch, next.warehouse),
        });
      }

      if (paymentMethod === 'Contado') {
        await tx.cashEntry.create({
          data: {
            userName: cashier.username,
            invoiceNumber: String(number),
            income: cashAmount,
            card: cardAmount,
            date: issuedAt,
          },
        });
      }

      return invoice;
    });
  }

  async addPayment(id: number, amount: number) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status !== InvoiceStatus.CREDIT) {
      throw new BadRequestException('Solo se abonan facturas de crédito abiertas');
    }
    const total = Number(invoice.total);
    const current = Number(invoice.advanceAmount);
    const nextAdvance = Number((current + amount).toFixed(2));
    if (nextAdvance - total > 0.009) {
      throw new BadRequestException('El abono supera el saldo');
    }
    const paid = nextAdvance >= total - 0.009;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          advanceAmount: Math.min(nextAdvance, total),
          status: paid ? InvoiceStatus.PAID : InvoiceStatus.CREDIT,
          cashAmount: paid ? total : invoice.cashAmount,
        },
      });
      await tx.cashEntry.create({
        data: {
          userName: invoice.cashierName,
          invoiceNumber: String(invoice.number),
          income: amount,
          date: dateOnly(),
        },
      });
      return updated;
    });
  }

  async voidInvoice(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('La factura ya está anulada');
    }
    return this.prisma.$transaction(async (tx) => {
      const bins = new Map<number, { dispatch: number; warehouse: number }>();
      for (const item of invoice.items) {
        if (!item.productId || !item.product) continue;
        const split = voidRestoreSplit({
          quantity: Number(item.quantity),
          fromDispatch: Number(item.fromDispatch),
          fromWarehouse: Number(item.fromWarehouse),
          unitPrice: Number(item.unitPrice),
          salePrice1: Number(item.product.salePrice1),
          salePrice2: Number(item.product.salePrice2),
        });
        const current = bins.get(item.productId) || {
          dispatch: Number(item.product.dispatchQty),
          warehouse: Number(item.product.warehouseQty),
        };
        const next = stockFieldsFromBins(
          current.dispatch + split.fromDispatch,
          current.warehouse + split.fromWarehouse,
        );
        bins.set(item.productId, { dispatch: next.dispatchQty, warehouse: next.warehouseQty });
      }
      for (const [productId, next] of bins) {
        await tx.product.update({
          where: { id: productId },
          data: stockFieldsFromBins(next.dispatch, next.warehouse),
        });
      }
      if (invoice.paymentMethod === 'Credito') {
        const entries = await tx.cashEntry.findMany({
          where: { invoiceNumber: String(invoice.number) },
        });
        const received = entries.reduce(
          (sum, row) => sum + Number(row.income) + Number(row.card) - Number(row.returnExpense),
          0,
        );
        if (received > 0.009) {
          await tx.cashEntry.create({
            data: {
              userName: invoice.cashierName,
              invoiceNumber: String(invoice.number),
              returnExpense: Number(received.toFixed(2)),
              date: dateOnly(),
            },
          });
        }
      } else {
        await tx.cashEntry.create({
          data: {
            userName: invoice.cashierName,
            invoiceNumber: String(invoice.number),
            returnExpense: Number(invoice.total),
            date: dateOnly(),
          },
        });
      }
      return tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.VOID },
        include: { items: true, client: true },
      });
    });
  }
}
