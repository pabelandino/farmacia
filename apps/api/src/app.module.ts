import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { IntakesModule } from './intakes/intakes.module';
import { WriteOffsModule } from './write-offs/write-offs.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TransfersModule } from './transfers/transfers.module';
import { CashModule } from './cash/cash.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    ClientsModule,
    InvoicesModule,
    ReportsModule,
    SettingsModule,
    IntakesModule,
    WriteOffsModule,
    UsersModule,
    SuppliersModule,
    TransfersModule,
    CashModule,
    ExpensesModule,
  ],
})
export class AppModule {}
