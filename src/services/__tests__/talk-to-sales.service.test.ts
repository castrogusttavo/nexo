import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { sendTalkToSalesEmail } from '@/src/lib/mail/sales/send-talk-to-sales'
import { TalkToSalesService } from '../talk-to-sales.service'

vi.mock('@/src/lib/mail/sales/send-talk-to-sales')

const mockedSend = vi.mocked(sendTalkToSalesEmail)

const dto = {
  name: 'Ana',
  email: 'ana@empresa.com',
  teamSize: '11-50' as const,
  message: 'Avaliar o Enterprise para 30 pessoas',
}

describe('TalkToSalesService.submit()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the inquiry email and return ok', async () => {
    mockedSend.mockResolvedValue({ id: 'mail-1' } as never)

    const result = await TalkToSalesService.submit(dto)

    expectOk(result)
    expect(mockedSend).toHaveBeenCalledWith(dto)
  })

  it('returns MAIL_ERROR when sending fails', async () => {
    mockedSend.mockRejectedValue(new Error('resend down'))

    const result = await TalkToSalesService.submit(dto)

    expectErr(result, 'MAIL_ERROR')
  })
})
