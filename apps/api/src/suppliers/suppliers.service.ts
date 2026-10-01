import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierQueryDto, UpsertSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  search(query: SupplierQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.SupplierWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { contact: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, take: 200 });
  }

  async get(id: number) {
    const row = await this.prisma.supplier.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Proveedor no encontrado');
    return row;
  }

  create(dto: UpsertSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: number, dto: UpsertSupplierDto) {
    await this.get(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }
}
