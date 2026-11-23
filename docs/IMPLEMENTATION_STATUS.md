# Letzmeet implementation status — 23 November 2026

**Repository:** `edubonke/Letzmeet`. **Branch:** `feature/sandbox-accounts-vault-payments`. **Release classification:** synthetic-data development sandbox; no production release authorised.

## Implemented in this branch

| Workstream | Development-only implementation | Scope |
| --- | --- | --- |
| Accounts & Core API | Local registration with age self-certification, scrypt sandbox passwords, expiring opaque sessions, profiles, discovery, mutual matches, encrypted chat, blocks, report intake | Local Node HTTP + SQLite only |
| Privacy Vault | Separate loopback service and SQLite database; AES-256-GCM ciphertext; signed internal calls; consent grant, read, revoke, audit records | Local static keys; no AWS KMS |
| Payments & Logs | HMAC-signed, timestamp-checked, idempotent **synthetic** payment events, entitlement state, allowlisted technical logs | Checkout responds HTTP 501, no real provider |
| Integration and automated tests | Five real HTTP integration tests against in-memory stores; negative auth, blocked access, consent revocation, signature/replay checks, outbox retry | Unit/integration evidence only, no external audit |
| Mobile | Preserved original Expo fictional demo, optional `LiveApp.tsx` sandbox API connection | Android/iOS native flows **not yet verified** |

## Non-negotiable production blockers

1. **Do not deploy this sandbox publicly.** Replace or formally approve its tech stack against SPEC-1. Approved production design is Expo RN, NestJS Core API, separately deployed NestJS Privacy Vault, Cognito, PostgreSQL, Kysely migrations, Redis, S3 and AWS Cape Town.
2. Real adult age assurance, email OTP/managed sessions, MFA/step-up, abuse controls and identity verification are not integrated.
3. Production KMS/IAM key separation, key rotation, isolated infrastructure, audit durability, privacy-safe backups and disaster recovery are not integrated.
4. Moderator portal, P1 24/7 response partner, human case work, appeals, evidence retention and emergency/safety escalation are absent.
5. Trusted contacts, safe-date check-in with ten-minute grace countdown, private-photo manual grants, deletion within 30 days and multilingual critical journeys are missing.
6. No actual Apple/Google billing or hosted merchant payments, reconciliation, tax/refund/chargeback handling. Signed synthetic webhook is not financial settlement.
7. No final accessibility, traffic/load, availability, 60-second consent-revocation under failure, backup restore, native-device, or real-world production testing.
8. POPIA assessment, contractual operator agreements, privacy terms, PAIA manual, legal/regulator decisions and independent penetration test remain outside this repository.

## Deployment rule

Only use fabricated test records on development devices. No real health status, identity documents, payment cards, personal messages, exact locations or sensitive reports. A code PR/CI success cannot certify security or legal compliance. Project management must approve a staged implementation and external release gates separately.

## Next engineering milestones

- Migrate sandbox domain rules into approved architecture with reviewed PostgreSQL migrations and contract tests.
- Integrate managed authentication, provider-hosted payment receipts, scoped IAM/KMS and durable event delivery.
- Implement moderation operations, safety alerts, deletion/retention and translated accessible UI.
- Complete external POPIA/security reviews and mobile acceptance testing. Do not remove the local-only safeguards until a separate production architecture and risk sign-off exists.
