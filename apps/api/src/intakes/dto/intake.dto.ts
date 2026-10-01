import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class IntakeLineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @IsString()
  sku!: string;

  @IsString()
  productName!: string;

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
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  costPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitsPerBox?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salePrice1?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salePrice2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  utilityPercent?: number;

  @IsOptional()
  @IsString()
  lot?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsIn(['dispatch', 'warehouse'])
  destination?: 'dispatch' | 'warehouse';
}

export class UpsertIntakeDto {
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  purchaseOrder?: string;

  @IsOptional()
  @IsString()
  billedAs?: string;

  @IsString()
  supplier!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IntakeLineDto)
  lines!: IntakeLineDto[];
}

export class IntakeQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
