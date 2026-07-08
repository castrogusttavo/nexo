import { logger } from '@/lib/axiom/logger'
import { mailError } from '../errors'
import { sendTalkToSalesEmail } from '../lib/mail/sales/send-talk-to-sales'
import { err, ok, type Result } from '../lib/result'
import type { TalkToSalesDTO } from '../schemas/talk-to-sales.schema'

export const TalkToSalesService = {
  async submit(dto: TalkToSalesDTO): Promise<Result<void>> {
    try {
      await sendTalkToSalesEmail(dto)
      logger.info('talk_to_sales.submitted', { teamSize: dto.teamSize })
      return ok(undefined)
    } catch (error) {
      logger.error('talk_to_sales.send_failed', {
        teamSize: dto.teamSize,
        message: error instanceof Error ? error.message : String(error),
      })
      return err(mailError())
    }
  },
}
