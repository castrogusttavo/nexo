import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeSubscription } from '@/src/__tests__/factories/subscription.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  createFakeAbacateSubscription,
  fakeAbacateResponse,
} from '@/src/__tests__/mocks/abacatepay.mock'
import { databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { SubscriptionService } from '@/src/services/subscription.service'

vi.mock('@/lib/abacatepay', () => ({
  AbacatePayClient: { createSubscription: vi.fn() },
}))
vi.mock('@/src/repositories/subscription.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/cache/workspace.cache')

import { AbacatePayClient } from '@/lib/abacatepay'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'

const mockedAbacate = vi.mocked(AbacatePayClient)
const mockedSubRepo = vi.mocked(SubscriptionRepository)
const mockedMembershipRepo = vi.mocked(MembershipRepository)
const mockedWorkspaceCache = vi.mocked(WorkspaceCache)

describe('SubscriptionService', () => {
  describe('create()', () => {
    beforeEach(() => {
      mockedAbacate.createSubscription.mockReset()
    })

    it('should create subscription when OWNER selects PRO plan', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      const bill = createFakeAbacateSubscription({
        id: 'bill_pro_1',
        amount: 4990,
        url: 'https://pay.example.com/c/1',
      })
      const persisted = createFakeSubscription({
        billId: 'bill_pro_1',
        plan: 'PRO',
        status: 'PENDING',
        amount: 4990,
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
      })

      const value = expectOk(result)
      expect(value.billId).toBe('bill_pro_1')
      expect(value.plan).toBe('PRO')
      expect(value.status).toBe('PENDING')

      expect(mockedAbacate.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ id: 'prod_0BcjnDNaGQZdpgnKbfnhzRJL', quantity: 1 }],
          methods: ['CARD'],
          metadata: { workspaceId: 'ws1', plan: 'PRO' },
        }),
      )
      expect(mockedSubRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billId: 'bill_pro_1',
          plan: 'PRO',
          status: 'PENDING',
          workspaceId: 'ws1',
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
      mockedAbacate.createSubscription.mockResolvedValue(fakeAbacateResponse())
      mockedSubRepo.create.mockResolvedValue(ok(createFakeSubscription()))

      const result = await SubscriptionService.create('admin', {
        plan: 'PRO',
        workspaceId: 'ws1',
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
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedAbacate.createSubscription).not.toHaveBeenCalled()
    })

    it('should reject unknown plan', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )

      const result = await SubscriptionService.create('owner', {
        plan: 'UNKNOWN' as 'PRO',
        workspaceId: 'ws1',
      })

      const error = expectErr(result, 'BAD_REQUEST')
      expect(error.message).toContain('Plano inválido')
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
      mockedAbacate.createSubscription.mockResolvedValue(fakeAbacateResponse())
      mockedSubRepo.create.mockResolvedValue(err(databaseError()))

      const result = await SubscriptionService.create('owner', {
        plan: 'PRO',
        workspaceId: 'ws1',
      })

      expectErr(result, 'DATABASE_ERROR')
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

    it('should mark subscription cancelled on cancelled event', async () => {
      const subscription = createFakeSubscription({ billId: 'bill_xyz' })
      mockedSubRepo.findByBillId.mockResolvedValue(ok(subscription))
      mockedSubRepo.updateStatusByBillId.mockResolvedValue(
        ok({ ...subscription, status: 'CANCELLED' }),
      )

      const result = await SubscriptionService.handleWebhookEvent(
        'subscription.cancelled',
        'bill_xyz',
      )

      expectOk(result)
      expect(mockedSubRepo.updateStatusByBillId).toHaveBeenCalledWith(
        'bill_xyz',
        'CANCELLED',
      )
      expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
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
