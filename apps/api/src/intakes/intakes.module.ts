import { Module } from '@nestjs/common';
import { IntakesController } from './intakes.controller';
import { IntakesService } from './intakes.service';

@Module({
  controllers: [IntakesController],
  providers: [IntakesService],
})
export class IntakesModule {}
