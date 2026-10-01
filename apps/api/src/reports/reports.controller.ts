import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get('sales')
  @RequirePermission('reports')
  sales(@Query('date') date?: string) {
    return this.reports.sales(date);
  }

  @Get('stock')
  @RequirePermission('reports')
  stock() {
    return this.reports.stock();
  }

  @Get('cash')
  @RequirePermission('cash', 'reports')
  cash(@Query('date') date?: string) {
    return this.reports.cash(date);
  }

  @Get('dashboard')
  @RequirePermission('dashboard')
  dashboard(@Query('days') days?: string) {
    return this.reports.dashboard(Number(days) || 14);
  }

  @Get('receivables')
  @RequirePermission('reports')
  receivables() {
    return this.reports.receivables();
  }

  @Get('payables')
  @RequirePermission('reports')
  payables() {
    return this.reports.payables();
  }

  @Get('inventory')
  @RequirePermission('reports')
  inventory(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('all') all?: string,
  ) {
    return this.reports.inventory({
      q,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      all: all === '1' || all === 'true',
    });
  }

  @Get('sales-lines')
  @RequirePermission('reports')
  salesLines(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('all') all?: string,
  ) {
    return this.reports.salesLines({
      from,
      to,
      q,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      all: all === '1' || all === 'true',
    });
  }

  @Get('invoices-list')
  @RequirePermission('invoices', 'reports')
  invoicesList(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('all') all?: string,
  ) {
    return this.reports.invoicesList({
      from,
      to,
      q,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      all: all === '1' || all === 'true',
    });
  }

  @Get('expired-products')
  @RequirePermission('reports')
  expiredProducts(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('all') all?: string,
  ) {
    return this.reports.expiredProducts({
      from,
      to,
      q,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      all: all === '1' || all === 'true',
    });
  }
}
