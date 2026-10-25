import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { backupsDir } from '../backups-dir';
import { PrismaService } from '../prisma/prisma.service';
import { collectCounts, restoreSqlBak, runLegacyEtl } from '../etl/legacy-etl';

type ImportJob = {
  status: 'idle' | 'running' | 'done' | 'error';
  step: string;
  log: string[];
  startedAt?: string;
  finishedAt?: string;
  counts?: Record<string, number>;
  error?: string;
};

const execFileAsync = promisify(execFile);
const job: ImportJob = { status: 'idle', step: 'Sin importación', log: [] };

const POSTGRES_CANDIDATES = ['elsasoft-postgres', 'farmaplus-postgres'];
const HOST_PATH = ['/usr/lib/postgresql/16/bin', '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', process.env.PATH || ''].join(':');
const MIN_DUMP_BYTES = 100;
const DUMP_FLAGS = ['--encoding=UTF8', '--create', '--clean', '--if-exists', '--blobs'];

function dumpEnv() {
  return { ...process.env, PATH: HOST_PATH, DATABASE_URL: databaseUrl() };
}

function dumpError(error: unknown) {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = String((error as { stderr?: Buffer | string }).stderr || '').trim();
    if (stderr) return stderr;
  }
  return error instanceof Error ? error.message : String(error);
}

function databaseUrl() {
  return process.env.DATABASE_URL || 'postgresql://farmacia:farmacia@localhost:5432/farmaplus';
}

function unlinkQuiet(path: string) {
  try {
    unlinkSync(path);
  } catch {
    /* ignore leftover temp files */
  }
}

function dumpFileReady(path: string) {
  return existsSync(path) && statSync(path).size >= MIN_DUMP_BYTES;
}

async function streamDump(file: string, command: string, args: string[]) {
  const tmp = `${file}.part`;
  unlinkQuiet(tmp);
  const child = spawn(command, args, { env: dumpEnv() });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  try {
    await pipeline(child.stdout, createGzip({ level: 9 }), createWriteStream(tmp));
  } catch (error) {
    unlinkQuiet(tmp);
    throw error;
  }
  const code = await new Promise<number | null>((resolve, reject) => {
    if (child.exitCode != null) {
      resolve(child.exitCode);
      return;
    }
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (code !== 0) {
    unlinkQuiet(tmp);
    throw new Error(stderr.trim() || `${command} salió con código ${code}`);
  }
  if (!dumpFileReady(tmp)) {
    unlinkQuiet(tmp);
    throw new Error('El respaldo quedó vacío');
  }
  unlinkQuiet(file);
  renameSync(tmp, file);
}

async function runningPostgresContainer() {
  const preferred = process.env.POSTGRES_CONTAINER?.trim();
  const wanted = preferred ? [preferred, ...POSTGRES_CANDIDATES] : [...POSTGRES_CANDIDATES];
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}'], {
      timeout: 15000,
      env: dumpEnv(),
    });
    const names = stdout.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    for (const name of wanted) {
      if (names.includes(name)) return name;
    }
  } catch {
    return '';
  }
  return '';
}

function dumpViaPgDump(file: string) {
  return streamDump(file, 'pg_dump', [`--dbname=${databaseUrl()}`, ...DUMP_FLAGS]);
}

async function dumpViaDocker(file: string) {
  const container = await runningPostgresContainer();
  if (!container) throw new Error('No hay un contenedor de Postgres en ejecución');
  const user = process.env.POSTGRES_USER || 'farmacia';
  const db = process.env.POSTGRES_DB || 'farmaplus';
  return streamDump(file, 'docker', ['exec', container, 'pg_dump', '-U', user, '-d', db, ...DUMP_FLAGS]);
}

function respaldoFileName() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Managua',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '00';
  return `respaldo_${get('day')}-${get('month')}-${get('year')}.sql.gz`;
}

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get() {
    const [company, rate, config, counts] = await Promise.all([
      this.prisma.company.findFirst(),
      this.prisma.exchangeRate.findFirst({ orderBy: { id: 'desc' } }),
      this.prisma.appConfig.findFirst(),
      collectCounts(this.prisma),
    ]);
    return {
      company,
      exchangeRate: rate ? Number(rate.rate) : 36.2,
      config,
      counts,
    };
  }

  importStatus() {
    return job;
  }

  async setExchangeRate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) throw new BadRequestException('Tipo de cambio inválido');
    const current = await this.prisma.exchangeRate.findFirst({ orderBy: { id: 'desc' } });
    if (current) {
      return this.prisma.exchangeRate.update({ where: { id: current.id }, data: { rate } });
    }
    return this.prisma.exchangeRate.create({ data: { rate } });
  }

  async updateCompany(body: { name?: string; address?: string; phone?: string; line1?: string; line2?: string }) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('El nombre de la farmacia es obligatorio');
    const data = {
      name,
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      line1: body.line1?.trim() || null,
      line2: body.line2?.trim() || null,
    };
    const current = await this.prisma.company.findFirst();
    if (current) return this.prisma.company.update({ where: { id: current.id }, data });
    return this.prisma.company.create({ data });
  }

  startBakImport(storedName: string) {
    if (job.status === 'running') throw new BadRequestException('Ya hay una importación en curso');
    job.status = 'running';
    job.step = 'Iniciando...';
    job.log = [`Archivo recibido: ${storedName}`];
    job.startedAt = new Date().toISOString();
    job.finishedAt = undefined;
    job.counts = undefined;
    job.error = undefined;
    void this.runImport(storedName);
    return job;
  }

  private async runImport(storedName: string) {
    const onProgress = (step: string, extra?: Record<string, unknown>) => {
      job.step = extra?.done ? `${step} ${extra.done}/${extra.total}` : step;
      job.log.push(job.step);
      if (job.log.length > 80) job.log.splice(0, job.log.length - 80);
    };
    try {
      await restoreSqlBak(storedName, onProgress);
      const result = await runLegacyEtl(this.prisma, onProgress);
      job.counts = result.counts;
      job.status = 'done';
      job.step = 'Listo';
      job.finishedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : String(error);
      job.step = 'Error';
      job.log.push(job.error);
      job.finishedAt = new Date().toISOString();
    }
  }

  async postgresDumpPath() {
    const dir = backupsDir();
    mkdirSync(dir, { recursive: true });
    const file = join(dir, respaldoFileName());
    const errors: string[] = [];
    for (const dump of [dumpViaPgDump, dumpViaDocker]) {
      try {
        await dump(file);
        if (dumpFileReady(file)) return file;
        unlinkQuiet(file);
      } catch (error) {
        unlinkQuiet(file);
        unlinkQuiet(`${file}.part`);
        errors.push(dumpError(error));
      }
    }
    throw new BadRequestException(
      `No se pudo generar el respaldo. ¿Está Postgres corriendo? ${errors.join(' ')}`,
    );
  }

  dumpStream(file: string) {
    return createReadStream(file);
  }
}
