import { IsOptional, IsString } from 'class-validator';

export class SupplierQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

export class UpsertSupplierDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  line?: string;
}
