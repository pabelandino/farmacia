import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ClientQueryDto, UpsertClientDto } from './dto/client.dto';
import { ClientsService } from './clients.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(@Inject(ClientsService) private readonly clients: ClientsService) {}

  @Get()
  @RequirePermission('billing', 'clients')
  search(@Query() query: ClientQueryDto) {
    return this.clients.search(query);
  }

  @Get(':id')
  @RequirePermission('billing', 'clients')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.clients.get(id);
  }

  @Post()
  @RequirePermission('clients')
  create(@Body() dto: UpsertClientDto) {
    return this.clients.create(dto);
  }

  @Put(':id')
  @RequirePermission('clients')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertClientDto) {
    return this.clients.update(id, dto);
  }
}
