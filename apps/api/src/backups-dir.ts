import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Host folder mounted into elsasoft-mssql at /var/opt/mssql/backup */
export function backupsDir() {
  const fromSource = join(__dirname, '../../../backups');
  if (existsSync(fromSource)) return fromSource;
  const fromApiCwd = join(process.cwd(), '../../backups');
  if (existsSync(fromApiCwd)) return fromApiCwd;
  return join(process.cwd(), 'backups');
}
