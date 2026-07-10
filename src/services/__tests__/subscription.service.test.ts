import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeSubscription } from '@/src/__tests__/factories/subscription.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  createFakeAbacateSubscription,
  fakeAbacateResponse,
} from '@/src/__tests__/mocks/abacatepay.mock'
import { couponInvalid, databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { SubscriptionService } from '@/src/services/subscription.service'

vi.mock('@/lib/abacatepay', () => ({
  AbacatePayClient: { createSubscription: vi.fn() },
}))
vi.mock('@/src/repositories/subscription.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/cache/workspace.cache')
vi.mock('@/src/services/coupon.service')

import { AbacatePayClient } from '@/lib/abacatepay'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'
import { CouponService } from '@/src/services/coupon.service'

const mockedAbacate = vi.mocked(AbacatePayClient)
const mockedSubRepo = vi.mocked(SubscriptionRepository)
const mockedMembershipRepo = vi.mocked(MembershipRepository)
const mockedWorkspaceCache = vi.mocked(WorkspaceCache)
const mockedCoupon = vi.mocked(CouponService)

describe('SubscriptionService', () => {
  describe('create()', () => {
    beforeEach(() => {
      mockedAbacate.createSubscription.mockReset()
      mockedCoupon.validate.mockReset()
    })

    it('should create subscription when OWNER selects PRO plan', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      const bill = createFakeAbacateSubscription({
        id: 'bill_pro_1',
        amount: 4302,
        url: 'https://pay.example.com/c/1',
      })
      const persisted = createFakeSubscription({
        billId: 'bill_pro_1',
        plan: 'PRO',
        status: 'PENDING',
        amount: 4302,
        paymentUrl: 'https://pay.example.com/c/1',
        workspaceId: 'ws1',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(bill),
      )
      mockedSubRepo.create.mockResolvedValue(ok(persisted))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      const value = expectOk(result)
      expect(value.billId).toBe('bill_pro_1')
      expect(value.plan).toBe('PRO')
      expect(value.status).toBe('PENDING')

      expect(mockedAbacate.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ id: 'prod_hhYrXssxdQuRx1TcNAH4YpH3', quantity: 1 }],
          methods: ['CARD'],
          metadata: {
            workspaceId: 'ws1',
            plan: 'PRO',
            seats: 1,
            interval: 'monthly',
          },
        }),
      )
      expect(mockedSubRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billId: 'bill_pro_1',
          plan: 'PRO',
          status: 'PENDING',
          workspaceId: 'ws1',
          seats: 1,
          interval: 'MONTHLY',
        }),
      )
    })

    it('should allow ADMIN to create subscription', async () => {
      const membership = createFakeMembership({
        userId: 'admin',
        workspaceId: 'ws1',
        role: 'ADMIN',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(createFakeAbacateSubscription({ amount: 4302 })),
      )
      mockedSubRepo.create.mockResolvedValue(ok(createFakeSubscription()))

      const result = await SubscriptionService.create('admin', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      expectOk(result)
    })

    it('should forbid MEMBER from changing plan', async () => {
      const membership = createFakeMembership({
        userId: 'm1',
        workspaceId: 'ws1',
        role: 'MEMBER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )

      const result = await SubscriptionService.create('m1', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      const error = expectErr(result, 'FORBIDDEN')
      expect(error.message).toContain('OWNER ou ADMIN')
      expect(mockedAbacate.createSubscription).not.toHaveBeenCalled()
    })

    it('should return forbidden when user is not a member', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await SubscriptionService.create('outsider', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedAbacate.createSubscription).not.toHaveBeenCalled()
    })

    it('should propagate persistence error after AbacatePay succeeds', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(createFakeAbacateSubscription({ amount: 4302 })),
      )
      mockedSubRepo.create.mockResolvedValue(err(databaseError()))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should charge per seat on the interval product', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(
          createFakeAbacateSubscription({ id: 'bill_b1', amount: 585767 }),
        ),
      )
      mockedSubRepo.create.mockResolvedValue(
        ok(createFakeSubscription({ billId: 'bill_b1' })),
      )

      await SubscriptionService.create('owner', {
        plan: 'BUSINESS',
        workspaceId: 'ws1',
        seats: 7,
        interval: 'yearly',
      })

      expect(mockedAbacate.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ id: 'prod_pKMcBAhqDXZUyTcn4geBPDje', quantity: 7 }],
        }),
      )
      expect(mockedSubRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ seats: 7, interval: 'YEARLY' }),
      )
    })

    it('should return PAYMENT_ERROR when the gateway call fails', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(
          createFakeMembership({
            userId: 'owner',
            workspaceId: 'ws1',
            role: 'OWNER',
          }),
        ),
      )
      mockedAbacate.createSubscription.mockRejectedValue(new Error('401'))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
      })

      expectErr(result, 'PAYMENT_ERROR')
      expect(mockedSubRepo.create).not.toHaveBeenCalled()
    })

    it('should return PAYMENT_ERROR when charged amount diverges from expected', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(
          createFakeMembership({
            userId: 'owner',
            workspaceId: 'ws1',
            role: 'OWNER',
          }),
        ),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        // esperado p/ PRO monthly x2 = 8604; devolvemos 4302 (como se ignorasse seats)
        fakeAbacateResponse(
          createFakeAbacateSubscription({ id: 'bill_x', amount: 4302 }),
        ),
      )

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 2,
        interval: 'monthly',
      })

      expectErr(result, 'PAYMENT_ERROR')
      expect(mockedSubRepo.create).not.toHaveBeenCalled()
    })

    it('should forward a valid coupon and persist it', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      // PRO monthly list = 4302; discounted bill below list
      const bill = createFakeAbacateSubscription({ id: 'bill_c', amount: 3441 })
      const persisted = createFakeSubscription({
        billId: 'bill_c',
        plan: 'PRO',
        amount: 3441,
        workspaceId: 'ws1',
        coupon: 'BLACKFRIDAY',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedCoupon.validate.mockResolvedValue(
        ok({ code: 'BLACKFRIDAY', discount: 20, discountKind: 'PERCENTAGE' }),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(bill),
      )
      mockedSubRepo.create.mockResolvedValue(ok(persisted))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
        coupon: 'BLACKFRIDAY',
      })

      expectOk(result)
      expect(mockedCoupon.validate).toHaveBeenCalledWith({
        code: 'BLACKFRIDAY',
      })
      expect(mockedAbacate.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ coupons: ['BLACKFRIDAY'] }),
      )
      expect(mockedSubRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ coupon: 'BLACKFRIDAY' }),
      )
    })

    it('should reject an invalid coupon before calling the gateway', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedCoupon.validate.mockResolvedValue(err(couponInvalid()))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
        coupon: 'NOPE',
      })

      expectErr(result, 'COUPON_INVALID')
      expect(mockedAbacate.createSubscription).not.toHaveBeenCalledWith()
    })

    it('should reject whena a coupon bill exceeds the list price', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      // PRO monthly list = 4302; charged above -> fraud.
      const bill = createFakeAbacateSubscription({
        id: 'bill_over',
        amount: 5000,
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedCoupon.validate.mockResolvedValue(
        ok({ code: 'X', discount: 10, discountKind: 'PERCENTAGE' }),
      )
      mockedAbacate.createSubscription.mockResolvedValue(
        fakeAbacateResponse(bill),
      )

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
        seats: 1,
        interval: 'monthly',
        coupon: 'X',
      })

      expectErr(result, 'PAYMENT_ERROR')
      expect(mockedSubRepo.create).not.toHaveBeenCalledWith()
    })
  })

  describe('handleWebhookEvent()', () => {
    it('should activate subscription and invalidate workspace cache on completed', async () => {
      const subscription = createFakeSubscription({
        billId: 'bill_xyz',
        workspaceId: 'ws1',
        plan: 'PRO',
      })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))
      mockedSubRepo.activateWithPlan.mockResolvedValue(ok(subscription))
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.completed',
        'bill_xyz',
      )

      expectOk(result)
      expect(mockedSubRepo.activateWithPlan).toHaveBeenCalledWith(
        'bill_xyz',
        'PRO',
      )
      expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws1')
    })

    it('should revert plan to FREE and invalidate cache on cancelled', async () => {
      const subscription = createFakeSubscription({
        billId: 'bill_xyz',
        workspaceId: 'ws1',
      })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))
      mockedSubRepo.deactivateByBillId.mockResolvedValue(
        ok({ ...subscription, status: 'CANCELLED' }),
      )
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.cancelled',
        'bill_xyz',
      )

      expectOk(result)
      expect(mockedSubRepo.deactivateByBillId).toHaveBeenCalledWith(
        'bill_xyz',
        'CANCELLED',
      )
      expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws1')
    })

    it('should revert plan to FREE on expired', async () => {
      const subscription = createFakeSubscription({
        billId: 'bill_exp',
        workspaceId: 'ws1',
      })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))
      mockedSubRepo.deactivateByBillId.mockResolvedValue(
        ok({ ...subscription, status: 'EXPIRED' }),
      )
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.expired',
        'bill_exp',
      )

      expectOk(result)
      expect(mockedSubRepo.deactivateByBillId).toHaveBeenCalledWith(
        'bill_exp',
        'EXPIRED',
      )
    })

    it('should ignore unknown events without erroring', async () => {
      const subscription = createFakeSubscription({ billId: 'bill_xyz' })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.something_else',
        'bill_xyz',
      )

      expectOk(result)
      expect(mockedSubRepo.activateWithPlan).not.toHaveBeenCalled()
      expect(mockedSubRepo.updateStatusByBillId).not.toHaveBeenCalled()
    })

    it('should propagate not-found when bill is unknown', async () => {
      mockedSubRepo.findByBillId.mockResolvedValue(
        err(notFound('Subscription')),
      )

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.completed',
        'bill_unknown',
      )

      expectErr(result, 'RESOURCE_NOT_FOUND')
      expect(mockedSubRepo.activateWithPlan).not.toHaveBeenCalled()
    })

    it('should propagate activation error and skip cache invalidation', async () => {
      const subscription = createFakeSubscription({
        billId: 'bill_xyz',
        workspaceId: 'ws1',
        plan: 'PRO',
      })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))
      mockedSubRepo.activateWithPlan.mockResolvedValue(err(databaseError()))

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.completed',
        'bill_xyz',
      )

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
    })
  })
})
