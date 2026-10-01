import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}

export class UpsertProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  generic?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  line?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @Type(() => Number)
  @IsNumber()
  costPrice!: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  salePrice1!: number;

  @Type(() => Number)
  @IsNumber()
  salePrice2!: number;

  @Type(() => Number)
  @IsNumber()
  stock!: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dispatchQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warehouseQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitsPerBox?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1)
  @IsBoolean()
  soldByUnit?: boolean;
}

export class CatalogNameDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
