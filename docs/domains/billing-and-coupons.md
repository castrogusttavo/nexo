# Billing, trial and coupons

Plans are bought per workspace through AbacatePay (a Brazilian payment gateway). A workspace starts on a 14-day trial of the top self-serve plan, reverts to `FREE` when the trial lapses without a paid subscription, and moves to `PRO` or `BUSINESS` when the gateway confirms payment. This page covers the checkout, the webhook, the trial job, coupons and the plan catalog.

## Contract

`src/schemas/`:

- `subscription.schema.ts`: `CreateSubscriptionSchema` with `plan` (`PRO | BUSINESS`), `workspaceId`, `seats` (integer 1-10,000), `interval` (`monthly | yearly`, from `BILLING_INTERVALS` in `src/config/plan-prices.ts`) and optional `coupon`.
- `coupon.schema.ts`: `couponCode` (trimmed, upper-cased, `^[A-Z0-9_-]{3,32}$`), `ValidateCouponSchema`.
- `plan.schema.ts`: `PlanTier`, feature, limit and capability keys, and `PlanCatalogSchema` that validates `src/config/plans.ts`.

## Data model

`prisma/schema.prisma`:

- `Subscription`: unique `billId` (the gateway's id), `plan`, `status` (`PENDING | PAID | CANCELLED | EXPIRED | REFUNDED`, default `PENDING`), `amount` (cents), `seats`, `interval`, optional `coupon`, `paymentUrl`, `workspaceId` (cascade).
- `Workspace.activePlan` (`FREE | PRO | BUSINESS | ENTERPRISE`) and `Workspace.trialEndsAt`. `activePlan` is what features read; the subscription row is the billing record.

## Plan catalog

- `src/config/plans.ts`: per-tier boolean features (`FEATURE_MIN_TIER`, monotonic: a feature unlocked on a tier stays unlocked above it), numeric limits (`LIMITS`, `null` = unlimited) and graded capabilities. Read it through `can`, `limitOf`, `capabilityOf` in `src/lib/plans.ts`.
- `src/config/plan-prices.ts`: `PAID_PLAN_PRICES` in cents (BRL), the single source of truth that checkout validation compares against. `ENTERPRISE` has no public price (talk to sales, see [careers-and-marketing.md](./careers-and-marketing.md)).
- Only two entitlements are enforced in services today: the seat limit (`limitOf(plan, 'seats')` in `invitation.service.ts`) and `importMembersCsv` (`member.service.ts`). Other features such as `wiki` are declared as `PRO` in the catalog, but a search of `src/`, `app/`, `components/` and `lib/` finds no `can(..., 'wiki')` call. TODO: confirm where the rest of the catalog is enforced, if anywhere.
- The `LIMITS` table gives `FREE` and `BUSINESS` both `seats: 12` and `PRO` `null` (unlimited). That looks odd for a higher tier; TODO: confirm it is intended.

<!-- DIAGRAM NEEDED: billing-checkout-webhook: sequence of checkout (POST /api/payment/plan -> SubscriptionService.create -> AbacatePay -> PENDING Subscription), the webhook (app/api/payment/webhook/route.ts -> handleWebhookEvent -> activateWithPlan/deactivateByBillId) and the hourly trial revert job (src/lib/queue/processors/trial-lifecycle.ts); read src/services/subscription.service.ts and src/repositories/subscription.repository.ts -->

## Checkout (`SubscriptionService.create`)

`src/services/subscription.service.ts`, called from `POST /api/payment/plan`:

1. The actor must be `OWNER` or `ADMIN` of the workspace (`assertMember` plus `isPrivileged`), else `forbidden`.
2. A coupon, if given, is validated against the gateway first.
3. `AbacatePayClient.createSubscription` (`lib/abacatepay.ts`, `https://api.abacatepay.com/v2/subscriptions/create`, bearer key from `lib/env/server`) is called with the gateway product id for the plan and interval (hard-coded in `PLAN_PRODUCTS`), quantity equal to `seats`, `CARD` only, and metadata (`workspaceId`, `plan`, `seats`, `interval`, `coupons`). A gateway failure returns `PAYMENT_ERROR` (502).
4. The amount the gateway reports is checked against `PAID_PLAN_PRICES[plan][interval] * seats`: equal without a coupon, between 0 and the list amount with one. A mismatch is logged and audited as `PAYMENT_AMOUNT_MISMATCH` and returns `PAYMENT_ERROR`, and nothing is stored.
5. A `PENDING` `Subscription` is stored with the `paymentUrl`; the client sends the user there. The route replies 201.

The route also calls `requireConsent(userId, 'page:(private)')` (`src/lib/consent.ts`) before parsing the body.

## Webhook (`POST /api/payment/webhook`)

`app/api/payment/webhook/route.ts`, public in `proxy.ts` (`PUBLIC_ROUTES`), so it authenticates itself:

- A shared secret, from the `webhookSecret` query parameter (the gateway appends it to the registered URL) or the `x-webhook-secret` header, compared in constant time against `ABACATE_PAY_WEBHOOK_SECRET`. Mismatch: 401.
- The payload is validated to `{ event, data: { id } }` only; extra fields are ignored on purpose.
- `SubscriptionService.handleWebhookEvent(event, billId)`:
  - `subscription.completed`: `SubscriptionRepository.activateWithPlan` sets the subscription to `PAID` and the workspace's `activePlan` to the subscribed plan in one transaction.
  - `subscription.cancelled` / `subscription.expired`: `deactivateByBillId` sets `CANCELLED` or `EXPIRED` and puts the workspace back on `FREE`, also in one transaction.
  - Other events are acknowledged and ignored. `REFUNDED` exists in the enum but no handler sets it. TODO: confirm.
- After a state change `WorkspaceCache` is invalidated and an `auditMutation` with `actorId: null` and `source: 'webhook'` is written.
- A service failure returns a flat 500 on purpose: the gateway retries on 5xx, which covers a webhook that arrives before our own write lands. This is the one place that does not use the usual per-code error mapping.

## Trial lifecycle

- `src/config/trial.ts`: `TRIAL_PLAN = 'BUSINESS'`, `TRIAL_DAYS = 14`, `TRIAL_EXPIRY_CRON = '0 * * * *'` (hourly), `TRIAL_BANNER_DAYS = 5`.
- A new workspace is created with that plan and `trialEndsAt` (see [workspace-and-members.md](./workspace-and-members.md)).
- Queue `trial-lifecycle` (`src/lib/queue/jobs.ts`), job `revert-expired-trials`, registered in `worker/index.ts` and scheduled by `scheduleTrialLifecycleJobs` in `src/lib/queue/scheduler.ts`. The processor `src/lib/queue/processors/trial-lifecycle.ts` calls `WorkspaceRepository.revertExpiredTrials`, which moves to `FREE` every workspace with `trialEndsAt` in the past, a non-`FREE` plan and no `PAID` subscription. Cache invalidation failures are logged and do not fail the job, because the database is already the source of truth. See [../architecture/background-jobs.md](../architecture/background-jobs.md).
- The banner decision is made in a client component after hydration (`app/_components/header/header-trial-banner.tsx`), as the project's instant-navigation rules require.

## Coupons

`CouponService.validate` (`src/services/coupon.service.ts`) asks the gateway (`AbacatePayClient.getCoupon`, `/coupons/get`). A coupon is valid only if it exists, its status is `ACTIVE`, and it is not exhausted (`maxRedeems !== -1` and `redeemsCount >= maxRedeems` means exhausted). Otherwise `COUPON_INVALID` (422); a gateway error is `PAYMENT_ERROR`. The mapper (`coupon.mapper.ts`) returns `{ code, discount, discountKind }` (`PERCENTAGE | FIXED`). Coupons live only in the gateway; there is no coupon table. `Subscription.coupon` just records the code used.

## Authorization summary

| Action | Who |
|---|---|
| Validate coupon | any signed-in user (`GET /api/coupons/validate?code=`) |
| Create checkout | `OWNER` or `ADMIN` of the workspace |
| Webhook | holder of the shared secret |
| Delete a workspace | blocked while `activePlan` is not `FREE` |

## Error codes

`COUPON_INVALID` (422), `PAYMENT_ERROR` (502), `FEATURE_NOT_IN_PLAN` (403), `SEAT_LIMIT_REACHED` (403), `WORKSPACE_HAS_ACTIVE_PLAN` (409), all in `src/errors/codes.ts`.

## UI entry points

`app/upgrade/` (`upgrade-form.tsx`, plan, seats and summary cards, `use-upgrade-checkout.ts`), `app/(private)/[workspace-slug]/settings/billing/` (`billing-upgrade.tsx`), `app/_components/header/header-trial-banner.tsx`.

## Caching

Only `WorkspaceCache` (15 min TTL), invalidated by the webhook and the trial job. See [../architecture/caching.md](../architecture/caching.md).

## Tests

- Unit: `src/services/__tests__/{subscription,coupon}.service.test.ts`, `lib/__tests__/abacatepay.test.ts`, `src/lib/__tests__/{plans,trial-lifecycle-processor}.test.ts`, schema and mapper tests.
- Integration: `src/repositories/__tests__/subscription.repository.test.ts`.
- Component: `app/upgrade/_components/__tests__/`, `app/upgrade/_hooks/__tests__/`, the billing and trial banner component tests next to their components.

## Related files

`lib/abacatepay.ts`, `src/repositories/subscription.repository.ts`, `src/mappers/subscription.mapper.ts`, `src/config/{plans,plan-prices,trial}.ts`, `src/lib/plans.ts`, `src/lib/queue/scheduler.ts`.
