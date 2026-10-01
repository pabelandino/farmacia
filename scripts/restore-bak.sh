#!/usr/bin/env bash
set -euo pipefail

SA_PASSWORD="${MSSQL_SA_PASSWORD:-FarmaPlus_Restore_2026!}"
BAK_PATH="/var/opt/mssql/backup/FarmaPlusV2.bak"
CONTAINER="${MSSQL_CONTAINER:-elsasoft-mssql}"

sqlcmd() {
  docker exec -e MSSQL_SA_PASSWORD="$SA_PASSWORD" "$CONTAINER" \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C "$@"
}

echo "Waiting for SQL Server..."
for i in $(seq 1 40); do
  if sqlcmd -Q "SELECT 1" >/dev/null 2>&1; then
    echo "SQL Server is ready"
    break
  fi
  if [ "$i" -eq 40 ]; then
    echo "SQL Server did not become ready in time"
    exit 1
  fi
  sleep 3
done

echo "Backup file list:"
sqlcmd -Q "RESTORE FILELISTONLY FROM DISK = N'${BAK_PATH}'"

echo "Restoring FarmaPlusV2..."
sqlcmd -Q "
RESTORE DATABASE [FarmaPlusV2]
FROM DISK = N'${BAK_PATH}'
WITH REPLACE,
MOVE N'FarmaPlusV2' TO N'/var/opt/mssql/data/FarmaPlusV2.mdf',
MOVE N'FarmaPlusV2_log' TO N'/var/opt/mssql/data/FarmaPlusV2_log.ldf'
"
echo "Restore finished"
