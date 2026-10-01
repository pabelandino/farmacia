# Farma Plus (local)

Reconstrucción MVP del sistema de farmacia a partir del respaldo SQL Server `.bak`.

## Qué hay en este proyecto

- `backups/FarmaPlusV2.bak`: copia del respaldo original
- SQL Server 2022 en Docker (solo para restaurar el `.bak`)
- PostgreSQL 16 en Docker (base del sistema nuevo)
- API NestJS + Prisma
- Facturación de **contado** (flujo principal)
- Facturación de **crédito** (flujo secundario: vencimiento, adelanto y listado; sin CxC completa)
- Ingresos de medicamentos (precios y existencias con fórmulas del .exe)
- Clientes

## Arranque

```bash
cp .env.example .env
docker compose up -d
./scripts/restore-bak.sh
cd apps/api && npx prisma db push && npm run migrate:legacy
npm run dev:api
npm run dev:web
```

UI: http://localhost:5173  
API: http://localhost:3001/api

Usuarios migrados (iveth, FRAN, Letty, etc.). Contraseña temporal: `FarmaPlus2026!`

## Corte futuro

El sistema viejo puede seguir usándose en paralelo. El SQL Server Docker (`elsasoft-mssql`) no se apaga en el día a día de desarrollo.

Antes de apagar Windows:

1. Generar un `.bak` fresco en la PC `DESARROLLO`.
2. Copiarlo a `backups/FarmaPlusV2.bak`.
3. Volver a correr `./scripts/restore-bak.sh` y `npm run migrate:legacy`.
4. Verificar conteos (productos, facturas, existencias) contra el sistema viejo.
