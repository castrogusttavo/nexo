import { InactiveWorkspaceProps } from '@/types/mail'
import { EmailNudge, EmailNudgeText } from '../_components/email-nudge'

export const InactiveWorkspace = ({
  username,
  redirectUrl,
}: InactiveWorkspaceProps) => (
  <EmailNudge
    preview='Nexo | Seu workspace ainda não começou'
    title={`Seu workspace ainda está vazio, ${username}.`}
    steps={['Uma ideia', 'Uma task', 'Um projeto qualquer']}
    outro='Só isso já é suficiente pra destravar tudo.'
    cta='Adicionar meu primeiro item'
    href={redirectUrl}
  >
    <EmailNudgeText>
      E enquanto ele estiver assim, o Nexo não tem como te ajudar.
      <br />
      Não precisa estruturar nada perfeito.
    </EmailNudgeText>
    <EmailNudgeText>Comece com algo simples:</EmailNudgeText>
  </EmailNudge>
)

export default InactiveWorkspace
