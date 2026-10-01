import { BadRequestException, Body, Controller, Get, Inject, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import type { Response } from 'express';
import { backupsDir } from '../backups-dir';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { SettingsService } from './settings.service';

const backupDir = backupsDir();
mkdirSync(backupDir, { recursive: true });

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @RequirePermission('settings')
  @Get('import-status')
  importStatus() {
    return this.settings.importStatus();
  }

  @RequirePermission('settings')
  @Post('exchange-rate')
  setRate(@Body() body: { rate?: number }) {
    return this.settings.setExchangeRate(Number(body.rate));
  }

  @RequirePermission('settings')
  @Post('company')
  setCompany(@Body() body: { name?: string; address?: string; phone?: string; line1?: string; line2?: string }) {
    return this.settings.updateCompany(body);
  }

  @RequirePermission('settings')
  @Post('import-bak')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: backupDir,
        filename: (_req, file, cb) => {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          cb(null, `upload-${stamp}${extname(file.originalname) || '.bak'}`);
        },
      }),
      limits: { fileSize: 512 * 1024 * 1024 },
    }),
  )
  importBak(@UploadedFile() file?: { filename: string; originalname: string }) {
    if (!file) throw new BadRequestException('Seleccione un archivo .bak');
    if (!file.originalname.toLowerCase().endsWith('.bak')) {
      throw new BadRequestException('Solo se aceptan archivos .bak de SQL Server');
    }
    return this.settings.startBakImport(file.filename);
  }

  @RequirePermission('settings')
  @Get('backup-pg')
  async backupPg(@Res() res: Response) {
    const file = await this.settings.postgresDumpPath();
    const name = file.split('/').pop() || 'respaldo.sql.gz';
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    this.settings.dumpStream(file).pipe(res);
  }
}
