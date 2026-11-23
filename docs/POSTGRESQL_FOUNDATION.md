# PostgreSQL foundation — production architecture milestone

This milestone creates **database schemas, constraints and CI tests** aligned with `SPEC-1-Letzmeet-MVP.md`. **It does not create live production API services or authorise real-user data.**

## What exists

- `migrations/core/001_foundation.sql`: Core database with user age-verification gate, profiles, photo grants, blocks, likes, canonical matches, ciphertext-only messages, reports, subscriptions, payment-event deduplication and transactional outbox.
- `migrations/vault/001_foundation.sql`: **separate database** with disclosure subjects, ciphertext, per-person consent, revocation, audited read function, policy versioning and immutable audit triggers.
- `migrations/tests/*.test.sql`: real PostgreSQL invariant checks using synthetic UUIDs, grant expiration/revocation and transaction-scoped rollback.
- `.github/workflows/postgres-foundation-ci.yml`: CI spins up PostgreSQL 16 with isolated disposable core/vault databases and runs SQL tests.

## Critical technical distinctions

**Separation**: Two databases in CI demonstrate schema isolation, not production network/IAM isolation. Production requires different credentials, distinct IAM roles/KMS keys, private network ACLs and separate deployments.

**Runtime privilege hardening**: Database migrations run with a privileged schema-owner role for CI. Production must provision a dedicated Vault service role, restrict table SELECT/UPDATE and grant EXECUTE on reviewed functions only. Those roles and GRANT scripts are **not implemented**.

**Audited disclosure**: `vault_read_disclosure` evaluates a time-limited grant, records an allowed/denied audit row and returns encrypted data to an authorised backend. It does not itself verify active mutual matching or a Core-side block; the Core API must check those rules before calling the Vault. Core blocking writes an outbox event atomically, but a durable worker and cross-service propagation monitoring remain unimplemented. Do **not** call the function from a mobile client.

**Age verification**: Database enforces that `active` users must have `age_verified_at`. It does not provide verification or validate identity. Synthetic account self-attestation in the separate sandbox is not proof of adulthood.

**Ciphertext-only storage**: Schema prohibits empty/very short message/disclosure ciphertext; it does not perform encryption. Application-level envelope encryption with production KMS, key rotation and secure deletion is still required.

**Audit immutability**: Triggers reject ordinary UPDATE/DELETE operations on audit rows. Database owners and superusers can still disable triggers; immutable offsite storage and tamper-resistant privileged access are pending.

**Migration lifecycle**: Migration 001 is a reviewed first-time migration, not safe automatic schema syncing. Apply new changes using explicitly numbered forward migrations, tested with backups, change plans and rollback/mitigation steps.

## Local SQL testing (optional PostgreSQL 16 installation)

Use separate **disposable databases**. Never run these tests against production:

```sh
createdb letzmeet_core_ci
createdb letzmeet_vault_ci
psql -X -v ON_ERROR_STOP=1 -d letzmeet_core_ci -f migrations/core/001_foundation.sql
psql -X -v ON_ERROR_STOP=1 -d letzmeet_core_ci -f migrations/tests/core.test.sql
psql -X -v ON_ERROR_STOP=1 -d letzmeet_vault_ci -f migrations/vault/001_foundation.sql
psql -X -v ON_ERROR_STOP=1 -d letzmeet_vault_ci -f migrations/tests/vault.test.sql
```

## Required before real users

1. Production auth + identity verification with OAuth/OIDC/Cognito, server verification of signatures and scopes.
2. NestJS Core API and separated NestJS Vault connecting with appropriately restricted PostgreSQL roles and migrations.
3. Kysely query layer, durable idempotent outbox worker, broker/retry/dead-letter handling, consent cache invalidation under 60 seconds.
4. Formal ownership and approved data retention/deletion, audited backups, key lifecycle and breach response.
5. Independent security test, native Android/iOS E2E, moderator portal and 24/7 P1 readiness, legal POPIA assessment.

No secrets or production credentials are committed here.
