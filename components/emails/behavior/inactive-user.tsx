import { InactiveUserProps } from '@/types/mail'
import { EmailNudge, EmailNudgeText } from '../_components/email-nudge'

export const InactiveUser = ({ username, redirectUrl }: InactiveUserProps) => (
  <EmailNudge
    preview='Nexo | Ficou algo pendente por aqui?'
    title={`Senti sua falta por aqui, ${username}.`}
    steps={['Crie 1 projeto', 'Adicione 1 task', 'Pare por aí']}
    outro='O resto o Nexo organiza por você.'
    cta='Voltar pro Nexo'
    href={redirectUrl}
  >
    <EmailNudgeText>
      Você entrou no Nexo, mas não chegou a usar de verdade ainda.
      <br />
      Normal, começar do zero sempre trava.
    </EmailNudgeText>
    <EmailNudgeText>Comece com algo simples:</EmailNudgeText>
  </EmailNudge>
)

export default InactiveUser
