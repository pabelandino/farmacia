import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientQueryDto, UpsertClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  search(query: ClientQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.ClientWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { nationalId: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.client.findMany({ where, orderBy: { name: 'asc' }, take: 100 });
  }

  async get(id: number) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  create(dto: UpsertClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  async update(id: number, dto: UpsertClientDto) {
    await this.get(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }
}
