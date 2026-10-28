import { InactiveWorkItemProps } from '@/types/mail'
import { EmailNudge, EmailNudgeText } from '../_components/email-nudge'

export const InactiveWorkItem = ({
  username,
  redirectUrl,
}: InactiveWorkItemProps) => (
  <EmailNudge
    preview='Nexo | Você já começou, falta pouco agora'
    title={`Você começou algo no Nexo, ${username}.`}
    steps={['Abrir o item', 'Continuar de onde parou']}
    cta='Continuar de onde parei'
    href={redirectUrl}
  >
    <EmailNudgeText>E isso já é mais do que a maioria faz.</EmailNudgeText>
    <EmailNudgeText>
      Agora vem a parte onde o Nexo realmente começa a ajudar: organizar,
      conectar e dar contexto ao que você criou.
    </EmailNudgeText>
    <EmailNudgeText>Seu próximo passo é simples:</EmailNudgeText>
  </EmailNudge>
)

export default InactiveWorkItem
