import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { BUSINESS_TIME_ZONE } from '@farmaplus/domain';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.ensureBusinessTimezone();
    await this.$executeRaw`
      UPDATE products
      SET "dispatchQty" = "warehouseQty",
          stock = "warehouseQty",
          "warehouseQty" = 0
      WHERE "dispatchQty" <= 0.009 AND "warehouseQty" > 0.009
    `;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureBusinessTimezone() {
    const rows = await this.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
    const db = rows[0]?.current_database;
    if (!db || !/^[A-Za-z0-9_]+$/.test(db)) return;
    await this.$executeRawUnsafe(`ALTER DATABASE "${db}" SET timezone TO '${BUSINESS_TIME_ZONE}'`);
  }
}
