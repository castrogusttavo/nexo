import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { PRIVACY_VERSION } from '@/lib/legal/versions'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Política de Privacidade | Nexo'
const DESCRIPTION = 'Como o Nexo coleta, usa e protege seus dados.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/privacy-policy' },
  openGraph: {
    type: 'website',
    url: '/legals/privacy-policy',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

interface Block {
  heading?: string
  paragraphs: string[]
}

interface LegalSection {
  id: string
  title: string
  blocks?: Block[]
}

const PREAMBLE = [
  'Esta Política de Privacidade explica como a Nexo Software, Inc. ("Nexo", "nós" ou "nosso") coleta, usa, compartilha e protege informações pessoais quando você interage com nossos sites, produtos e serviços.',
  'O Nexo oferece uma plataforma de gestão de trabalho hospedada na nuvem (o "Serviço", conforme definido em nossos Termos de Serviço). Esta Política de Privacidade cobre nossas práticas como controlador de dados — ou seja, situações em que determinamos como e por que suas informações pessoais são tratadas.',
  'Termos em maiúsculas não definidos aqui têm o significado atribuído em nossos Termos de Serviço.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'papel',
    title: '1. Nosso papel: controlador vs. operador',
    blocks: [
      {
        paragraphs: [
          '(a) Nexo como controlador. Quando você visita nossos sites, cria uma conta, entra em contato com nosso time comercial ou de suporte, ou se inscreve em eventos, o Nexo determina como suas informações pessoais são usadas. Esta Política descreve nossas práticas nessa condição.',
          '(b) Nexo como operador. Quando o Cliente usa o Nexo Cloud para armazenar e gerenciar Dados do Cliente, tratamos esses dados em nome do Cliente, na condição de operador. O Cliente é o controlador e determina como os Dados do Cliente são tratados. Nosso tratamento de Dados do Cliente nessa condição é regido pelo Aditivo de Processamento de Dados (DPA), não por esta Política.',
          'Se você é usuário final de um workspace de um Cliente do Nexo, entre em contato diretamente com esse Cliente para saber como suas informações pessoais são tratadas dentro do workspace dele.',
        ],
      },
    ],
  },
  {
    id: 'abrangencia',
    title: '2. Abrangência',
    blocks: [
      {
        paragraphs: [
          'Esta Política de Privacidade se aplica a: o Nexo Cloud — o Serviço hospedado na nuvem operado pelo Nexo; nexo.coodee.dev e sites de marketing, documentação e suporte relacionados; e comunicações com nossos times de suporte, comercial e de produto.',
          'Esta Política não se aplica a: Dados do Cliente armazenados dentro do workspace de um Cliente (regidos pelo DPA); e serviços de terceiros integrados ao Nexo (regidos pelas próprias políticas de privacidade deles).',
        ],
      },
    ],
  },
  {
    id: 'informacoes-coletadas',
    title: '3. Informações que coletamos',
    blocks: [
      {
        heading: '3.1 Informações que você fornece',
        paragraphs: [
          'Dados de conta e perfil. Ao criar uma conta no Nexo, coletamos seu nome, e-mail, nome da empresa, cargo, foto de perfil, senha e preferências de conta.',
          'Dados de pagamento e cobrança. Ao contratar um plano pago, coletamos seu nome de cobrança, endereço de cobrança e a bandeira e os quatro últimos dígitos do cartão. Os dados completos do cartão são processados diretamente pelo nosso processador de pagamentos (AbacatePay) e nunca ficam armazenados nos sistemas do Nexo.',
          'Suporte e comunicações. Quando você entra em contato conosco, coletamos as informações que você fornece em chamados de suporte, e-mails, formulários de feedback, conversas de chat, pesquisas e inscrições em eventos.',
          'Conteúdo que você envia. Coletamos feedback, posts de fórum e comentários enviados nos nossos sites públicos. Isso não inclui Dados do Cliente armazenados dentro do seu workspace.',
        ],
      },
      {
        heading: '3.2 Informações coletadas automaticamente',
        paragraphs: [
          'Dados de dispositivo e conexão. Coletamos seu endereço IP, tipo e versão do navegador, sistema operacional, identificadores de dispositivo, resolução de tela e preferências de idioma.',
          'Dados de uso. Coletamos informações sobre como você interage com nossos sites e com o Serviço, incluindo páginas visitadas, funcionalidades usadas, cliques, URLs de origem e saída, duração da sessão e timestamps.',
          'Dados de log. Nossos servidores registram automaticamente logs de servidor, relatórios de erro e dados de diagnóstico.',
          'Dados de cookies. Coletamos informações por meio de cookies e tecnologias semelhantes. Veja a Seção 9.',
        ],
      },
      {
        heading: '3.3 Informações de outras fontes',
        paragraphs: [
          'Login por terceiros. Se você entra com Google, GitHub ou outro provedor de identidade, recebemos seu nome e e-mail, conforme permitido pelas configurações do provedor.',
          'Parceiros e fornecedores. Podemos receber dados de contato comercial de parceiros de revenda, consultoria ou marketing.',
          'Dados publicamente disponíveis. Podemos coletar informações profissionais de perfis públicos (como o LinkedIn) para fins de prospecção comercial.',
        ],
      },
    ],
  },
  {
    id: 'como-usamos',
    title: '4. Como usamos suas informações',
    blocks: [
      {
        paragraphs: [
          'Usamos informações pessoais para as seguintes finalidades:',
          'Fornecer o Serviço. Operar, manter e dar suporte ao Nexo Cloud; processar transações; autenticar usuários; e prestar suporte ao cliente.',
          'Melhorar o Serviço. Analisar padrões de uso, testar novas funcionalidades, conduzir pesquisa interna, solucionar problemas e melhorar desempenho, segurança e experiência do usuário.',
          'Comunicar com você. Enviar mensagens transacionais (confirmações de conta, recibos de cobrança, alertas de segurança), responder solicitações e enviar atualizações de produto.',
          'Marketing. Enviar conteúdo promocional, newsletters, convites para eventos e material educativo. Você pode cancelar a qualquer momento.',
          'Segurança. Detectar, prevenir e investigar fraude, abuso, incidentes de segurança e violações dos nossos Termos.',
          'Conformidade legal. Cumprir leis aplicáveis, regulamentos, processos legais e solicitações governamentais legítimas.',
          'Análises agregadas. Criar dados anonimizados ou agregados que não permitam te identificar, para análise e relatórios de negócio.',
        ],
      },
    ],
  },
  {
    id: 'bases-legais',
    title: '5. Bases legais de tratamento (LGPD art. 7º)',
    blocks: [
      {
        paragraphs: [
          'Tratamos suas informações pessoais com base em uma ou mais das hipóteses legais previstas no art. 7º da LGPD (Lei nº 13.709/2018):',
          'Execução de contrato. Tratamento necessário para cumprir nosso contrato com você — por exemplo, fornecer sua conta no Nexo, processar pagamentos e prestar suporte.',
          'Legítimo interesse. Tratamento que atende a interesses legítimos do Nexo, desde que seus direitos e liberdades fundamentais não prevaleçam sobre eles — por exemplo, melhorar o Serviço, prevenir fraude e garantir a segurança da rede. Sempre que nos baseamos em legítimo interesse, fazemos um teste de balanceamento antes de tratar seus dados.',
          'Consentimento. Tratamento baseado no seu consentimento livre e informado — por exemplo, comunicações de marketing opcionais. Você pode revogar o consentimento a qualquer momento.',
          'Cumprimento de obrigação legal ou regulatória. Tratamento necessário para cumprir uma exigência legal — por exemplo, guarda de registros fiscais e resposta a solicitações legais.',
        ],
      },
    ],
  },
  {
    id: 'compartilhamento',
    title: '6. Como compartilhamos suas informações',
    blocks: [
      {
        paragraphs: [
          'Não vendemos suas informações pessoais. Não compartilhamos suas informações pessoais para publicidade comportamental entre contextos diferentes.',
          'Podemos compartilhar suas informações com as seguintes categorias de destinatários:',
        ],
      },
      {
        heading: '6.1 Prestadores de serviço',
        paragraphs: [
          'Contratamos empresas terceiras de confiança para nos ajudar a operar e melhorar o Serviço, incluindo provedores de infraestrutura e hospedagem em nuvem, processamento de pagamentos, análise de dados, ferramentas de suporte ao cliente e envio de e-mails. Todos os prestadores de serviço estão contratualmente obrigados a proteger seus dados e usá-los apenas conforme nossas instruções.',
          'Uma lista atual dos nossos sub-processadores está disponível em nexo.coodee.dev/legals/sub-processors.',
        ],
      },
      {
        heading: '6.2 Sub-processadores de IA',
        paragraphs: [
          'Se você usa o Nexo AI (nossas Funcionalidades de IA), seus dados podem ser processados por provedores terceiros de IA atuando como sub-processadores. Esses provedores estão listados na nossa página de sub-processadores. Veja a Seção 8 para mais detalhes.',
        ],
      },
      {
        heading: '6.3 Aspectos legais e de conformidade',
        paragraphs: [
          'Podemos divulgar suas informações se exigido por lei, regulamento, processo legal ou solicitação governamental, ou se acreditarmos de boa-fé que a divulgação é necessária para proteger direitos, propriedade ou segurança do Nexo, dos nossos usuários ou do público; detectar, prevenir ou resolver fraude, problemas de segurança ou técnicos; ou fazer cumprir nossos Termos.',
        ],
      },
      {
        heading: '6.4 Transferências de negócio',
        paragraphs: [
          'Se o Nexo estiver envolvido em fusão, aquisição, venda de ativos, reorganização societária ou recuperação judicial, suas informações pessoais podem ser transferidas como parte dessa operação. Vamos te notificar (por e-mail ou aviso destacado no site) antes que suas informações pessoais passem a estar sujeitas a uma política de privacidade diferente.',
        ],
      },
      {
        heading: '6.5 Com o seu consentimento',
        paragraphs: [
          'Podemos compartilhar suas informações para outras finalidades mediante seu consentimento explícito.',
        ],
      },
      {
        heading: '6.6 Dados agregados e anonimizados',
        paragraphs: [
          'Podemos compartilhar dados agregados ou anonimizados que não permitam, razoavelmente, te identificar, sem restrição. Isso é consistente com o tratamento de Dados de Uso previsto nos nossos Termos. O Nexo não tenta reidentificar dados anonimizados ou agregados.',
        ],
      },
    ],
  },
  {
    id: 'transferencia-internacional',
    title: '7. Transferência internacional de dados',
    blocks: [
      {
        paragraphs: [
          'O Nexo é operado a partir do Brasil. Se você acessa o Serviço de fora do Brasil, suas informações pessoais podem ser transferidas e tratadas no Brasil ou em outros países onde nós ou nossos prestadores de serviço operamos.',
          'Protegemos transferências internacionais de dados pessoais usando salvaguardas apropriadas, incluindo cláusulas contratuais e outros mecanismos de transferência reconhecidos pela legislação de proteção de dados aplicável, como a LGPD e, quando aplicável, o regime de adequação de outras jurisdições.',
          'Para mais informações sobre as salvaguardas específicas em vigor, entre em contato em juridico@nexo.coodee.dev.',
        ],
      },
    ],
  },
  {
    id: 'funcionalidades-de-ia',
    title: '8. Funcionalidades de IA',
    blocks: [
      {
        paragraphs: [
          'O Nexo AI oferece funcionalidades baseadas em IA dentro do Serviço, conforme descrito na Seção 5 dos nossos Termos e nos Termos de Uso de IA.',
          'Como as Funcionalidades de IA tratam dados. Quando você usa o Nexo AI no Nexo Cloud, suas entradas (como texto enviado pra resumo ou geração) são enviadas a provedores terceiros de IA para processamento. Esses provedores atuam como sub-processadores e estão listados em nexo.coodee.dev/legals/sub-processors.',
          'Processamento automatizado. O Cliente permanece o único responsável por quaisquer decisões, ações ou processos automatizados implementados com base em resultados gerados por IA.',
          'Sem treinamento com seus dados. O Nexo não usa Dados do Cliente para treinar, ajustar ou melhorar modelos de IA de propósito geral — nem os nossos, nem os de provedores terceiros. Nossos acordos com sub-processadores de IA proíbem o uso dos seus dados para treinamento de modelo.',
          'Resultados de IA. Resultados gerados por IA são tratados como Dados do Cliente e recebem as mesmas proteções. Você é responsável por revisar e verificar resultados de IA antes de confiar neles.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: '9. Cookies e tecnologias de rastreamento',
    blocks: [
      {
        heading: '10.1 O que usamos',
        paragraphs: [
          'Nós e nossos parceiros terceiros usamos cookies, pixels, web beacons e tecnologias semelhantes nos nossos sites para:',
          'Cookies essenciais. Habilitam funcionalidades essenciais como autenticação, segurança e gerenciamento de sessão. Não podem ser desativados.',
          'Cookies funcionais. Lembram suas preferências, idioma e configurações.',
          'Cookies de análise. Ajudam a entender como visitantes usam nossos sites, medir desempenho e identificar tendências.',
          'Cookies de marketing. Entregam anúncios relevantes e medem a eficácia das nossas campanhas de marketing.',
          'Para informações detalhadas, incluindo os cookies específicos usados e como gerenciá-los, veja nossa Política de Cookies (nexo.coodee.dev/legals/cookie-policy).',
        ],
      },
      {
        heading: '10.2 Suas escolhas de cookies',
        paragraphs: [
          'Você pode gerenciar suas preferências de cookies através do nosso banner de consentimento (exibido na primeira visita) ou das configurações do seu navegador.',
        ],
      },
      {
        heading: '10.3 Sinais de não rastreamento',
        paragraphs: [
          'Nossos sites não respondem atualmente a sinais de "Do Not Track" do navegador. Honramos sinais de Global Privacy Control ("GPC") quando exigido pela legislação aplicável. Quando detectamos um sinal de GPC, tratamos como uma recusa válida ao compartilhamento de informações pessoais para fins de publicidade.',
        ],
      },
    ],
  },
  {
    id: 'retencao',
    title: '10. Retenção de dados',
    blocks: [
      {
        paragraphs: [
          'Retemos informações pessoais somente pelo tempo necessário para cumprir as finalidades descritas nesta Política, a menos que um prazo maior seja exigido ou permitido por lei.',
          'Dados de conta. Retidos durante a vigência da sua conta, mais um período razoável após a exclusão da conta, para backups, obrigações legais e resolução de disputas.',
          'Dados de pagamento e cobrança. Retidos pelo prazo exigido pela legislação fiscal aplicável.',
          'Dados de suporte. Retidos durante a vigência da sua conta ou até a resolução do chamado, mais qualquer prazo de retenção legalmente exigido.',
          'Dados de uso e analytics. Agregados e retidos para análise; logs brutos normalmente retidos por até 12 meses.',
          'Dados de marketing. Retidos até você cancelar a inscrição ou solicitar a exclusão, o que ocorrer primeiro.',
          'Quando informações pessoais deixam de ser necessárias, nós as excluímos ou anonimizamos com segurança. Para retenção e exclusão de Dados do Cliente após a rescisão, veja a Seção 9.5 dos Termos.',
        ],
      },
    ],
  },
  {
    id: 'seguranca',
    title: '11. Segurança da informação',
    blocks: [
      {
        paragraphs: [
          'Implementamos salvaguardas técnicas, organizacionais e administrativas alinhadas às práticas do setor para proteger informações pessoais, incluindo criptografia em trânsito (TLS/SSL) e em repouso, controles de acesso e permissões baseadas em função para sistemas internos, avaliações de segurança e testes de vulnerabilidade recorrentes, treinamento de segurança e obrigações de confidencialidade para a equipe, e detecção, registro e monitoramento de incidentes.',
          'Detalhes das práticas de segurança do Nexo estão disponíveis em nexo.coodee.dev/legals/security.',
          'Notificação de incidentes. Em caso de incidente de segurança que afete suas informações pessoais, vamos notificar você e as autoridades regulatórias aplicáveis conforme exigido pela legislação de proteção de dados aplicável — incluindo, quando cabível, a comunicação à Autoridade Nacional de Proteção de Dados (ANPD) prevista na LGPD. Para clientes do Nexo Cloud, obrigações de notificação de incidente também são tratadas no DPA.',
          'Suas responsabilidades. Nenhum sistema é 100% seguro. Você é responsável por manter a confidencialidade das suas credenciais, escolher senhas fortes e proteger os dispositivos usados para acessar o Serviço.',
        ],
      },
    ],
  },
  {
    id: 'direitos',
    title: '12. Seus direitos como titular (LGPD art. 18)',
    blocks: [
      {
        paragraphs: [
          'Conforme o art. 18 da LGPD, você tem os seguintes direitos em relação às suas informações pessoais:',
          'Confirmação e acesso. Confirmar a existência de tratamento e solicitar acesso aos seus dados.',
          'Correção. Solicitar a correção de dados incompletos, inexatos ou desatualizados.',
          'Anonimização, bloqueio ou eliminação. Solicitar a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.',
          'Portabilidade. Solicitar a portabilidade dos seus dados a outro fornecedor de serviço, mediante requisição expressa.',
          'Eliminação. Solicitar a eliminação dos dados pessoais tratados com base no seu consentimento, exceto nas hipóteses de conservação previstas em lei.',
          'Informação sobre compartilhamento. Solicitar informação sobre as entidades públicas e privadas com as quais o Nexo compartilhou seus dados.',
          'Revogação do consentimento. Revogar o consentimento a qualquer momento, quando o tratamento tiver esse fundamento.',
          'Oposição. Se opor a tratamento realizado com base em outra hipótese legal, em caso de descumprimento da LGPD.',
          'Cancelar inscrição de marketing. Cancelar comunicações de marketing a qualquer momento, pelo link de descadastro em qualquer e-mail ou entrando em contato conosco.',
          'Para exercer qualquer um desses direitos, entre em contato em juridico@nexo.coodee.dev. Vamos responder dentro do prazo exigido pela legislação aplicável. Podemos pedir a verificação da sua identidade antes de processar sua solicitação. Não discriminamos você por exercer seus direitos de privacidade.',
          'Se você estiver fora do Brasil, outras leis de proteção de dados podem se aplicar às suas informações — por exemplo, o RGPD europeu ou leis estaduais dos Estados Unidos. Nesses casos, tratamos sua solicitação com base no regime aplicável ao seu caso; entre em contato em juridico@nexo.coodee.dev para saber mais.',
        ],
      },
    ],
  },
  {
    id: 'criancas',
    title: '13. Crianças e adolescentes',
    blocks: [
      {
        paragraphs: [
          'O Serviço não é direcionado a crianças e adolescentes menores de 18 anos, e não coletamos intencionalmente dados pessoais desse público sem o consentimento específico e em destaque de ao menos um dos pais ou do responsável legal, conforme o art. 14 da LGPD. Se soubermos que coletamos dados pessoais de uma criança sem esse consentimento, vamos excluí-los prontamente. Se você acredita que uma criança nos forneceu dados pessoais, entre em contato em juridico@nexo.coodee.dev.',
        ],
      },
    ],
  },
  {
    id: 'servicos-terceiros',
    title: '14. Serviços de terceiros',
    blocks: [
      {
        paragraphs: [
          'O Serviço pode conter links para, ou integrações com, sites, aplicativos ou serviços de terceiros que o Nexo não opera. Esta Política não se aplica a esses serviços. Quando você conecta uma integração de terceiro ao Nexo (como GitHub, Slack ou outras ferramentas), os dados compartilhados com essa integração são regidos pela política de privacidade desse terceiro. O Nexo não é responsável pelas práticas de privacidade de serviços de terceiros.',
        ],
      },
    ],
  },
  {
    id: 'alteracoes',
    title: '15. Alterações desta política',
    blocks: [
      {
        paragraphs: [
          'Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos mudanças materiais, vamos publicar a política atualizada nesta página com uma data de vigência revisada, enviar uma notificação por e-mail para o endereço associado à sua conta, e exibir um aviso dentro do produto para usuários do Nexo Cloud.',
          'A versão mais recente estará sempre disponível em nexo.coodee.dev/legals/privacy-policy. O uso continuado do Serviço após as mudanças entrarem em vigor representa aceitação da política atualizada.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '16. Encarregado e contato',
    blocks: [
      {
        paragraphs: [
          'Se você tiver dúvidas ou solicitações sobre esta Política de Privacidade ou nossas práticas de privacidade, entre em contato: Nexo Software, Inc., e-mail juridico@nexo.coodee.dev.',
          'Esse é também o canal para falar com o nosso Encarregado de Proteção de Dados (DPO), nos termos do art. 41 da LGPD.',
        ],
      },
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Política de Privacidade</Title>
          <Muted>Versão {PRIVACY_VERSION}</Muted>
        </header>

        <section className='flex flex-col gap-4'>
          {PREAMBLE.map((paragraph) => (
            <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
          ))}
        </section>

        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className='flex flex-col gap-4'
          >
            <SectionHeading as='h2' id={section.id} className='pt-12 pb-6'>
              {section.title}
            </SectionHeading>
            {section.blocks?.map((block) => (
              <div
                key={block.heading ?? block.paragraphs[0]}
                className='flex flex-col gap-2'
              >
                {block.heading && (
                  <SectionHeading
                    as='h3'
                    id={`${section.id}-${block.heading.split(' ')[0]}`}
                    className='text-lg font-medium pb-3'
                  >
                    {block.heading}
                  </SectionHeading>
                )}
                {block.paragraphs.map((paragraph) => (
                  <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
                ))}
              </div>
            ))}
          </section>
        ))}
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
