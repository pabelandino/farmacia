import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard, RequestUser } from '../auth/permissions.guard';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('users')
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: { user: RequestUser }) {
    return this.users.create(dto, req.user);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: { user: RequestUser },
  ) {
    return this.users.update(id, dto, req.user);
  }
}
