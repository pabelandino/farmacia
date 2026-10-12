import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly expenses: ExpensesService) {}

  @Get()
  @RequirePermission('expenses', 'reports', 'cash')
  search(@Query() query: ExpenseQueryDto) {
    return this.expenses.search(query);
  }

  @Post()
  create(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user: { username: string } },
  ) {
    return this.expenses.create(dto, req.user.username);
  }
}
