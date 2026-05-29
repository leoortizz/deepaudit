# Acme inventory webapp

A Next.js 15 monorepo for an internal inventory + procurement webapp.
~150k LOC. Backend API in `src/api/`, server-only library in
`src/lib/`, admin tools under `src/api/admin/` and `src/app/admin/`,
billing in `src/api/billing/`. Postgres via Drizzle, Stripe for
subscriptions, Auth.js (NextAuth v5) for authentication, custom
`auth.has(actor, action, resource)` helper for authorization.

## Auth shape

- **Authentication**: Auth.js with email magic-link + GitHub OAuth.
  `getServerSession(req)` returns `{ user: { id, email, role } | null }`.
  `req.session` is the same shape, attached by middleware.
- **Authorization**: every API handler MUST call
  `auth.has(req.session.user, action, resource)` before mutating or
  reading sensitive data. Never `req.session.user.role === "admin"`
  directly — that's a code smell.
- **Rate limiting**: every public handler wraps with
  `withRateLimit(handler, { window: "1m", max: 60 })`. Internal-only
  routes under `src/api/_internal/` skip rate limiting (private VPC).
  Webhook receivers under `src/api/webhooks/` use signature verification
  instead and skip rate limiting.

## Rules that matter most

The webapp holds inventory data, supplier credentials (encrypted),
purchase orders, and billing details. The conventions the reviewer
should enforce most strictly:

1. **Tenant scoping** — every record has a `companyId` and a `userId`.
   A handler that reads or writes by `id` without also filtering by
   `req.session.user.companyId` breaks tenant isolation. Flag it.
2. **Role assignment location** — the `role` field may only be set in
   `src/api/admin/users/promote.ts`. Flag `role` assignments anywhere
   else in the user-update endpoints.
3. **Stripe webhook verification** — `src/api/webhooks/stripe.ts` calls
   `verifyStripeSignature(req)`. Any handler that processes Stripe
   events without it is non-conformant.
4. **Encrypted credential handling** — credentials are stored with
   `vault.encrypt(value, { context })`. Decryption sites that omit the
   `context` argument, log decrypted values, or return them in API
   responses break the rule.
5. **Debug endpoints** — endpoints gated only on
   `NODE_ENV !== "production"` (e.g. `/api/_dev/dump-cache`) must never
   be reachable in production. Flag any that rely on the env flag alone.

## False-positive sources to ignore

- `src/scripts/migrations/**` — one-shot migrations run via
  `tsx scripts/migrations/<file>.ts`. They legitimately read/write
  across tenants because they're admin-run.
- `src/lib/seed/**` — DB seed data, dev-only.
- Any file under `__tests__/` or matching `*.test.ts` / `*.spec.ts`.
- `src/api/_internal/health.ts` — private health endpoint, no auth on
  purpose (private VPC, behind service mesh).

## Conventions worth knowing

- Drizzle queries use the `db.query.<table>.findFirst({ where, with })`
  builder. `db.execute(sql\`...\`)` is forbidden by lint; flag any.
- The custom `safeRedirect(targetUrl)` helper validates the destination
  against an `ALLOWED_HOSTS` list. Any redirect that doesn't go through
  `safeRedirect` is non-conformant.
- Server actions live in `src/actions/`. They start with `"use server"`
  and must call `auth.has(...)` like API routes.
