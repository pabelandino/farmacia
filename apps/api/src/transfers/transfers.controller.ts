import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateTransferDto, TransferQueryDto } from './dto/transfer.dto';
import { TransfersService } from './transfers.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('transfers')
@Controller('transfers')
export class TransfersController {
  constructor(@Inject(TransfersService) private readonly transfers: TransfersService) {}

  @Get()
  search(@Query() query: TransferQueryDto) {
    return this.transfers.search(query);
  }

  @Post()
  create(@Body() dto: CreateTransferDto) {
    return this.transfers.create(dto);
  }
}
