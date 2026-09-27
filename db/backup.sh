#!/bin/bash
#
# Weekly production DB dump + retention, run from cron on the EC2 box (Mondays).
# The box runs its own standalone copy at ~/backup.sh. This is the reference
# copy: nothing deploys it, so if you change either one, `cp` it across by hand.
#
set -uo pipefail

# Set variables
DB_USER="postgres"
DB_NAME="dreamingsheep"
BACKUP_DIR="/home/ubuntu/backup"
DATE=$(date +"%Y%m%d%H%M%S")
FILENAME="backup-$DB_NAME-$DATE.sql"

# The privacy policy promises "backups may retain data for up to 90 days".
# find's -mtime truncates to whole days, so +89 expires a dump once it turns 90.
RETENTION_DAYS=89

mkdir -p "$BACKUP_DIR"

# Dump the database
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/$FILENAME"
status=$?

# Only rotate if THIS dump is good. A failed or truncated pg_dump (disk full,
# postgres down) plus rotation would delete every healthy backup we have.
# pg_dump 17.6+ writes a `\unrestrict <token>` line after the footer, so the
# footer is ~120 bytes from EOF, not at it — hence the generous tail window.
if [ $status -ne 0 ] || [ ! -s "$BACKUP_DIR/$FILENAME" ] ||
   ! tail -c 2000 "$BACKUP_DIR/$FILENAME" | grep -q "PostgreSQL database dump complete"; then
  echo "backup.sh: pg_dump failed (exit $status) — keeping old backups" >&2
  rm -f "$BACKUP_DIR/$FILENAME"
  exit 1
fi

# Rotate. -mtime +N deletes by AGE, not by count: with weekly dumps the original
# "+5" left exactly one file — that was the old "keep the last 5" TODO, and it
# was never a bug, just a misread of the flag.
find "$BACKUP_DIR" -type f -name "backup-$DB_NAME-*.sql" -mtime "+$RETENTION_DAYS" -delete
