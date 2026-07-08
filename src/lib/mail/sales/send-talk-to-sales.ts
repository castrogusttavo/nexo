import TalkToSalesEmail from '@/components/emails/sales/talk-to-sales'
import type { TalkToSalesEmailProps } from '@/types/mail'
import { sendEmail } from '../send'
import { mailAddresses, mailSenders } from '../senders'

export async function sendTalkToSalesEmail(params: TalkToSalesEmailProps) {
  return sendEmail({
    to: [mailAddresses.sales],
    from: mailSenders.notifications,
    replyTo: params.email,
    subject: `Novo contato de vendas - ${params.name} (${params.teamSize})`,
    react: TalkToSalesEmail(params),
  })
}
