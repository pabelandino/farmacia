import { IsOptional, IsString } from 'class-validator';

export class ClientQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

export class UpsertClientDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cell?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;
}
