import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, TransferQueryDto } from './dto/transfer.dto';

function dateOnly(value?: string) {
  if (value) return new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

@Injectable()
export class TransfersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  search(query: TransferQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.TransferWhereInput = q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { productName: { contains: q, mode: 'insensitive' } },
            { origin: { contains: q, mode: 'insensitive' } },
            { destination: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.transfer.findMany({ where, orderBy: { id: 'desc' }, take: 200 });
  }

  create(dto: CreateTransferDto) {
    return this.prisma.transfer.create({
      data: {
        sku: dto.sku || null,
        productName: dto.productName || null,
        sender: dto.sender || null,
        origin: dto.origin || null,
        destination: dto.destination || null,
        quantity: dto.quantity ?? 0,
        receiver: dto.receiver || null,
        reason: dto.reason || null,
        date: dateOnly(dto.date),
      },
    });
  }
}
