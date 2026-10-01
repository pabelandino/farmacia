import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { writeOffFullBoxes } from '@farmaplus/domain';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWriteOffDto, WriteOffQueryDto } from './dto/write-off.dto';

function dateOnly(value?: string) {
  if (value) return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

@Injectable()
export class WriteOffsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(query: WriteOffQueryDto) {
    const pageSize = Math.min(query.pageSize || 15, 50);
    const page = query.page || 1;
    const q = query.q?.trim();
    const where: Prisma.WriteOffWhereInput = q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { reason: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [count, rows] = await Promise.all([
      this.prisma.writeOff.count({ where }),
      this.prisma.writeOff.findMany({
        where,
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

  async create(dto: CreateWriteOffDto, userName: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const result = writeOffFullBoxes(
      Number(product.dispatchQty),
      Number(product.warehouseQty),
      product.unitsPerBox,
      dto.boxes,
    );
    if (!result.ok) {
      const messages = {
        tooManyBoxes: 'No puede dar de baja más cajas de las que hay completas',
        boxesRequired: 'Indique cuántas cajas completas va a dar de baja',
      };
      throw new BadRequestException(messages[result.error] || 'No se pudo dar de baja');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: result.fromDispatch },
          dispatchQty: { decrement: result.fromDispatch },
          warehouseQty: { decrement: result.fromWarehouse },
        },
      });
      return tx.writeOff.create({
        data: {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          quantity: result.units,
          boxes: result.boxes,
          unitsPerBox: product.unitsPerBox || 1,
          fromDispatch: result.fromDispatch,
          fromWarehouse: result.fromWarehouse,
          reason: dto.reason?.trim() || null,
          userName,
          date: dateOnly(dto.date),
        },
      });
    });
  }
}
