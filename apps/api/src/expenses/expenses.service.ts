import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { calendarDateIso } from '@farmaplus/domain';
import { Prisma } from '@prisma/client';
import { dateOnly } from '../dates';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(query: ExpenseQueryDto) {
    const pageSize = Math.min(query.pageSize || 15, 50);
    const page = query.page || 1;
    const q = query.q?.trim();
    const where: Prisma.CashEntryWhereInput = {
      operatingExpense: { gt: 0 },
      ...(query.date ? { date: dateOnly(query.date) } : {}),
      ...(q
        ? {
            OR: [
              { notes: { contains: q, mode: 'insensitive' } },
              { userName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [count, total, rows] = await Promise.all([
      this.prisma.cashEntry.count({ where }),
      this.prisma.cashEntry.aggregate({ where, _sum: { operatingExpense: true } }),
      this.prisma.cashEntry.findMany({
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
      total: Number(Number(total._sum.operatingExpense || 0).toFixed(2)),
      rows: rows.map((row) => ({
        id: row.id,
        date: row.date,
        amount: Number(row.operatingExpense),
        detail: row.notes || '',
        userName: row.userName,
      })),
    };
  }

  async create(dto: CreateExpenseDto, userName: string) {
    const detail = dto.detail.trim();
    if (!detail) throw new BadRequestException('Indique el detalle del egreso');
    const amount = Number(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('La cantidad debe ser mayor a 0');
    return this.prisma.cashEntry.create({
      data: {
        userName,
        operatingExpense: amount,
        notes: detail,
        date: dateOnly(dto.date || calendarDateIso()),
      },
    });
  }
}
