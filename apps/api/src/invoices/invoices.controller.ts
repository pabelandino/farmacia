import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateInvoiceDto, InvoicePaymentDto, InvoiceQueryDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService) {}

  @Get('next-number')
  @RequirePermission('billing')
  nextNumber() {
    return this.invoices.nextNumber().then((number) => ({ number }));
  }

  @Get('recent')
  @RequirePermission('billing', 'invoices')
  recent(@Query() query: InvoiceQueryDto) {
    return this.invoices.recent(query);
  }

  @Get()
  @RequirePermission('billing', 'invoices')
  search(@Query() query: InvoiceQueryDto) {
    return this.invoices.search(query);
  }

  @Get(':id')
  @RequirePermission('billing', 'invoices')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.invoices.get(id);
  }

  @Post()
  @RequirePermission('billing')
  create(
    @Body() dto: CreateInvoiceDto,
    @Req() req: { user: { sub: number; username: string } },
  ) {
    return this.invoices.create(dto, req.user);
  }

  @Post(':id/payment')
  @RequirePermission('reports')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InvoicePaymentDto,
  ) {
    return this.invoices.addPayment(id, dto.amount);
  }

  @Post(':id/void')
  @RequirePermission('voidInvoice')
  voidInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoices.voidInvoice(id);
  }
}
