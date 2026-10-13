import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { calendarDateIso, drawerDifference } from '@farmaplus/domain';
import { PrismaService } from '../prisma/prisma.service';
import { dateOnly } from '../dates';
import { summarizeCashDay } from './cash-day';
import { CloseCashDto, OpenCashDto } from './dto/cash-session.dto';

@Injectable()
export class CashService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async day(date = calendarDateIso()) {
    const day = dateOnly(date);
    const [session, invoices, entries] = await Promise.all([
      this.prisma.cashSession.findUnique({ where: { date: day } }),
      this.prisma.invoice.findMany({
        where: { date: day },
        orderBy: { number: 'asc' },
      }),
      this.prisma.cashEntry.findMany({ where: { date: day } }),
    ]);
    const operatingExpense = entries.reduce((sum, row) => sum + Number(row.operatingExpense), 0);
    const returnExpense = entries.reduce((sum, row) => sum + Number(row.returnExpense), 0);
    const income = entries.reduce((sum, row) => sum + Number(row.income), 0);
    const card = entries.reduce((sum, row) => sum + Number(row.card), 0);
    const summary = summarizeCashDay(invoices, session, { operatingExpense, returnExpense });
    return {
      date,
      session,
      ...summary,
      movements: {
        count: entries.length,
        income: Number(income.toFixed(2)),
        card: Number(card.toFixed(2)),
        operatingExpense: Number(operatingExpense.toFixed(2)),
        returnExpense: Number(returnExpense.toFixed(2)),
        net: Number((income + card - operatingExpense - returnExpense).toFixed(2)),
      },
    };
  }

  async open(dto: OpenCashDto, userName: string) {
    const date = dto.date || calendarDateIso();
    const day = dateOnly(date);
    const current = await this.prisma.cashSession.findUnique({ where: { date: day } });
    if (current?.openedAt) throw new BadRequestException('La caja ya está abierta');
    if (current?.closedAt) throw new BadRequestException('La caja ya está cerrada');
    await this.prisma.cashSession.upsert({
      where: { date: day },
      create: {
        date: day,
        openedAt: new Date(),
        openedBy: userName,
        openingAmount: dto.openingAmount,
      },
      update: {
        openedAt: new Date(),
        openedBy: userName,
        openingAmount: dto.openingAmount,
      },
    });
    return this.day(date);
  }

  async close(dto: CloseCashDto, userName: string) {
    const date = dto.date || calendarDateIso();
    const day = dateOnly(date);
    const kind = dto.kind || 'final';
    const [session, invoices, entries] = await Promise.all([
      this.prisma.cashSession.findUnique({ where: { date: day } }),
      this.prisma.invoice.findMany({ where: { date: day }, orderBy: { number: 'asc' } }),
      this.prisma.cashEntry.findMany({ where: { date: day } }),
    ]);
    if (!session?.openedAt) throw new BadRequestException('Abra la caja antes de cerrarla');
    if (session.closedAt) throw new BadRequestException('La caja ya está cerrada');
    const operatingExpense = entries.reduce((sum, row) => sum + Number(row.operatingExpense), 0);
    const returnExpense = entries.reduce((sum, row) => sum + Number(row.returnExpense), 0);
    if (kind === 'shift') {
      if (session.shiftClosedAt) throw new BadRequestException('El turno de las 4:00 ya está cerrado');
      const shiftClosedAt = new Date();
      const preview = summarizeCashDay(invoices, { ...session, shiftClosedAt, shiftCut: null, closedAt: null, finalCut: null }, {
        operatingExpense,
        returnExpense,
      });
      const shiftCut = preview.cuts.find((cut) => cut.key === 'cut16') || preview.cuts[2];
      await this.prisma.cashSession.update({
        where: { date: day },
        data: {
          shiftClosedAt,
          shiftClosedBy: userName,
          shiftCountedCash: dto.countedCash,
          shiftCountedCard: dto.countedCard ?? 0,
          shiftExpectedCash: preview.shiftExpectedCash,
          shiftDifference: drawerDifference(dto.countedCash, preview.shiftExpectedCash),
          shiftCut,
          notes: dto.notes?.trim() || session.notes,
        },
      });
      return this.day(date);
    }
    const closedAt = new Date();
    const preview = summarizeCashDay(invoices, { ...session, closedAt, finalCut: null }, {
      operatingExpense,
      returnExpense,
    });
    const finalCut = preview.cuts.find((cut) => cut.key === 'close') || preview.cuts[preview.cuts.length - 1];
    await this.prisma.cashSession.update({
      where: { date: day },
      data: {
        closedAt,
        closedBy: userName,
        countedCash: dto.countedCash,
        countedCard: dto.countedCard ?? 0,
        expectedCash: preview.expectedCash,
        difference: drawerDifference(dto.countedCash, preview.expectedCash),
        notes: dto.notes?.trim() || session.notes,
        finalCut,
      },
    });
    return this.day(date);
  }
}
