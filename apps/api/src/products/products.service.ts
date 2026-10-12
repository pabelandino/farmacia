import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { allocateLotRemainings, stockFieldsFromBins, unitCostFromBox } from '@farmaplus/domain';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogNameDto, ProductQueryDto, UpsertProductDto } from './dto/product.dto';

function uniqueNames(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(query: ProductQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.ProductWhereInput = q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { generic: { contains: q, mode: 'insensitive' } },
            { brand: { contains: q, mode: 'insensitive' } },
            { line: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const take = Math.min(query.take ?? 80, 200);
    const skip = Math.max(0, query.skip ?? 0);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async lookups() {
    const [brands, categories, productBrands, productLines] = await Promise.all([
      this.prisma.productBrand.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.productCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.product.groupBy({ by: ['brand'], orderBy: { brand: 'asc' } }),
      this.prisma.product.groupBy({ by: ['line'], orderBy: { line: 'asc' } }),
    ]);
    return {
      brands: uniqueNames([...brands.map((row) => row.name), ...productBrands.map((row) => row.brand)]),
      categories: uniqueNames([...categories.map((row) => row.name), ...productLines.map((row) => row.line)]),
    };
  }

  createBrand(dto: CatalogNameDto) {
    const name = this.catalogName(dto.name);
    return this.prisma.productBrand.upsert({ where: { name }, create: { name }, update: {} });
  }

  createCategory(dto: CatalogNameDto) {
    const name = this.catalogName(dto.name);
    return this.prisma.productCategory.upsert({ where: { name }, create: { name }, update: {} });
  }

  async get(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async lots(id: number) {
    const product = await this.get(id);
    const lines = await this.prisma.intakeLine.findMany({
      where: { productId: id },
      include: { intake: { select: { date: true, documentNumber: true } } },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    });
    const stock = Number(product.stock) + Number(product.warehouseQty);
    const lots = allocateLotRemainings(
      lines.map((row) => ({
        id: row.id,
        quantity: Number(row.quantity),
        expiresAt: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : null,
        lot: row.lot || '',
        documentNumber: row.intake.documentNumber,
        intakeDate: row.intake.date.toISOString().slice(0, 10),
      })),
      stock,
    );
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      stock,
      lots: lots.filter((lot) => lot.remaining > 0),
    };
  }

  async create(dto: UpsertProductDto) {
    await this.rememberCatalogs(dto);
    return this.prisma.product.create({ data: this.pricing(dto) });
  }

  async update(id: number, dto: UpsertProductDto) {
    await this.get(id);
    await this.rememberCatalogs(dto);
    return this.prisma.product.update({ where: { id }, data: this.pricing(dto) });
  }

  private catalogName(value: string) {
    const name = value.trim();
    if (!name) throw new BadRequestException('Indique un nombre');
    return name;
  }

  private rememberCatalogs(dto: UpsertProductDto) {
    return Promise.all([
      dto.brand?.trim() ? this.createBrand({ name: dto.brand }) : Promise.resolve(),
      dto.line?.trim() ? this.createCategory({ name: dto.line }) : Promise.resolve(),
    ]);
  }

  private pricing(dto: UpsertProductDto) {
    const unitsPerBox = dto.unitsPerBox ?? 1;
    const bins = dto.dispatchQty != null || dto.warehouseQty != null
      ? stockFieldsFromBins(dto.dispatchQty ?? 0, dto.warehouseQty ?? 0)
      : null;
    return {
      ...dto,
      unitsPerBox,
      soldByUnit: dto.soldByUnit ?? false,
      unitPrice: unitCostFromBox(dto.costPrice, unitsPerBox),
      ...(bins || {}),
      ...(dto.maxQty != null ? { maxQty: dto.maxQty } : {}),
    };
  }
}
