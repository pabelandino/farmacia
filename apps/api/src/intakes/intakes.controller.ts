import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { IntakeQueryDto, UpsertIntakeDto } from './dto/intake.dto';
import { IntakesService } from './intakes.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('intakes')
@Controller('intakes')
export class IntakesController {
  constructor(@Inject(IntakesService) private readonly intakes: IntakesService) {}

  @Get()
  search(@Query() query: IntakeQueryDto) {
    return this.intakes.search(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.intakes.get(id);
  }

  @Post()
  create(
    @Body() dto: UpsertIntakeDto,
    @Req() req: { user: { username: string } },
  ) {
    return this.intakes.create(dto, req.user.username);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertIntakeDto,
    @Req() req: { user: { username: string } },
  ) {
    return this.intakes.update(id, dto, req.user.username);
  }
}
