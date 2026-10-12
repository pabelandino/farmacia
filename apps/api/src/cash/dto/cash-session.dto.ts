import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashDto {
  @IsOptional()
  @IsString()
  date?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingAmount!: number;
}

export class CloseCashDto {
  @IsOptional()
  @IsString()
  date?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  countedCash!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  countedCard?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['shift', 'final'])
  kind?: 'shift' | 'final';
}
