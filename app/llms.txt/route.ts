import { NEXT_PUBLIC_URL } from '@/lib/env/env'

// Convenção emergente (llmstxt.org): resumo do produto em markdown,
// pensado pra ser lido por LLMs/engines de resposta. Gerado como rota
// dinâmica (em vez de public/llms.txt estático) pra usar NEXT_PUBLIC_URL
// e nunca hardcodar domínio errado entre ambientes.
export function GET() {
  const body = `# Nexo

> Nexo é uma plataforma de gestão de projetos nativa em IA: projetos, wiki e fluxos de trabalho com IA embarcada em um único workspace, para times (e agentes) planejarem, executarem e ficarem alinhados sem trocar de ferramenta.

## Produto

- [Planos e preços](${NEXT_PUBLIC_URL}/pricing): planos por assento, do gratuito ao Enterprise, com opção de implantação privada.
- [Blog](${NEXT_PUBLIC_URL}/blog): novidades, bastidores técnicos e decisões de produto.
- [Carreiras](${NEXT_PUBLIC_URL}/careers): vagas abertas na equipe do Nexo.
- [Status](${NEXT_PUBLIC_URL}/status): status em tempo real dos serviços.
- [Fale com vendas](${NEXT_PUBLIC_URL}/talk-to-sales): contato para o plano Enterprise.

## Legal

- [Política de Privacidade](${NEXT_PUBLIC_URL}/legals/privacy)
- [Termos de Serviço](${NEXT_PUBLIC_URL}/legals/terms)
- [Segurança](${NEXT_PUBLIC_URL}/legals/security)
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
