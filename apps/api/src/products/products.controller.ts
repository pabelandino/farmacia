import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOnly, RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CatalogNameDto, ProductQueryDto, UpsertProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}

  @Get()
  @RequirePermission('billing', 'products')
  search(@Query() query: ProductQueryDto) {
    return this.products.search(query);
  }

  @Get('lookups')
  @RequirePermission('billing', 'products')
  lookups() {
    return this.products.lookups();
  }

  @Post('brands')
  @AdminOnly()
  createBrand(@Body() dto: CatalogNameDto) {
    return this.products.createBrand(dto);
  }

  @Post('categories')
  @AdminOnly()
  createCategory(@Body() dto: CatalogNameDto) {
    return this.products.createCategory(dto);
  }

  @Get(':id/lots')
  @RequirePermission('billing', 'products', 'intakes')
  lots(@Param('id', ParseIntPipe) id: number) {
    return this.products.lots(id);
  }

  @Get(':id')
  @RequirePermission('billing', 'products')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.products.get(id);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: UpsertProductDto) {
    return this.products.create(dto);
  }

  @Put(':id')
  @AdminOnly()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertProductDto) {
    return this.products.update(id, dto);
  }
}
