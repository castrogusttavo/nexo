import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Title } from './text/title'

export function Faq() {
  return (
    <div className='py-16 flex flex-col gap-6 w-full pb-20'>
      <Title as='h2' className='text-4xl font-medium'>
        O que podemos responder por você hoje?
      </Title>
      <Accordion className='max-w-5xl mx-auto flex flex-col'>
        <AccordionItem value='item-1' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline'>
            O que é o Nexo?
          </AccordionTrigger>
          <AccordionContent>
            O Nexo é uma plataforma de gerenciamento de projetos que ajuda
            equipes a colaborar, acompanhar o progresso e entregar projetos com
            eficiência. Ele combina gerenciamento de projetos, wiki e
            formulários de solicitação em uma plataforma unificada.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
            O Nexo é gratuito?
          </AccordionTrigger>
          <AccordionContent>
            Sim. O Nexo oferece um plano gratuito bastante completo com os
            principais recursos para até 12 usuários. Também disponibilizamos
            planos pagos para funcionalidades avançadas, necessidades
            corporativas e suporte prioritário.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-3' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
            Posso hospedar o Nexo na minha própria infraestrutura?
          </AccordionTrigger>
          <AccordionContent>
            Sim. No plano Enterprise oferecemos implantações privadas e
            gerenciadas: o Nexo rodando na sua própria infraestrutura, com mais
            controle e privacidade, implantado e mantido pela nossa equipe. Fale
            com vendas para conhecer as opções.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-4' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
            Quais integrações o Nexo oferece?
          </AccordionTrigger>
          <AccordionContent>
            O Nexo integra-se com ferramentas populares como GitHub, GitLab,
            Slack, Sentry e Draw.io para simplificar seu fluxo de trabalho e
            manter sua equipe conectada.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-5' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
            Como migrar de outras ferramentas de gerenciamento de projetos?
          </AccordionTrigger>
          <AccordionContent>
            Disponibilizamos importadores para plataformas como Jira, Linear,
            Asana e ClickUp, além de importação via CSV. Nossa equipe também
            pode auxiliar durante todo o processo de migração.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-6' className='data-open:bg-card p-4'>
          <AccordionTrigger className='text-base hover:no-underline data-open:bg-card'>
            Meus dados estão seguros?
          </AccordionTrigger>
          <AccordionContent>
            A segurança é nossa prioridade. Utilizamos criptografia seguindo os
            padrões do setor, realizamos auditorias de segurança regularmente e
            adotamos boas práticas para proteger seus dados, em conformidade com
            a LGPD.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
