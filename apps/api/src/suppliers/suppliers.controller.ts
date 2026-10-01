import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { SupplierQueryDto, UpsertSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly suppliers: SuppliersService) {}

  @Get()
  search(@Query() query: SupplierQueryDto) {
    return this.suppliers.search(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.get(id);
  }

  @Post()
  create(@Body() dto: UpsertSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertSupplierDto) {
    return this.suppliers.update(id, dto);
  }
}
