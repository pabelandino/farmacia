import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateWriteOffDto, WriteOffQueryDto } from './dto/write-off.dto';
import { WriteOffsService } from './write-offs.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('writeOffs')
@Controller('write-offs')
export class WriteOffsController {
  constructor(@Inject(WriteOffsService) private readonly writeOffs: WriteOffsService) {}

  @Get()
  search(@Query() query: WriteOffQueryDto) {
    return this.writeOffs.search(query);
  }

  @Post()
  create(
    @Body() dto: CreateWriteOffDto,
    @Req() req: { user: { username: string } },
  ) {
    return this.writeOffs.create(dto, req.user.username);
  }
}
