# Letzmeet

Privacy-first adult relationship app for South Africa. This repository contains the preserved Expo demonstration and an **optional, local synthetic-data integration sandbox**. It is **NOT a production dating service** and must **not collect real user, identity, payment, health, location or safety-report data**.

## Source structure

- `Letzmeet-Team-Demo-App/App.tsx`: original fictional-data demonstration, preserved unchanged.
- `Letzmeet-Team-Demo-App/LiveApp.tsx`: optional local integration experience selected with `EXPO_PUBLIC_LETZMEET_SANDBOX=1`; only for synthetic testing.
- `platform/src/core.mjs`: local API: accounts, profiles, discovery, mutual likes, matched messages, blocking, reports, entitlements and signed mock payment events.
- `platform/src/vault.mjs`: isolated local Privacy Vault service with a distinct test database, consent grants, revocation and audit records.
- `platform/test/integration.test.mjs`: HTTP integration and negative security tests.
- `migrations/core/001_foundation.sql` and `002_interaction_guards.sql`: reviewed PostgreSQL schema, interaction guards and transactional block outbox.\n- `migrations/vault/001_foundation.sql`: separate PostgreSQL Vault schema, consent/audit functions and revocation.\n- `migrations/tests/*.test.sql`: real PostgreSQL database-level tests, run in GitHub Actions.\n- `docs/POSTGRESQL_FOUNDATION.md`: database architecture, CI and remaining hardening.\n- `docs/IMPLEMENTATION_STATUS.md`: implementation boundaries, missing features and release blockers.
- `docs/VALIDATION_REPORT.md`: what has actually been tested and not tested.

## Quick start: synthetic test users only

Requires Node.js 22.16+ and OpenSSL. On Linux/macOS:

```sh
cd platform
bash scripts-run-local.sh
```

The launcher generates ignored local-only secrets and starts the API at `127.0.0.1:4181` and Vault at `127.0.0.1:4182`. No public listener. Use invented accounts like `alpha@example.test`, never actual personal details.

Run tests:

```sh
cd platform
npm run check
npm test
```

The default Expo entry still loads the original team demo. For Android emulator synthetic integration:

```sh
cd Letzmeet-Team-Demo-App
EXPO_PUBLIC_LETZMEET_SANDBOX=1 EXPO_PUBLIC_LETZMEET_API_URL=http://10.0.2.2:4181 npm run android
```

The Node API is bound to host loopback. Emulator access through `10.0.2.2` depends on your emulator/host networking and may require additional local proxy configuration. **Native device/emulator integration has not yet been run.**

## Critical release boundary

This sandbox uses experimental Node SQLite and local test passwords rather than the approved NestJS/Cognito/PostgreSQL/Kysely/KMS production architecture. There is **no real checkout, hosted payments, age verification, operational moderation portal, 24/7 P1 coverage, international compliance approval, independent security test or POPIA sign-off**. All these remain release blockers. The mobile integration and test server must never be exposed publicly.

Review the docs before merging, and obtain an explicit architecture/security approval before any real-user deployment.
