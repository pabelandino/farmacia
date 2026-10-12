import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_UTILITY_PERCENT,
  applyIntakeWithRemaining,
  catalogPricesAfterIntake,
  consumeDispatchFirst,
  intakeTotal,
  nextIntakeBins,
  salePriceFromMarkup,
  stockFieldsFromBins,
  unitCostFromBox,
} from '@farmaplus/domain';
import { Prisma } from '@prisma/client';
import { dateOnly } from '../dates';
import { PrismaService } from '../prisma/prisma.service';
import { IntakeLineDto, IntakeQueryDto, UpsertIntakeDto } from './dto/intake.dto';

function money(value: Prisma.Decimal | number | string) {
  return Number(value);
}

@Injectable()
export class IntakesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  search(query: IntakeQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.IntakeWhereInput = q
      ? {
          OR: [
            { documentNumber: { contains: q, mode: 'insensitive' } },
            { supplier: { contains: q, mode: 'insensitive' } },
            { lines: { some: { productName: { contains: q, mode: 'insensitive' } } } },
            { lines: { some: { sku: { contains: q, mode: 'insensitive' } } } },
            ...(Number.isInteger(Number(q)) ? [{ id: Number(q) }] : []),
          ],
        }
      : {};
    return this.prisma.intake.findMany({
      where,
      include: { lines: true },
      orderBy: { id: 'desc' },
      take: 80,
    });
  }

  async get(id: number) {
    const intake = await this.prisma.intake.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });
    if (!intake) throw new NotFoundException('Ingreso no encontrado');
    return intake;
  }

  create(dto: UpsertIntakeDto, userName: string) {
    return this.prisma.$transaction((tx) => this.persist(tx, dto, userName));
  }

  async update(id: number, dto: UpsertIntakeDto, userName: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.intake.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!current) throw new NotFoundException('Ingreso no encontrado');
      for (const line of current.lines) {
        await this.applyStock(tx, line.productId, -money(line.quantity), line.destination);
      }
      await tx.intakeLine.deleteMany({ where: { intakeId: id } });
      await tx.intake.delete({ where: { id } });
      return this.persist(tx, dto, userName, id);
    });
  }

  private async persist(
    tx: Prisma.TransactionClient,
    dto: UpsertIntakeDto,
    userName: string,
    id?: number,
  ) {
    const prepared = [];
    for (const line of dto.lines) {
        prepared.push(await this.prepareLine(tx, line, dto.supplier));
    }
    const total = prepared.reduce((sum, line) => sum + line.amount, 0);
    const intake = await tx.intake.create({
      data: {
        ...(id ? { id } : {}),
        documentNumber: dto.documentNumber?.trim() || '0',
        purchaseOrder: dto.purchaseOrder || null,
        billedAs: dto.billedAs || 'Entrada',
        supplier: dto.supplier,
        date: dateOnly(dto.date),
        userName,
        total,
        lines: {
          create: prepared.map(({ product, physicalRemaining: _physicalRemaining, ...line }) => ({
            ...line,
            productId: product.id,
          })),
        },
      },
      include: { lines: true },
    });
    for (const line of prepared) {
      await this.applyLineStock(tx, line.product.id, line.quantity, line.destination, line.physicalRemaining);
    }
    return intake;
  }

  private async prepareLine(tx: Prisma.TransactionClient, line: IntakeLineDto, supplier: string) {
    const unitsPerBox = line.unitsPerBox && line.unitsPerBox > 0 ? line.unitsPerBox : 1;
    const unitCost = line.unitCost ?? unitCostFromBox(line.costPrice, unitsPerBox);
    const utility = line.utilityPercent ?? DEFAULT_UTILITY_PERCENT;
    const amount = intakeTotal(unitCost, line.quantity);

    let product = line.productId
      ? await tx.product.findUnique({ where: { id: line.productId } })
      : await tx.product.findFirst({ where: { sku: line.sku } });

    const previousPrice = line.salePrice1
      ?? (product ? Number(product.salePrice1) : salePriceFromMarkup(unitCost, utility));
    const newPrice = line.salePrice2 ?? previousPrice;
    const { destination, salePrice1, salePrice2 } = catalogPricesAfterIntake(previousPrice, newPrice);

    if (!product) {
      product = await tx.product.create({
        data: {
          sku: line.sku,
          name: line.productName,
          generic: line.generic || null,
          brand: line.brand || null,
          line: line.line || null,
          unit: line.unit || 'Unidad',
          costPrice: line.costPrice,
          unitPrice: unitCost,
          salePrice1,
          salePrice2,
          stock: 0,
          supplier,
          unitsPerBox,
        },
      });
    } else {
      product = await tx.product.update({
        where: { id: product.id },
        data: {
          name: line.productName || product.name,
          generic: line.generic ?? product.generic,
          brand: line.brand ?? product.brand,
          line: line.line ?? product.line,
          unit: line.unit ?? product.unit,
          costPrice: line.costPrice,
          unitPrice: unitCost,
          salePrice1,
          salePrice2,
          unitsPerBox,
          supplier,
        },
      });
    }

    return {
      product,
      physicalRemaining: line.physicalRemaining,
      sku: line.sku,
      productName: line.productName,
      generic: line.generic || null,
      brand: line.brand || null,
      line: line.line || null,
      unit: line.unit || 'Unidad',
      quantity: line.quantity,
      costPrice: line.costPrice,
      unitsPerBox,
      unitCost,
      salePrice1: previousPrice,
      salePrice2,
      utilityPercent: utility,
      lot: line.lot || null,
      expiresAt: line.expiresAt ? dateOnly(line.expiresAt) : null,
      destination,
      amount,
    };
  }

  private async applyLineStock(
    tx: Prisma.TransactionClient,
    productId: number,
    qty: number,
    destination: string,
    physicalRemaining?: number,
  ) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const result = applyIntakeWithRemaining(
      Number(product.dispatchQty),
      Number(product.warehouseQty),
      qty,
      destination === 'warehouse' ? 'warehouse' : 'dispatch',
      physicalRemaining,
      product.unitsPerBox,
    );
    if (!result.ok) {
      throw new BadRequestException('No puede quedar más de lo que hay ahora');
    }
    return tx.product.update({
      where: { id: productId },
      data: stockFieldsFromBins(result.bins.dispatch, result.bins.warehouse),
    });
  }

  private async applyStock(
    tx: Prisma.TransactionClient,
    productId: number,
    qty: number,
    destination: string,
  ) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const dispatch = Number(product.dispatchQty);
    const warehouse = Number(product.warehouseQty);
    const dest = destination === 'warehouse' ? 'warehouse' : 'dispatch';
    if (qty >= 0) {
      const next = nextIntakeBins(dispatch, warehouse, qty, dest);
      return tx.product.update({
        where: { id: productId },
        data: stockFieldsFromBins(next.dispatch, next.warehouse),
      });
    }
    const split = consumeDispatchFirst(dispatch, warehouse, -qty);
    return tx.product.update({
      where: { id: productId },
      data: stockFieldsFromBins(split.dispatchQty, split.warehouseQty),
    });
  }
}
