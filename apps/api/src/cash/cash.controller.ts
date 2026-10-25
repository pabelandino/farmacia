import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CashService } from './cash.service';
import { CloseCashDto, OpenCashDto } from './dto/cash-session.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('cash')
@Controller('cash')
export class CashController {
  constructor(@Inject(CashService) private readonly cash: CashService) {}

  @Get('session')
  @RequirePermission('cash', 'reports')
  day(@Query('date') date?: string) {
    return this.cash.day(date);
  }

  @Post('open')
  open(@Body() dto: OpenCashDto, @Req() req: { user: { username: string } }) {
    return this.cash.open(dto, req.user.username);
  }

  @Post('close')
  close(@Body() dto: CloseCashDto, @Req() req: { user: { username: string } }) {
    return this.cash.close(dto, req.user.username);
  }
}
