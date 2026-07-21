# Acecerty Backend — Iteration 1

NestJS · TypeORM · PostgreSQL · JWT · Paystack + Flutterwave

Backend for the Acecerty IT-certification training & exam-prep platform. Iteration 1
covers auth, course catalog, exam catalog + question bank, the server-authoritative
exam engine, commerce (cart/orders/payments), entitlements, and admin reporting.
(LMS features — video, progress, certificates — are deferred to Iteration 2 but the
schema is modelled to accommodate them.)

## Quick start

```bash
cp .env.example .env          # then fill in DB + provider keys
npm install
createdb acecerty             # or create the DB however you like
npm run seed                  # admin user + sample catalog + CISSP free-demo exam
npm run start:dev             # http://localhost:3000/api
```

With `DB_SYNCHRONIZE=true` (dev default) the schema is auto-created from entities.
For production, set it to `false` and use migrations.

Default seeded admin: `admin@acecerty.com` / `Admin123!` (override via `SEED_ADMIN_*`).

## Decisions taken (PRD §9 open questions)

| # | Decision |
|---|----------|
| DB | PostgreSQL (jsonb, citext-style emails) |
| Questions | Fixed-form (`question.exam_id`) |
| Free demo | Dedicated demo `Exam` per product; **requires login**, bypasses entitlement |
| Retakes | Unlimited within the 90-day entitlement window |
| Bootcamp | Order + entitlement only (no cohort capture in Iteration 1) |
| PK | UUID project-wide |
| Guest checkout | Account-first (must register) |
| Reviews | Admin-set rating aggregates |

## Conventions

- Money is stored as **integer minor units (kobo)**; `currency` defaults to `NGN`.
- Every table has `created_at` / `updated_at` / `deleted_at` (soft delete).
- List endpoints return `{ data, meta: { page, limit, total, totalPages } }`.
- Auth: `Authorization: Bearer <access>`; rotating refresh tokens.
- `is_correct` is **never** returned for an in-progress attempt — only on `/review`.

## API surface (prefix `/api`)

**Auth** — `POST /auth/register|login|refresh|logout|forgot-password|reset-password|verify-email`, `GET /me`
**Catalog (public)** — `GET /courses`, `GET /courses/:slug`, `GET /exam-products`, `GET /exam-products/:slug`, `GET /instructors`
**Admin catalog** — `POST/PATCH/DELETE /admin/{courses,instructors,exam-products}` (+ nested modules/lessons/exams/topics), `PATCH …/publish`, `POST /admin/uploads`
**Questions** — `GET /admin/exams/:examId/questions`, `POST/PATCH/DELETE /admin/questions`, `POST /admin/exams/:examId/questions/import`
**Exam engine** — `POST /exams/:examId/attempts`, `GET /attempts/:id`, `PATCH /attempts/:id/items/:questionId`, `POST /attempts/:id/submit`, `GET /attempts/:id/results|review`, `GET /me/attempts`
**Commerce** — `GET/POST/PUT/DELETE /cart` + `/cart/items`, `POST /orders`, `POST /orders/:id/pay`, `GET /orders/:id`, `GET /me/orders`, `GET /me/entitlements`
**Webhooks** — `POST /webhooks/paystack`, `POST /webhooks/flutterwave` (signature-verified, idempotent)
**Admin ops** — `GET /admin/users` (+ `PATCH /admin/users/:id`), `GET /admin/{orders,payments,attempts,audit-logs}`, `GET /admin/dashboard/stats`

## Question bulk-import format

`POST /admin/exams/:examId/questions/import` accepts:

```jsonc
// JSON
{ "format": "json", "rows": [
  { "text": "…", "explanation": "…", "topicId": "<uuid?>",
    "options": [{ "text": "A", "isCorrect": true }, { "text": "B", "isCorrect": false }] }
]}

// CSV (header row required)
{ "format": "csv", "content": "text,explanation,optionA,optionB,optionC,optionD,correct\n…" }
```

`correct` is a letter (A–F) or a 1-based index. The response reports per-row
success/error with row numbers.

## Notes

- Email delivery is out of scope in Iteration 1: verification/reset tokens are
  logged and (for register) returned in the response for testing.
- Uploads use local disk; swap `diskStorage` for S3/Cloudinary in production.
- Overdue in-progress attempts and expired entitlements are swept every minute
  (`@nestjs/schedule`), with a lazy check on read as a fallback.
