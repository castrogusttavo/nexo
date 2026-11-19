# 0007. Silo as the S3-compatible object store

- Status: Accepted
- Date: 2026-09-24
- Commits: `93b55b4c` (replace the withdrawn MinIO image with the Silo fork), `11158e2d` (call the object store what it now is), `8097fc7e` (one-off storage migration workflow), `145a0282` (purge mode for leftover MinIO images), `189b9f8d` (check the vhost through the loopback), all 2026-09-24. Earlier stopgap: `474b73cb` (pull the local minio image from quay.io, 2026-09-19).

## Context

Uploads (workspace logos, editor media, resumes) go to a self-hosted S3-compatible store reached through `src/lib/storage/s3.ts` (AWS SDK, path-style). It was MinIO. Per `93b55b4c`, CI broke overnight with no change of ours: MinIO archived the open-source repository in April and then withdrew its public distribution. Every tag of `quay.io/minio/minio` answered 401, Docker Hub denied `minio/minio` and `minio/mc`, and `dl.min.io` returned 410 for the server binary; no newer tag worked and no public mirror existed. MinIO's current product, AIStor, starts without a license and then denies every S3 operation, so it was not usable without managing a license file in three places.

## Decision

Run Silo, a maintained AGPL fork of the last open-source MinIO server published by the Pigsty project, pinned to a release tag (`docker.io/pgsty/silo:RELEASE.2026-09-16T00-00-00Z`, never `latest`) in CI (`.github/workflows/ci.yml`) and local development (`infra/dev.yml`). `11158e2d` states that production, CI and local development all run Silo.

Verification recorded in `93b55b4c`, against the exact image it replaced: every S3 call the app makes (ListBuckets for the status probe, CreateBucket, HeadBucket, PutObject, GetObject, a presigned browser PUT); a data directory written by MinIO `RELEASE.2025-02-28` mounts unchanged (buckets, objects and the public bucket policy survive), so production migrates by stopping one container and starting the other; `/minio/health/live` and the bundled `mc` still work.

The `MINIO_*` environment variables and the `/minio/health/live` endpoint stay on purpose: they are the names Silo itself reads, inherited from the fork (`11158e2d`).

## Consequences

- No app code changed beyond naming; the storage client is unchanged.
- The `MINIO_*` names remain in code and config and may confuse readers; they are not leftovers.
- The project depends on a small upstream (the Pigsty project) for fixes; the pinned tag must be bumped deliberately.
- Production moved separately from CI, with a backup and someone watching (`93b55b4c`), through the migration workflow `8097fc7e`. TODO: confirm the exact date production completed the switch (the status page copy was already updated on 2026-09-24).
- Operator-provided fact (MinIO withdrew its public images) is corroborated by `93b55b4c`. Production hosting details beyond the commits are not covered here. TODO: confirm.

## Alternatives considered

- Staying on MinIO with a mirrored or cached image: `474b73cb` pulled from quay.io as a stopgap; `93b55b4c` records that no working tag or public mirror remained.
- MinIO AIStor: rejected in `93b55b4c` (license management in three places).
- A hosted S3 provider (inferred, not recorded as evaluated). The status page previously and wrongly called the store "AWS S3" (`98df9245`).

Related: [infrastructure](../architecture/infrastructure.md), [status-page](../architecture/status-page.md).
