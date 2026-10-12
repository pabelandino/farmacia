import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class UserPermissionsDto {
  @IsOptional() @IsBoolean() billing?: boolean;
  @IsOptional() @IsBoolean() invoices?: boolean;
  @IsOptional() @IsBoolean() products?: boolean;
  @IsOptional() @IsBoolean() transfers?: boolean;
  @IsOptional() @IsBoolean() suppliers?: boolean;
  @IsOptional() @IsBoolean() voidInvoice?: boolean;
  @IsOptional() @IsBoolean() dashboard?: boolean;
  @IsOptional() @IsBoolean() intakes?: boolean;
  @IsOptional() @IsBoolean() writeOffs?: boolean;
  @IsOptional() @IsBoolean() expenses?: boolean;
  @IsOptional() @IsBoolean() editProducts?: boolean;
  @IsOptional() @IsBoolean() cash?: boolean;
  @IsOptional() @IsBoolean() clients?: boolean;
  @IsOptional() @IsBoolean() reports?: boolean;
  @IsOptional() @IsBoolean() settings?: boolean;
  @IsOptional() @IsBoolean() users?: boolean;
}

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'CASHIER'])
  role?: 'ADMIN' | 'CASHIER';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions?: UserPermissionsDto;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'CASHIER'])
  role?: 'ADMIN' | 'CASHIER';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions?: UserPermissionsDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
