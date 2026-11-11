# CCMS DEV Database Reconciliation Audit

**Date:** 11 November 2026  
**Repository branch reviewed:** `remediation/phase1-brd-alignment`  
**Scope:** Read-only comparison of the previously supplied DEV spreadsheet screenshot, Apps Script Project Settings screenshot, and repository schema/code. No Google Drive, spreadsheet, Apps Script property, Cloudflare resource, or deployment was changed.

## Executive result

The DEV database must **not** be recreated. The Apps Script project already has a non-empty `CCMS_SPREADSHEET_ID`, and `setupDatabase()` explicitly refuses to run when that property is present.

The repository's current schema requires nine application sheets:

1. `CONFIG`
2. `PUBLIC_MENU`
3. `USERS`
4. `ROLES`
5. `PERMISSIONS`
6. `USER_ROLES`
7. `AUDIT_LOG`
8. `LOGIN_ATTEMPTS`
9. `REVOKED_SESSIONS`

The previously supplied spreadsheet screenshot showed the first eight named application sheets and a default `Sheet1`; `REVOKED_SESSIONS` was not visible. This is a schema mismatch that must be reconciled before using this DEV backend with the current authentication code.

## Findings

| Finding | Evidence | Risk / action |
|---|---|---|
| `CCMS_SPREADSHEET_ID` exists | Apps Script Project Settings screenshot | Do not run setup or create a replacement DB. |
| `SESSION_SECRET` exists | Same screenshot | Preserve the current value as requested; do not rotate it during this reconciliation. |
| `CCMS_ENV` was not visible | Same Script Properties screenshot showed the two properties above | The migration script requires an explicit environment. Confirm/add `CCMS_ENV=DEV` before running the migration; do not infer it from a deployment URL. |
| `REVOKED_SESSIONS` was not visible in the spreadsheet tabs | Previously supplied `CCMS-DEV-DB` screenshot | Add it using the existing one-time migration, not `setupDatabase()`. |
| `Sheet1` was visible | Same spreadsheet screenshot | Do not delete or rename it until its contents and formulas are confirmed empty. It may be the untouched default tab created with a new spreadsheet. |
| Fresh setup can leave a default tab | `SetupDatabase.gs` inserts named sheets but does not remove the spreadsheet's initial default sheet | Fix only for future fresh database creation; do not rerun setup on DEV. |
| Current authentication requires `REVOKED_SESSIONS` | `Auth.verifyToken()` throws `DB_MIGRATION_REQUIRED` if the sheet is missing | DEV login/session validation may fail until the schema migration is completed. |

## Safe reconciliation procedure for DEV

This is a controlled, additive migration. It does not replace the spreadsheet and does not change `SESSION_SECRET`.

1. In Apps Script project **CCMS Backend (DEV)**, confirm `CCMS_SPREADSHEET_ID` points to the existing `CCMS-DEV-DB`. Do not copy or publish the ID in chat.
2. Create a backup copy of the existing spreadsheet in Google Drive before any schema change. Keep the backup private and label it clearly as a pre-migration DEV backup.
3. In that same Apps Script project, ensure Script Property `CCMS_ENV` is exactly `DEV`. Do not change `CCMS_SPREADSHEET_ID` or `SESSION_SECRET`.
4. Confirm that the existing spreadsheet does not already contain a hidden or differently named revocation ledger. Search all tabs for `REVOKED_SESSIONS`.
5. Run `migrateSessionRevocationSheet()` once from the Apps Script editor. The function checks `CCMS_ENV`, the database pointer, and whether the sheet already exists; it adds only the four required header columns and protects the new sheet.
6. Verify that `REVOKED_SESSIONS` exists with headers exactly `session_id`, `user_id`, `revoked_at`, `expires_at`.
7. Perform a controlled DEV-only login, authenticated request, and logout/login-again test. Confirm that the revoked session is rejected and a fresh login works.
8. Keep `Sheet1` untouched until its contents are inspected. If it is confirmed completely empty and unused, it can be removed later as a separate cleanup action.

## Important guardrails

- Never run `setupDatabase()` against the existing DEV project.
- Never clear or replace `CCMS_SPREADSHEET_ID`.
- Preserve the current `SESSION_SECRET` as requested.
- Do not run this migration against STAGING or PROD from the DEV project.
- Do not create UAT accounts until STAGING exists and its isolation has been verified.
- This audit does not prove live sheet contents beyond the screenshots supplied; final verification must be done in the Google UI.

## Code references

- `backend/apps-script/tools/SetupDatabase.gs` — initial database creation; refuses to run when the DB pointer exists.
- `backend/apps-script/tools/MigrateSessionRevocation.gs` — additive migration for the missing ledger.
- `backend/apps-script/Auth.gs` — requires `REVOKED_SESSIONS` during token verification and logout.
- `docs/database/DATA_DICTIONARY_TAHAP1.md` — canonical nine-sheet schema.
