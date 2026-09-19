import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { TERMS_VERSION } from '@/lib/legal/versions'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Termos de Serviço | Nexo'
const DESCRIPTION = 'Os termos que regem o uso do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/terms-and-conditions' },
  openGraph: {
    type: 'website',
    url: '/legals/terms-and-conditions',
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
  intro?: string[]
  blocks?: Block[]
}

const PREAMBLE = [
  'Estes Termos de Serviço ("Termos") são celebrados entre Nexo Software, Inc. ("Nexo", "nós" ou "nosso") e a pessoa física ou jurídica que acessa ou usa o Serviço ("Cliente" ou "você"). Se você estiver acessando ou usando o Serviço em nome de uma empresa ou outra entidade, você declara ter autoridade para vincular essa entidade a estes Termos, e "você" e "Cliente" passam a se referir a essa entidade.',
  'Estes Termos regem o acesso e o uso da plataforma de gestão de trabalho do Nexo, incluindo nossos sites, APIs, aplicativos móveis e serviços relacionados (em conjunto, o "Serviço"). Ao acessar ou usar o Serviço, clicar em "Concordo" ou assinar um Pedido de Contratação que faça referência a estes Termos, você concorda em se vincular a eles. Se você não concordar, não utilize o Serviço.',
  'A "Data de Vigência" é a que ocorrer primeiro entre: (a) seu primeiro acesso ao Serviço, ou (b) a data de vigência do primeiro Pedido de Contratação que faça referência a estes Termos.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'definicoes',
    title: '1. Definições',
    blocks: [
      {
        paragraphs: [
          '"Política de Uso Aceitável" ou "AUP" significa a Política de Uso Aceitável do Nexo, disponível em nexopm.com/legals/acceptable-use-policy, conforme atualizada periodicamente.',
          '"Afiliada" significa qualquer entidade que controle, seja controlada por, ou esteja sob controle comum com uma das partes, sendo "controle" a titularidade de mais de 50% das participações com direito a voto dessa entidade.',
          '"Usuário Autorizado" significa a pessoa física autorizada pelo Cliente a acessar e usar o Serviço através da conta do Cliente, incluindo funcionários, contratados e prepostos.',
          '"Serviço Beta" significa qualquer serviço, funcionalidade ou recurso designado como alfa, beta, prévia, acesso antecipado, piloto ou por descrição semelhante.',
          '"Informação Confidencial" significa toda informação de negócio, produto, tecnologia e marketing não pública, divulgada por uma parte à outra, oralmente ou por escrito, designada como confidencial ou que uma pessoa razoável entenderia como confidencial dada a natureza da informação e as circunstâncias da divulgação.',
          '"Dados do Cliente" significa quaisquer dados, conteúdos, arquivos, anexos, textos, imagens ou outros materiais enviados, submetidos ou transmitidos pelo Cliente ou por qualquer Usuário Autorizado, para ou através do Serviço. Dados do Cliente não incluem Dados de Uso.',
          '"Documentação" significa a documentação técnica do Serviço disponibilizada em nexopm.com/docs ou por qualquer outro meio fornecido pelo Nexo.',
          '"Direitos de Propriedade Intelectual" significa todas as patentes, direitos autorais, marcas, segredos de negócio, direitos morais e demais direitos de propriedade intelectual existentes ou que venham a existir, incluindo todos os pedidos, renovações e extensões correspondentes.',
          '"Leis" significa todas as leis, normas e regulamentos locais, estaduais, federais e internacionais aplicáveis, incluindo os relacionados à proteção de dados, transferência internacional de dados, controle de exportação e comunicações eletrônicas — em especial a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, "LGPD") e o Código de Defesa do Consumidor (Lei nº 8.078/1990, "CDC"), quando aplicável.',
          '"Pedido de Contratação" significa o documento de contratação, escrito ou eletrônico, que faça referência a estes Termos e especifique o Serviço contratado, o prazo de assinatura, os valores e demais condições comerciais. Uma vez assinado por ambas as partes (ou, no caso de contratação online, confirmado), cada Pedido de Contratação fica sujeito a estes Termos.',
          '"Serviço" significa a plataforma de gestão de trabalho do Nexo, incluindo o serviço em nuvem, aplicativos móveis, APIs, integrações e ferramentas e documentação relacionadas.',
          '"Prazo de Assinatura" significa o período durante o qual o Cliente possui acesso pago ao Serviço, conforme especificado no Pedido de Contratação aplicável.',
          '"Dados de Uso" significa as informações técnicas, de diagnóstico e de uso sobre a utilização do Serviço pelo Cliente e pelos Usuários Autorizados, incluindo padrões de uso de funcionalidades, métricas de desempenho e logs de sistema. Dados de Uso não incluem Dados do Cliente.',
        ],
      },
    ],
  },
  {
    id: 'o-servico',
    title: '2. O Serviço',
    blocks: [
      {
        heading: '2.1 Visão geral',
        paragraphs: [
          'O Nexo oferece uma plataforma de gestão de trabalho (gestão de projetos, gestão de conhecimento/wiki e IA) hospedada na nuvem. O Serviço inclui a plataforma, produtos, APIs, integrações, aplicativos móveis e quaisquer ferramentas e recursos complementares oferecidos através do domínio do Nexo.',
        ],
      },
      {
        heading: '2.2 Acesso e uso',
        paragraphs: [
          '(a) Nuvem. Sujeito a estes Termos e ao pagamento das taxas aplicáveis, o Nexo concede ao Cliente um direito não exclusivo e intransferível, durante o Prazo de Assinatura, de acessar e usar o Serviço em nuvem de acordo com a Documentação e quaisquer restrições de escopo de uso do Pedido de Contratação aplicável. O Serviço em nuvem é uma assinatura hospedada — nenhum software é entregue ou instalado pelo Cliente, e nenhuma licença de software é concedida.',
          '(b) Usuários Autorizados. O acesso ao Serviço é limitado aos Usuários Autorizados. O Cliente é responsável por garantir que todos os Usuários Autorizados cumpram estes Termos e por toda atividade realizada em sua conta.',
        ],
      },
      {
        heading: '2.3 Segurança da conta',
        paragraphs: [
          'O Cliente deve fornecer informações de cadastro precisas e completas e mantê-las atualizadas. O Cliente é responsável por manter a confidencialidade das credenciais de acesso, incluindo senhas e chaves de API. O Cliente deve notificar o Nexo prontamente sobre qualquer acesso ou uso não autorizado de sua conta. O Nexo não será responsável por perdas decorrentes do uso não autorizado da conta do Cliente.',
        ],
      },
      {
        heading: '2.4 Afiliadas e contratados',
        paragraphs: [
          'O Cliente pode permitir que funcionários e contratados de suas Afiliadas atuem como Usuários Autorizados, desde que o Cliente permaneça responsável pelo cumprimento destes Termos por parte deles e que seu uso seja exclusivamente em benefício do Cliente.',
        ],
      },
      {
        heading: '2.5 Restrições',
        paragraphs: [
          'O Cliente não irá, e não permitirá que terceiros:',
          '(a) sublicenciar, vender, alugar, arrendar ou distribuir o Serviço, nem disponibilizá-lo a terceiros, exceto conforme expressamente permitido;',
          '(b) usar o Serviço para desenvolver um produto concorrente ou para análise competitiva;',
          '(c) fazer engenharia reversa, descompilar, desmontar ou tentar extrair o código-fonte do Serviço, exceto na medida expressamente permitida pela legislação aplicável;',
          '(d) copiar, modificar ou criar obras derivadas do Serviço ou da Documentação;',
          '(e) remover, alterar ou ocultar avisos de propriedade constantes no Serviço;',
          '(f) interferir, comprometer ou impor carga não razoável sobre o Serviço ou sua infraestrutura;',
          '(g) acessar o Serviço por meios automatizados (bots, scrapers, spiders), exceto por meio das APIs publicadas pelo Nexo e em conformidade com a Documentação;',
          '(h) usar o Serviço em violação a quaisquer Leis ou à AUP; ou',
          '(i) transmitir vírus, malware ou outro código malicioso através do Serviço.',
        ],
      },
      {
        heading: '2.6 Modificações no Serviço',
        paragraphs: [
          'Podemos atualizar, modificar ou descontinuar funcionalidades do Serviço periodicamente. Caso façamos uma mudança que reduza materialmente a funcionalidade essencial do Serviço durante um Prazo de Assinatura pago, notificaremos você através do Serviço, e-mail ou nosso site. A contratação do Serviço não está condicionada à entrega de qualquer funcionalidade futura.',
        ],
      },
      {
        heading: '2.7 Serviços Beta',
        paragraphs: [
          'O Nexo pode oferecer Serviços Beta a seu critério. Serviços Beta são fornecidos "no estado em que se encontram", sem garantias de qualquer tipo, e não estão sujeitos ao SLA, às obrigações de suporte ou às disposições de indenização destes Termos. O Nexo pode modificar, suspender ou descontinuar qualquer Serviço Beta a qualquer momento, sem aviso prévio ou responsabilidade. O Cliente utiliza Serviços Beta por sua conta e risco.',
        ],
      },
    ],
  },
  {
    id: 'servico-em-nuvem',
    title: '3. Serviço em nuvem',
    blocks: [
      {
        paragraphs: [
          '(a) O Nexo hospeda e gerencia a infraestrutura, e o Cliente acessa o Serviço via web ou aplicativos móveis.',
          '(b) O Serviço está sujeito ao Acordo de Nível de Serviço disponível em nexopm.com/legals/service-level-agreement.',
          '(c) O Nexo é responsável por manter a segurança do ambiente de hospedagem de acordo com suas práticas de segurança descritas em nexopm.com/legals/security.',
        ],
      },
    ],
  },
  {
    id: 'dados-do-cliente',
    title: '4. Dados do Cliente',
    blocks: [
      {
        heading: '4.1 Titularidade',
        paragraphs: [
          'Entre as partes, o Cliente mantém todos os direitos, título e interesse sobre os Dados do Cliente. Sujeito a estes Termos, o Cliente concede ao Nexo uma licença não exclusiva, mundial e isenta de royalties para acessar, usar, processar, copiar e exibir os Dados do Cliente, exclusivamente na medida necessária para:',
          '(a) fornecer, manter e melhorar o Serviço;',
          '(b) prevenir ou resolver problemas técnicos, incidentes de segurança ou fraude;',
          '(c) responder a solicitações de suporte do Cliente;',
          '(d) cumprir obrigações legais aplicáveis; e',
          '(e) conforme de outra forma autorizado pelo Cliente por escrito.',
        ],
      },
      {
        heading: '4.2 Responsabilidades do Cliente',
        paragraphs: [
          'O Cliente declara e garante que:',
          '(a) obteve todos os direitos, consentimentos e permissões necessários para submeter os Dados do Cliente ao Serviço;',
          '(b) os Dados do Cliente não violam direitos de terceiros nem as Leis aplicáveis; e',
          '(c) o uso do Serviço pelo Cliente está em conformidade com todas as Leis aplicáveis, incluindo as normas de proteção de dados e privacidade, em especial a LGPD.',
        ],
      },
      {
        heading: '4.3 Dados sensíveis',
        paragraphs: [
          'O Cliente não deve submeter ao Serviço dados que exijam tratamento específico sob legislação especial, incluindo:',
          '(a) dados pessoais sensíveis conforme definidos no art. 5º, II, da LGPD (origem racial ou étnica, convicção religiosa, opinião política, dado referente à saúde ou à vida sexual, dado genético ou biométrico, entre outros) ou legislação equivalente;',
          '(b) informações de saúde protegidas reguladas pela HIPAA, para clientes sujeitos à legislação dos Estados Unidos, salvo se o Cliente tiver firmado um Acordo de Parceiro de Negócios ("BAA") com o Nexo;',
          '(c) dados de cartão de pagamento sujeitos ao padrão PCI DSS; ou',
          '(d) outras informações pessoais sensíveis conforme definidas pela legislação de privacidade aplicável;',
          'exceto na medida em que o Nexo tenha concordado expressamente em tratar tais dados em acordo específico por escrito (como um BAA), e desde que, quando exigido por lei, esse tratamento tenha base legal adequada, como o consentimento do titular.',
        ],
      },
      {
        heading: '4.4 HIPAA',
        paragraphs: [
          'A plataforma do Nexo pode ser configurada para apoiar a conformidade com a HIPAA quando devidamente configurada e utilizada de acordo com um BAA assinado. Clientes que precisem tratar informações de saúde protegidas sob a legislação americana devem firmar o BAA do Nexo e seguir as diretrizes de conformidade correspondentes. O Nexo fornece as salvaguardas técnicas necessárias, mas o Cliente é responsável por utilizar a plataforma de forma compatível e por manter seu próprio programa de conformidade.',
        ],
      },
      {
        heading: '4.5 Tratamento de dados',
        paragraphs: [
          'O tratamento de dados pessoais contidos nos Dados do Cliente pelo Nexo é regido pelo Aditivo de Processamento de Dados disponível em nexopm.com/legals/dpa, incorporado a estes Termos por referência. Na medida aplicável, o Cliente atua como controlador e o Nexo como operador, nos termos da LGPD, e eventuais transferências internacionais de dados pessoais serão realizadas em conformidade com a legislação de proteção de dados aplicável e mecanismos de transferência apropriados. Em caso de conflito entre estes Termos e o DPA quanto ao tratamento de dados pessoais, prevalece o DPA.',
        ],
      },
    ],
  },
  {
    id: 'funcionalidades-de-ia',
    title: '5. Funcionalidades de IA',
    blocks: [
      {
        heading: '5.1 Nexo AI',
        paragraphs: [
          'O Nexo pode oferecer funcionalidades baseadas em IA como parte do Serviço ("Funcionalidades de IA"). As Funcionalidades de IA são projetadas para auxiliar em tarefas como capacidades agênticas, geração de conteúdo, resumo e automação de fluxos de trabalho dentro do Serviço.',
        ],
      },
      {
        heading: '5.2 Dados do Cliente e IA',
        paragraphs: [
          'O Nexo não utiliza Dados do Cliente para treinar modelos de machine learning de propósito geral. Os Dados do Cliente processados pelas Funcionalidades de IA são usados exclusivamente para gerar resultados para o Cliente solicitante e não são compartilhados com outros clientes nem utilizados em benefício deles. O Nexo pode utilizar Funcionalidades de IA fornecidas por provedores terceiros; a lista atual de sub-processadores está disponível em nexopm.com/legals/sub-processors.',
        ],
      },
      {
        heading: '5.3 Resultados de IA',
        paragraphs: [
          'O Cliente é responsável por revisar e avaliar todos os resultados gerados pelas Funcionalidades de IA antes de utilizá-los. Resultados gerados por IA podem ser imprecisos, incompletos ou inadequados para os propósitos do Cliente. O Nexo AI é projetado para auxiliar a tomada de decisão humana. O Cliente é o único responsável por quaisquer decisões, ações ou fluxos de trabalho automatizados implementados com base em resultados de IA. O Nexo não garante a precisão, integridade ou adequação de qualquer resultado gerado por IA.',
        ],
      },
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '6. Propriedade intelectual',
    blocks: [
      {
        heading: '6.1 Propriedade intelectual do Nexo',
        paragraphs: [
          'O Nexo e seus licenciadores mantêm todos os direitos, título e interesse sobre o Serviço, a Documentação e toda a tecnologia relacionada, incluindo todos os Direitos de Propriedade Intelectual correspondentes. Exceto pela licença limitada concedida na Seção 2.2, nenhum direito sobre o Serviço ou sobre a propriedade intelectual do Nexo é concedido ao Cliente.',
        ],
      },
      {
        heading: '6.2 Feedback',
        paragraphs: [
          'Caso o Cliente forneça sugestões, recomendações ou outro retorno relacionado ao Serviço ("Feedback"), o Feedback é não confidencial, e o Cliente concede ao Nexo uma licença perpétua, não exclusiva, irrevogável, mundial e isenta de royalties para usar, modificar e incorporar tal Feedback ao Serviço, sem qualquer obrigação ou atribuição ao Cliente.',
        ],
      },
      {
        heading: '6.3 Dados de Uso',
        paragraphs: [
          'O Nexo pode coletar, usar e analisar Dados de Uso para fornecer, manter, melhorar e desenvolver o Serviço, e para outras finalidades legítimas de negócio. O Nexo pode compartilhar Dados de Uso com terceiros somente de forma anonimizada ou agregada, que não permita identificar o Cliente ou qualquer indivíduo. O Nexo mantém todos os direitos sobre os Dados de Uso.',
        ],
      },
    ],
  },
  {
    id: 'taxas-e-pagamento',
    title: '7. Taxas e pagamento',
    blocks: [
      {
        heading: '7.1 Taxas',
        paragraphs: [
          'Todas as taxas estão definidas no Pedido de Contratação aplicável ou em nexopm.com/pricing, e são expressas em reais (BRL), salvo indicação em contrário. As taxas são calculadas com base no número de assentos ou em outras métricas de uso especificadas no momento da contratação. Salvo disposição em contrário no Pedido de Contratação, todas as taxas são não reembolsáveis, exceto conforme expressamente previsto na Seção 7.8.',
        ],
      },
      {
        heading: '7.2 Ajuste de assentos',
        paragraphs: [
          'Caso o Cliente aumente o número de assentos durante um período de cobrança, os assentos adicionais serão calculados proporcionalmente ao período restante e cobrados imediatamente. Caso o Cliente reduza o número de assentos, a redução será refletida como crédito proporcional aplicado ao próximo ciclo de cobrança.',
        ],
      },
      {
        heading: '7.3 Condições de pagamento',
        paragraphs: [
          'Os pagamentos são processados por meio de um processador de pagamentos autorizado (atualmente, a AbacatePay) ou de outro processador designado pelo Nexo. Para clientes que pagam por fatura, o pagamento é devido em até trinta (30) dias contados da data da fatura, salvo disposição em contrário no Pedido de Contratação. Pagamentos em atraso podem sujeitar o Cliente a encargos moratórios nos limites permitidos pela legislação brasileira.',
        ],
      },
      {
        heading: '7.4 Tributos',
        paragraphs: [
          'As taxas não incluem quaisquer tributos, encargos ou contribuições aplicáveis ("Tributos"). O Cliente é responsável por todos os Tributos associados às suas contratações, excluídos os tributos incidentes exclusivamente sobre a receita líquida do Nexo. Caso o Nexo seja obrigado a reter ou recolher Tributos, estes serão faturados ao Cliente, que deverá pagá-los.',
        ],
      },
      {
        heading: '7.5 Renovação da assinatura',
        paragraphs: [
          'As assinaturas são renovadas automaticamente por períodos sucessivos iguais ao Prazo de Assinatura inicial, salvo se qualquer uma das partes notificar a outra, por escrito, sobre a não renovação, com pelo menos sessenta (60) dias de antecedência do término do prazo vigente. O Nexo pode ajustar os valores na renovação, mediante aviso prévio por escrito de pelo menos sessenta (60) dias.',
        ],
      },
      {
        heading: '7.6 Planos gratuitos e testes',
        paragraphs: [
          'O Nexo pode oferecer planos gratuitos ou períodos de teste a seu critério. Planos gratuitos e testes podem ter funcionalidades limitadas e são fornecidos sem garantia, SLA ou compromissos de suporte. O Nexo pode modificar ou descontinuar planos gratuitos ou testes a qualquer momento.',
        ],
      },
      {
        heading: '7.7 Cancelamento',
        paragraphs: [
          '(a) Assinaturas mensais. O Cliente pode cancelar uma assinatura mensal a qualquer momento pelas configurações da conta no Serviço. O cancelamento produz efeitos ao final do período de cobrança vigente, e o Cliente mantém acesso ao Serviço pago até o fim desse período.',
          '(b) Assinaturas anuais. O Cliente pode cancelar uma assinatura anual a qualquer momento pelas configurações da conta ou entrando em contato com sales@nexopm.com. O cancelamento produz efeitos ao final do Prazo de Assinatura anual vigente. O Cliente permanece responsável por todas as taxas até o fim do prazo e mantém acesso ao Serviço pago até essa data.',
          '(c) Relação com a rescisão. O cancelamento nos termos desta Seção 7.7 é a opção do Cliente de não continuar uma assinatura paga. As consequências jurídicas do cancelamento — incluindo a recuperação de Dados do Cliente, o término da licença e as obrigações de confidencialidade — são regidas pela Seção 9.5 (Efeitos da Rescisão).',
        ],
      },
      {
        heading: '7.8 Reembolsos',
        paragraphs: [
          '(a) Rescisão por justa causa pelo Cliente. Se o Cliente rescindir estes Termos em razão de descumprimento material não sanado pelo Nexo, nos termos da Seção 9.2, o Nexo reembolsará o Cliente proporcionalmente pelas taxas pagas antecipadamente referentes à parcela não utilizada do Prazo de Assinatura, calculada a partir da data efetiva da rescisão.',
          '(b) Alterações materiais no Serviço. Caso o Nexo realize alterações no Serviço que reduzam materialmente sua funcionalidade essencial e não seja capaz de oferecer funcionalidade substancialmente equivalente, o Cliente poderá rescindir o Prazo de Assinatura afetado em até trinta (30) dias após a alteração e receber reembolso proporcional das taxas pagas antecipadamente pela parcela não utilizada do prazo.',
          '(c) Cancelamento antecipado de plano anual. Para assinaturas anuais canceladas nos primeiros trinta (30) dias do Prazo de Assinatura inicial, o Cliente pode solicitar reembolso entrando em contato com sales@nexopm.com. O Nexo reembolsará o valor da assinatura, descontado o valor proporcional aos dias de uso efetivo. Este reembolso de cancelamento antecipado está disponível apenas para o Prazo de Assinatura inicial e não se aplica a renovações.',
          '(d) Demais casos. Exceto conforme expressamente previsto nesta Seção 7.8, todas as taxas são não reembolsáveis. Sem prejuízo do disposto acima, não há reembolso para: (i) meses ou períodos de cobrança parcialmente utilizados; (ii) redução de assentos (tratada como crédito nos termos da Seção 7.2); (iii) downgrade de um plano superior para um inferior; (iv) testes gratuitos ou planos gratuitos; ou (v) serviços identificados pelo Nexo como não reembolsáveis no momento da contratação.',
          '(e) Estornos. Caso o Nexo receba um estorno ou contestação de pagamento referente a taxas devidas nos termos destes Termos, isso será considerado descumprimento das obrigações de pagamento do Cliente. O Nexo pode suspender ou encerrar o acesso ao Serviço até que o valor integral, incluindo eventuais taxas de estorno ou custos de processamento, seja pago. Isso se soma a quaisquer outros remédios disponíveis ao Nexo nos termos destes Termos ou da legislação aplicável.',
          '(f) Forma de reembolso. Todos os reembolsos serão realizados pelo mesmo meio de pagamento utilizado na contratação. O Nexo não se responsabiliza por reembolsar taxas de terceiros, incluindo tarifas bancárias, conversão de moeda ou taxas de processamento do processador de pagamentos.',
        ],
      },
      {
        heading: '7.9 Suspensão por inadimplência',
        paragraphs: [
          'Se a conta do Cliente estiver com pagamento em atraso há mais de quinze (15) dias, o Nexo pode suspender o acesso ao Serviço após notificação prévia por escrito. A suspensão não exime o Cliente das obrigações de pagamento.',
        ],
      },
    ],
  },
  {
    id: 'confidencialidade',
    title: '8. Confidencialidade',
    blocks: [
      {
        heading: '8.1 Obrigações',
        paragraphs: [
          'A parte receptora deve: (a) proteger a Informação Confidencial da parte reveladora com, no mínimo, o mesmo grau de cuidado que emprega para proteger suas próprias informações confidenciais, nunca inferior a um cuidado razoável; (b) não usar a Informação Confidencial para finalidade diversa do cumprimento de suas obrigações ou exercício de seus direitos nos termos destes Termos; e (c) restringir o acesso à Informação Confidencial a funcionários, afiliadas, contratados e consultores que necessitem dela e estejam vinculados a obrigações de confidencialidade ao menos tão protetivas quanto estas.',
        ],
      },
      {
        heading: '8.2 Exclusões',
        paragraphs: [
          'Informação Confidencial não inclui informação que: (a) seja ou se torne publicamente disponível sem violação destes Termos; (b) já fosse do conhecimento da parte receptora antes da divulgação; (c) tenha sido recebida de terceiro sem violação de obrigação de confidencialidade; ou (d) tenha sido desenvolvida de forma independente, sem referência à Informação Confidencial da parte reveladora.',
        ],
      },
      {
        heading: '8.3 Divulgação compulsória',
        paragraphs: [
          'A parte receptora pode divulgar Informação Confidencial na medida exigida por lei, intimação ou ordem judicial, desde que notifique a parte reveladora prontamente e por escrito (na medida legalmente permitida) e preste cooperação razoável para que a parte reveladora busque medida protetiva.',
        ],
      },
      {
        heading: '8.4 Escopo',
        paragraphs: [
          'Os Dados do Cliente são Informação Confidencial do Cliente. O Serviço, sua tecnologia subjacente, dados de desempenho e os termos de qualquer Pedido de Contratação são Informação Confidencial do Nexo.',
        ],
      },
    ],
  },
  {
    id: 'vigencia-e-rescisao',
    title: '9. Vigência e rescisão',
    blocks: [
      {
        heading: '9.1 Vigência',
        paragraphs: [
          'Estes Termos vigoram a partir da Data de Vigência até que todos os Prazos de Assinatura tenham expirado ou sido rescindidos.',
        ],
      },
      {
        heading: '9.2 Rescisão por justa causa',
        paragraphs: [
          'Qualquer parte pode rescindir estes Termos (incluindo todos os Pedidos de Contratação relacionados) mediante notificação por escrito, caso a outra parte: (a) descumpra materialmente estes Termos e não sane tal descumprimento em até trinta (30) dias após notificação por escrito; ou (b) encerre suas atividades, seja submetida a processo de insolvência ou faça cessão de bens em benefício de credores. Caso o Cliente rescinda por justa causa nos termos desta Seção, aplicam-se as disposições de reembolso da Seção 7.8(a).',
        ],
      },
      {
        heading: '9.3 Cancelamento pelo Cliente',
        paragraphs: [
          'O Cliente pode cancelar sua assinatura paga de acordo com os procedimentos descritos na Seção 7.7. O cancelamento é uma opção de não renovação e não constitui rescisão por justa causa. As obrigações de cobrança do Cliente após o cancelamento são regidas pela Seção 7.',
        ],
      },
      {
        heading: '9.4 Rescisão pelo Nexo',
        paragraphs: [
          'O Nexo pode suspender ou encerrar o acesso do Cliente ao Serviço imediatamente, mediante notificação por escrito, se: (a) o Cliente descumprir materialmente estes Termos ou a AUP de forma não razoavelmente sanável; (b) a continuidade da prestação do Serviço ao Cliente violar as Leis aplicáveis; ou (c) a conta do Cliente estiver suspensa nos termos da Seção 7.9 e permanecer sem solução por mais de sessenta (60) dias.',
        ],
      },
      {
        heading: '9.5 Efeitos da rescisão ou expiração',
        paragraphs: [
          'Após qualquer rescisão, expiração ou cancelamento de um Prazo de Assinatura, independentemente da causa:',
          '(a) Licença. A licença do Cliente para acessar e usar o Serviço no âmbito do Prazo de Assinatura afetado é encerrada imediatamente na data efetiva. Para cancelamentos nos termos da Seção 7.7, a data efetiva é o fim do período de cobrança ou do Prazo de Assinatura vigente, conforme aplicável.',
          '(b) Dados do Cliente. Para clientes do Serviço em nuvem, o Nexo manterá os Dados do Cliente disponíveis para exportação por trinta (30) dias após a data efetiva da rescisão, expiração ou cancelamento. Após esse período, o Nexo pode excluir todos os Dados do Cliente de seus sistemas, exceto na medida em que a retenção seja exigida pela legislação aplicável, sem qualquer obrigação de mantê-los ou recuperá-los. É de responsabilidade exclusiva do Cliente exportar seus Dados dentro desse prazo.',
          '(c) Informação Confidencial. Cada parte deverá devolver ou destruir prontamente a Informação Confidencial da outra parte mediante solicitação por escrito, exceto na medida em que a retenção seja exigida por lei aplicável ou necessária para o exercício de direitos que sobrevivam a estes Termos.',
          '(d) Taxas pendentes. Quaisquer taxas acumuladas e não pagas até a data efetiva da rescisão ou expiração tornam-se imediatamente devidas. A rescisão não exime o Cliente de obrigações de pagamento incorridas antes da data efetiva. Eventuais direitos de reembolso são regidos exclusivamente pela Seção 7.8.',
          '(e) Ausência de responsabilidade adicional. Exceto pelas obrigações já vencidas e pelas disposições que sobrevivem nos termos da Seção 9.6, nenhuma das partes terá qualquer responsabilidade adicional perante a outra, nos termos destes Termos, após a data efetiva da rescisão ou expiração.',
        ],
      },
      {
        heading: '9.6 Sobrevivência',
        paragraphs: [
          'As seguintes Seções sobrevivem à rescisão ou expiração destes Termos: 1 (Definições), 4.1 (Titularidade dos Dados do Cliente), 6 (Propriedade Intelectual), 7 (na medida das obrigações de pagamento vencidas e direitos de reembolso), 8 (Confidencialidade), 9.5 (Efeitos da Rescisão), 9.6 (Sobrevivência), 10 (Isenção de Garantias), 11 (Limitação de Responsabilidade), 12 (Indenização), 15 (Legislação Aplicável e Resolução de Disputas) e 16 (Disposições Gerais).',
        ],
      },
    ],
  },
  {
    id: 'isencao-de-garantias',
    title: '10. Isenção de garantias',
    blocks: [
      {
        paragraphs: [
          'SALVO CONFORME EXPRESSAMENTE PREVISTO NESTES TERMOS, O SERVIÇO É FORNECIDO "NO ESTADO EM QUE SE ENCONTRA" E "CONFORME DISPONÍVEL". NA MÁXIMA EXTENSÃO PERMITIDA PELA LEGISLAÇÃO APLICÁVEL, O NEXO E SUAS AFILIADAS, FORNECEDORES E LICENCIADORES ISENTAM-SE DE TODAS AS GARANTIAS, EXPRESSAS OU IMPLÍCITAS, INCLUINDO GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E NÃO VIOLAÇÃO. O NEXO NÃO GARANTE QUE O SERVIÇO SERÁ ININTERRUPTO, LIVRE DE ERROS OU SEGURO, QUE DEFEITOS SERÃO CORRIGIDOS, OU QUE O SERVIÇO ESTÁ LIVRE DE VÍRUS OU OUTROS COMPONENTES NOCIVOS.',
          'O NEXO NÃO GARANTE NEM FAZ QUALQUER DECLARAÇÃO QUANTO À PRECISÃO, INTEGRIDADE OU CONFIABILIDADE DE QUALQUER CONTEÚDO, INFORMAÇÃO OU RESULTADO OBTIDO ATRAVÉS DO SERVIÇO, INCLUINDO QUALQUER RESULTADO GERADO POR IA.',
          'ESTA ISENÇÃO NÃO AFASTA OS DIREITOS ASSEGURADOS AO CONSUMIDOR PELO CÓDIGO DE DEFESA DO CONSUMIDOR, QUANDO APLICÁVEL, NEM QUALQUER GARANTIA QUE NÃO POSSA SER LEGALMENTE EXCLUÍDA.',
        ],
      },
    ],
  },
  {
    id: 'limitacao-de-responsabilidade',
    title: '11. Limitação de responsabilidade',
    blocks: [
      {
        heading: '11.1 Exclusão de danos indiretos',
        paragraphs: [
          'NA MÁXIMA EXTENSÃO PERMITIDA PELA LEGISLAÇÃO APLICÁVEL, NENHUMA DAS PARTES SERÁ RESPONSÁVEL PERANTE A OUTRA POR DANOS INDIRETOS, INCIDENTAIS, ESPECIAIS, CONSEQUENCIAIS, OU LUCROS CESSANTES, PERDA DE RECEITA, DE DADOS, DE FUNDO DE COMÉRCIO OU DE OPORTUNIDADE DE NEGÓCIO, DECORRENTES OU RELACIONADOS A ESTES TERMOS, AINDA QUE A PARTE TENHA SIDO AVISADA DA POSSIBILIDADE DE TAIS DANOS.',
        ],
      },
      {
        heading: '11.2 Limite de responsabilidade',
        paragraphs: [
          'EXCETO PELAS RECLAMAÇÕES EXCLUÍDAS (DEFINIDAS ABAIXO), A RESPONSABILIDADE TOTAL DE CADA PARTE DECORRENTE OU RELACIONADA A ESTES TERMOS NÃO EXCEDERÁ O VALOR TOTAL PAGO OU DEVIDO PELO CLIENTE NOS DOZE (12) MESES IMEDIATAMENTE ANTERIORES AO EVENTO QUE DEU ORIGEM À RECLAMAÇÃO. ESTA LIMITAÇÃO É CUMULATIVA, NÃO POR INCIDENTE.',
        ],
      },
      {
        heading: '11.3 Reclamações excluídas',
        paragraphs: [
          '"Reclamações Excluídas" significa: (a) descumprimento pelo Cliente da Seção 2.5 (Restrições) ou da AUP; (b) obrigações de indenização de qualquer das partes nos termos da Seção 12; (c) obrigações de pagamento do Cliente; ou (d) descumprimento por qualquer das partes da Seção 8 (Confidencialidade), excluídas as reclamações relacionadas a Dados do Cliente processados através do Serviço, que ficam sujeitas ao limite de responsabilidade da Seção 11.2.',
        ],
      },
      {
        heading: '11.4 Aplicabilidade',
        paragraphs: [
          'As limitações desta Seção 11 aplicam-se independentemente da forma da ação, inclusive se um remédio limitado falhar em seu propósito essencial. Elas não se aplicam na medida em que sejam proibidas pela legislação aplicável, incluindo o Código de Defesa do Consumidor, quando aplicável.',
        ],
      },
    ],
  },
  {
    id: 'indenizacao',
    title: '12. Indenização',
    blocks: [
      {
        heading: '12.1 Pelo Nexo',
        paragraphs: [
          'O Nexo defenderá o Cliente contra qualquer reclamação de terceiro alegando que o uso autorizado do Serviço pelo Cliente viola patente, direito autoral ou marca desse terceiro, e indenizará o Cliente pelos danos e custos finalmente reconhecidos por tribunal competente ou acordados em transação. Esta obrigação não se aplica caso a suposta violação decorra de: (a) modificação do Serviço pelo Cliente; (b) uso do Serviço combinado com produtos ou serviços não fornecidos pelo Nexo; (c) Dados do Cliente; ou (d) uso do Serviço pelo Cliente em violação a estes Termos.',
          'Caso o Serviço se torne, ou na opinião do Nexo seja provável que se torne, objeto de reclamação por violação, o Nexo pode, à sua escolha: (i) obter o direito de o Cliente continuar usando o Serviço; (ii) substituir ou modificar o Serviço para torná-lo não violador, mantendo funcionalidade substancialmente equivalente; ou (iii) caso (i) e (ii) não sejam comercialmente razoáveis, rescindir o Prazo de Assinatura afetado e reembolsar as taxas pagas antecipadamente pela parcela não utilizada.',
          'Esta Seção 12.1 constitui a única e exclusiva responsabilidade do Nexo por violação de propriedade intelectual.',
        ],
      },
      {
        heading: '12.2 Pelo Cliente',
        paragraphs: [
          'O Cliente defenderá, indenizará e isentará o Nexo de quaisquer reclamações de terceiros, danos e custos decorrentes de: (a) Dados do Cliente, incluindo qualquer alegação de que os Dados do Cliente violam direitos de terceiros; (b) violação destes Termos ou das Leis aplicáveis pelo Cliente ou por qualquer Usuário Autorizado; ou (c) uso do Serviço pelo Cliente ou por qualquer Usuário Autorizado em combinação com produtos ou serviços de terceiros.',
        ],
      },
      {
        heading: '12.3 Procedimento de indenização',
        paragraphs: [
          'A parte indenizada deve: (a) notificar prontamente e por escrito sobre a reclamação; (b) conceder à parte indenizadora o controle exclusivo da defesa e da transação; e (c) prestar cooperação razoável, às custas da parte indenizadora. A parte indenizadora não pode transigir qualquer reclamação de forma que imponha responsabilidade ou exija admissão de culpa pela parte indenizada sem o consentimento prévio e por escrito desta.',
        ],
      },
    ],
  },
  {
    id: 'servicos-de-terceiros',
    title: '13. Serviços de terceiros e integrações',
    blocks: [
      {
        heading: '13.1 Integrações',
        paragraphs: [
          'O Serviço pode se integrar a aplicativos, plataformas e serviços de terceiros ("Serviços de Terceiros"). O uso de Serviços de Terceiros pelo Cliente é regido por acordos separados entre o Cliente e o respectivo provedor terceiro. O Nexo não endossa, garante ou assume responsabilidade por qualquer Serviço de Terceiro.',
        ],
      },
      {
        heading: '13.2 Importadores',
        paragraphs: [
          'O Nexo oferece ferramentas para facilitar a importação de dados de plataformas de terceiros. O Cliente é responsável por garantir que o uso dos importadores esteja em conformidade com os termos de serviço da plataforma de origem e com as Leis aplicáveis.',
        ],
      },
      {
        heading: '13.3 Autenticação de terceiros',
        paragraphs: [
          'O Cliente pode se autenticar no Serviço usando credenciais de provedores terceiros (como GitHub, Google ou SSO via SAML/OIDC). A relação do Cliente com esses provedores é regida pelos respectivos termos deles. O Nexo não é responsável por atos ou omissões de provedores de autenticação de terceiros.',
        ],
      },
    ],
  },
  {
    id: 'privacidade-e-seguranca',
    title: '14. Privacidade e segurança',
    blocks: [
      {
        heading: '14.1 Segurança',
        paragraphs: [
          'O Nexo implementa medidas técnicas e organizacionais razoáveis para proteger os Dados do Cliente. Detalhes das práticas de segurança do Nexo estão disponíveis em nexopm.com/legals/security.',
        ],
      },
      {
        heading: '14.2 Privacidade',
        paragraphs: [
          'A coleta, o uso e a divulgação de dados pessoais pelo Nexo estão descritos na Política de Privacidade em nexopm.com/legals/privacy-policy, incorporada a estes Termos por referência.',
        ],
      },
      {
        heading: '14.3 Sub-processadores',
        paragraphs: [
          'O Nexo mantém uma lista de sub-processadores em nexopm.com/legals/sub-processors. O Nexo notificará o Cliente sobre alterações materiais em sua lista de sub-processadores, de acordo com o DPA.',
        ],
      },
    ],
  },
  {
    id: 'legislacao-aplicavel',
    title: '15. Legislação aplicável e resolução de disputas',
    blocks: [
      {
        heading: '15.1 Legislação aplicável',
        paragraphs: [
          'Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial pela LGPD e, quando aplicável, pelo Código de Defesa do Consumidor.',
        ],
      },
      {
        heading: '15.2 Foro',
        paragraphs: [
          'Fica eleito o foro da comarca de São Paulo, Estado de São Paulo, Brasil, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias decorrentes destes Termos — ressalvado o foro do domicílio do consumidor, quando aplicável nos termos do CDC.',
        ],
      },
      {
        heading: '15.3 Arbitragem opcional',
        paragraphs: [
          'Mediante acordo específico e por escrito entre as partes, controvérsias decorrentes destes Termos poderão ser submetidas a arbitragem, nos termos da Lei nº 9.307/1996, perante câmara arbitral a ser definida em conjunto. Nenhuma das partes é obrigada a se submeter à arbitragem na ausência desse acordo específico.',
        ],
      },
      {
        heading: '15.4 Medidas de urgência',
        paragraphs: [
          'Nada nesta Seção 15 impede qualquer das partes de buscar medida liminar ou outra tutela de urgência perante o Poder Judiciário, para prevenir dano irreparável, incluindo para a proteção de direitos de propriedade intelectual.',
        ],
      },
    ],
  },
  {
    id: 'disposicoes-gerais',
    title: '16. Disposições gerais',
    blocks: [
      {
        heading: '16.1 Controle de exportação e sanções',
        paragraphs: [
          'O Cliente declara e garante que não está localizado em, e não usará, exportará ou reexportará o Serviço para, qualquer país ou pessoa sujeitos a sanções econômicas ou comerciais abrangentes impostas pelo Brasil, pela ONU ou por outras jurisdições aplicáveis. O Cliente é o único responsável por cumprir toda a legislação de controle de exportação e sanções aplicável.',
        ],
      },
      {
        heading: '16.2 Uso por órgãos públicos',
        paragraphs: [
          'Caso o Cliente seja órgão ou entidade da administração pública, a contratação do Serviço está sujeita, no que for aplicável e compatível com este instrumento, às disposições da Lei nº 14.133/2021 (Lei de Licitações e Contratos Administrativos) ou de legislação que venha a substituí-la.',
        ],
      },
      {
        heading: '16.3 Divulgação',
        paragraphs: [
          'O Nexo pode identificar o Cliente como cliente do Nexo e usar o nome e a logo do Cliente em seu site e materiais de marketing. O Cliente pode revogar essa permissão a qualquer momento mediante solicitação por escrito a juridico@nexopm.com.',
        ],
      },
      {
        heading: '16.4 Cessão',
        paragraphs: [
          'Nenhuma das partes pode ceder estes Termos sem o consentimento prévio e por escrito da outra, exceto que qualquer das partes pode cedê-los em conexão com fusão, aquisição, reorganização societária ou venda da totalidade ou substancialmente da totalidade de seus ativos. Cessões a um concorrente direto da outra parte exigem consentimento. Qualquer cessão não autorizada é nula.',
        ],
      },
      {
        heading: '16.5 Caso fortuito e força maior',
        paragraphs: [
          'Nenhuma das partes será responsável por falha ou atraso no cumprimento de suas obrigações decorrente de causas fora de seu controle razoável, incluindo desastres naturais, guerra, terrorismo, pandemias, atos governamentais, ataques de negação de serviço ou falhas de infraestrutura de terceiros. A parte afetada deve notificar prontamente por escrito e tomar medidas razoáveis para mitigar o impacto. Se o evento persistir por mais de trinta (30) dias úteis, qualquer das partes pode rescindir estes Termos mediante notificação por escrito.',
        ],
      },
      {
        heading: '16.6 Notificações',
        paragraphs: [
          'As notificações previstas nestes Termos devem ser feitas por escrito. O Nexo opera de forma 100% remota, sem endereço físico ou escritório — por isso, as notificações são feitas exclusivamente através do Serviço ou por e-mail, nunca por correio. Notificações ao Nexo devem ser enviadas para: Nexo Software, Inc., Att.: Departamento Jurídico, e-mail juridico@nexopm.com. Notificações eletrônicas são consideradas recebidas no primeiro dia útil seguinte ao envio.',
        ],
      },
      {
        heading: '16.7 Acordo integral',
        paragraphs: [
          'Estes Termos, em conjunto com quaisquer Pedidos de Contratação, o DPA, a AUP e quaisquer outros documentos expressamente incorporados por referência, constituem o acordo integral entre as partes quanto ao seu objeto, e substituem todos os acordos, propostas e comunicações anteriores, escritos ou orais.',
        ],
      },
      {
        heading: '16.8 Alterações',
        paragraphs: [
          'O Nexo pode atualizar estes Termos periodicamente. Para clientes já contratados, as alterações passam a valer na renovação do Prazo de Assinatura vigente, salvo se o Nexo especificar uma data de vigência anterior (como para conformidade legal ou mudanças de produto). O Nexo empregará esforços razoáveis para notificar o Cliente sobre alterações materiais. Caso o Nexo especifique que a alteração vale antes da próxima renovação e o Cliente discorde, o Cliente pode rescindir o Prazo de Assinatura afetado e receber reembolso proporcional das taxas pagas antecipadamente pela parcela não utilizada.',
        ],
      },
      {
        heading: '16.9 Independência das cláusulas',
        paragraphs: [
          'Caso qualquer disposição destes Termos seja considerada inexequível, ela será modificada na medida mínima necessária para se tornar exequível, ou desconsiderada caso a modificação não seja possível, permanecendo as demais disposições em pleno vigor.',
        ],
      },
      {
        heading: '16.10 Renúncia',
        paragraphs: [
          'Atraso ou falha de qualquer das partes em exercer um direito não constitui renúncia a esse direito. Toda renúncia deve ser feita por escrito e assinada por representante autorizado.',
        ],
      },
      {
        heading: '16.11 Independência das partes',
        paragraphs: [
          'As partes são contratantes independentes. Nada nestes Termos cria sociedade, joint venture, franquia, mandato, relação fiduciária ou vínculo empregatício.',
        ],
      },
      {
        heading: '16.12 Subcontratados',
        paragraphs: [
          'O Nexo pode utilizar subcontratados para cumprir suas obrigações nos termos destes Termos, permanecendo responsável pelo cumprimento delas e pela entrega geral do Serviço.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '17. Contato',
    blocks: [
      {
        paragraphs: [
          'Em caso de dúvidas sobre estes Termos, entre em contato: Nexo Software, Inc., e-mail juridico@nexopm.com.',
          'Para relatar violações destes Termos, envie um e-mail para: juridico@nexopm.com.',
        ],
      },
    ],
  },
]

function blockId(sectionId: string, blockIndex: number) {
  return `${sectionId}-${blockIndex + 1}`
}

export default function TermsAndConditionsPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Termos de Serviço</Title>
          <Muted>Versão {TERMS_VERSION}</Muted>
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
            {section.intro?.map((paragraph) => (
              <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
            ))}
            {section.blocks?.map((block, blockIndex) => (
              <div
                key={block.heading ?? block.paragraphs[0]}
                id={block.heading ? blockId(section.id, blockIndex) : undefined}
                className='flex flex-col gap-2'
              >
                {block.heading && (
                  <SectionHeading
                    as='h3'
                    id={blockId(section.id, blockIndex)}
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
