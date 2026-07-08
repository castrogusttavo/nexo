import { describe, expect, it } from 'vitest'
import { seedSubscription } from '@/src/__tests__/factories/subscription.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'

describe('SubscriptionRepository', () => {
  describe('create()', () => {
    it('should persist a subscription tied to a workspace', async () => {
      const ws = await seedWorkspace()

      const result = await SubscriptionRepository.create({
        billId: 'bill_create_1',
        plan: 'PRO',
        status: 'PENDING',
        amount: 4990,
        seats: 5,
        interval: 'YEARLY',
        paymentUrl: 'https://pay/c/1',
        workspaceId: ws.id,
      })

      const sub = expectOk(result)
      expect(sub.billId).toBe('bill_create_1')
      expect(sub.workspaceId).toBe(ws.id)
      expect(sub.status).toBe('PENDING')
      expect(sub.seats).toBe(5)
      expect(sub.interval).toBe('YEARLY')
    })

    it('should return DATABASE_ERROR on duplicate billId', async () => {
      const ws = await seedWorkspace()
      await seedSubscription({ workspaceId: ws.id, billId: 'bill_dup' })

      const result = await SubscriptionRepository.create({
        billId: 'bill_dup',
        plan: 'PRO',
        status: 'PENDING',
        amount: 100,
        seats: 1,
        interval: 'MONTHLY',
        paymentUrl: 'https://pay/c/x',
        workspaceId: ws.id,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('findByBillId()', () => {
    it('should return subscription when billId exists', async () => {
      const ws = await seedWorkspace()
      const seeded = await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_lookup',
      })

      const result = await SubscriptionRepository.findByBillId('bill_lookup')

      const sub = expectOk(result)
      expect(sub.id).toBe(seeded.id)
    })

    it('should return RESOURCE_NOT_FOUND when billId is unknown', async () => {
      const result = await SubscriptionRepository.findByBillId('bill_unknown')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('findActiveByWorkspaceId()', () => {
    it('should return the most recent PAID subscription', async () => {
      const ws = await seedWorkspace()
      await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_old',
        status: 'PAID',
      })
      const newer = await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_new',
        status: 'PAID',
      })

      const result = await SubscriptionRepository.findActiveByWorkspaceId(ws.id)

      const sub = expectOk(result)
      expect(sub?.id).toBe(newer.id)
    })

    it('should return null when no PAID subscription exists', async () => {
      const ws = await seedWorkspace()
      await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_pend',
        status: 'PENDING',
      })

      const result = await SubscriptionRepository.findActiveByWorkspaceId(ws.id)

      const sub = expectOk(result)
      expect(sub).toBeNull()
    })
  })

  describe('updateStatusByBillId()', () => {
    it('should update status', async () => {
      const ws = await seedWorkspace()
      await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_upd',
        status: 'PENDING',
      })

      const result = await SubscriptionRepository.updateStatusByBillId(
        'bill_upd',
        'CANCELLED',
      )

      const sub = expectOk(result)
      expect(sub.status).toBe('CANCELLED')
    })

    it('should return DATABASE_ERROR when billId does not exist', async () => {
      const result = await SubscriptionRepository.updateStatusByBillId(
        'bill_missing',
        'PAID',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('activateWithPlan()', () => {
    it('should mark subscription PAID and update workspace activePlan atomically', async () => {
      const ws = await seedWorkspace({ activePlan: 'FREE' })
      await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_activate',
        plan: 'PRO',
        status: 'PENDING',
      })

      const result = await SubscriptionRepository.activateWithPlan(
        'bill_activate',
        'PRO',
      )

      const sub = expectOk(result)
      expect(sub.status).toBe('PAID')

      const refreshedWs = await prisma.workspace.findUnique({
        where: { id: ws.id },
      })
      expect(refreshedWs?.activePlan).toBe('PRO')
    })

    it('should rollback when billId does not exist', async () => {
      const ws = await seedWorkspace({ activePlan: 'FREE' })

      const result = await SubscriptionRepository.activateWithPlan(
        'bill_missing',
        'ENTERPRISE',
      )

      expectErr(result, 'DATABASE_ERROR')

      const refreshedWs = await prisma.workspace.findUnique({
        where: { id: ws.id },
      })
      expect(refreshedWs?.activePlan).toBe('FREE')
    })
  })

  describe('deactivateByBillId', () => {
    it('should set the status and revert workspace activePlan to FREE atomically', async () => {
      const ws = await seedWorkspace({ activePlan: 'PRO' })
      await seedSubscription({
        workspaceId: ws.id,
        billId: 'bill_deactivate',
        plan: 'PRO',
        status: 'PAID',
      })

      const sub = expectOk(
        await SubscriptionRepository.deactivateByBillId(
          'bill_deactivate',
          'CANCELLED',
        ),
      )
      expect(sub.status).toBe('CANCELLED')

      const refreshedWs = await prisma.workspace.findUnique({
        where: { id: ws.id },
      })
      expect(refreshedWs?.activePlan).toBe('FREE')
    })

    it('shoudl rollback when billId does not exist', async () => {
      const ws = await seedWorkspace({ activePlan: 'PRO' })

      expectErr(
        await SubscriptionRepository.deactivateByBillId(
          'bill_missing_deactivate',
          'EXPIRED',
        ),
        'DATABASE_ERROR',
      )

      const refreshedWs = await prisma.workspace.findUnique({
        where: { id: ws.id },
      })
      expect(refreshedWs?.activePlan).toBe('PRO')
    })
  })
})
