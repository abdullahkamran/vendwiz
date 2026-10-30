#!/bin/sh
# Daily database backup to a PRIVATE S3-compatible bucket (Cloudflare R2). Runs as the "backup"
# service in docker-compose.yml (postgres:17-alpine image): one dump at start, then every 24 hours.
#
# Dumps only the "public" schema (the app's tables), not Supabase's own schemas, so the file
# restores into any Postgres:
#   pg_restore --no-owner --no-privileges -d "$DATABASE_URL" vendwiz-<timestamp>.dump
#
# Never use the media bucket behind CDN_BUCKET_BASE_URL: it is public, and so would the dumps be.
# Delete old dumps with a lifecycle rule on the bucket (R2 → bucket → Settings → Object lifecycle).
set -eu

: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is not set}"

# R2 credentials: a token scoped to the backup bucket, falling back to the media upload token
export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-${S3_ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-${S3_SECRET_ACCESS_KEY:-}}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
# R2 rejects the checksum headers newer AWS CLI versions send by default
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
endpoint="${BACKUP_S3_ENDPOINT:-${S3_ENDPOINT:?S3_ENDPOINT is not set}}"

command -v aws >/dev/null || apk add --no-cache aws-cli >/dev/null

while true; do
	name="vendwiz-$(date -u +%Y-%m-%dT%H%M).dump"
	if pg_dump "$DATABASE_URL" --schema=public --format=custom --no-owner --no-privileges -f "/tmp/$name" &&
		aws s3 cp "/tmp/$name" "s3://$BACKUP_S3_BUCKET/backups/$name" --endpoint-url "$endpoint" --only-show-errors; then
		echo "$(date -u) backed up $name ($(du -h "/tmp/$name" | cut -f1))"
	else
		echo "$(date -u) BACKUP FAILED" >&2
	fi
	rm -f "/tmp/$name"
	sleep 86400
done
