<p align="center">
  <b>Português</b> · <a href="README.en.md">English</a>
</p>

<br />

<p align="center">
    <a href="https://nexopm.com" target="_blank" align="center">
      <img
        src="./public/brand/nexo-readme.png"
        alt="Nexo"
        width="50%"
        align="center"
      />
    </a>
</p>
<p align="center"><b>Gestão de projetos que funciona de verdade para o seu time</b></p>

<p align="center">
    <a href="https://nexopm.com/"><b>Site</b></a> •
    <a href="https://nexopm.com/status"><b>Status</b></a> •
    <a href="https://www.instagram.com/nexopmapp"><b>Instagram</b></a> •
    <a href="https://www.linkedin.com/company/nexoso"><b>LinkedIn</b></a> •
    <a href="https://nexopm.com/docs"><b>Documentação</b></a>
</p>

<p align="center">
  <a href="https://nexopm.com" target="_blank">
    <img
      src="./.github/assets/readme-banner.png"
      alt="Nexo: gestão de projetos e conhecimento num lugar só"
      width="100%"
    />
  </a>
</p>

<p align="center">
  <a href="https://github.com/castrogusttavo/nexo/actions/workflows/ci.yml">
    <img src="https://github.com/castrogusttavo/nexo/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>

  <a href="https://github.com/castrogusttavo/nexo/actions/workflows/cd.yml">
    <img src="https://github.com/castrogusttavo/nexo/actions/workflows/cd.yml/badge.svg" alt="CD" />
  </a>

  <a href="https://www.react.doctor/share?p=nexo&s=84&e=1&w=62&f=31">
    <img src="https://www.react.doctor/share/badge?p=nexo&s=84&e=1&w=62&f=31" alt="React Doctor" />
  </a>

  <a href="https://codecov.io/gh/castrogusttavo/nexo">
    <img src="https://codecov.io/gh/castrogusttavo/nexo/graph/badge.svg?token=LHSP0EU1VT" alt="Codecov" />
  </a>

  <a href="LICENSE">
    <img src="https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-blue.svg" alt="Licença: AGPL v3" />
  </a>

  <a href="CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-bem--vindos-brightgreen.svg" alt="PRs bem-vindos" />
  </a>
</p>

Conheça o [Nexo](https://nexopm.com/), uma plataforma de gestão de projetos feita para times que querem entregar sem brigar com as próprias ferramentas. Multi-tenant por padrão, opinativa onde importa e pronta para crescer com você.

> O Nexo está em desenvolvimento ativo. Projetos, issues, wiki colaborativa, cobrança e página de status já estão no ar; IA embarcada, dashboards e integrações vêm a seguir. Sugestões, ideias e bugs reportados ajudam muito.

## Instalação

Duas formas de rodar o Nexo:

- **Nexo Cloud.** Crie sua conta em [nexopm.com](https://nexopm.com). É o caminho mais rápido para começar, sem nenhuma infraestrutura para manter.
- **Auto-hospedado com Docker.** Use a sua própria infraestrutura. A stack completa roda a partir de um único arquivo Compose: veja [`infra/app.yml`](./infra/app.yml) para começar.

| Forma de instalação | Documentação                                     |
| ------------------- | ------------------------------------------------ |
| Docker              | [`infra/app.yml`](./infra/app.yml)               |

## Funcionalidades

- **Projetos e issues.** Estados, prioridades, etiquetas, responsáveis, datas de início e prazo, sub-issues, dependências, relações, comentários, anexos e votos.
- **Quatro visualizações.** Lista, quadro (kanban), calendário e cronograma, com os mesmos filtros em todas.
- **Filtros e PQL.** Filtro visual ou a PQL, uma linguagem de consulta por texto: `priority IN (HIGH, URGENT) isOverdue() order-by due-date`.
- **Estimativas.** Três sistemas (pontos, categorias e tempo) e seis modelos, como Fibonacci e tamanhos de camiseta. Cada projeto escolhe o seu, e os valores são editáveis.
- **Ciclos e módulos.** Cada issue pode ser associada a um ciclo (período) e a um módulo (assunto).
- **Wiki colaborativa.** Edição em tempo real com várias pessoas, diagramas por código (Mermaid, PlantUML e Graphviz), quadro branco com Excalidraw, equações, comentários, e importação e exportação em Markdown, HTML, Word, PDF e imagem.
- **Notas adesivas.** Notas pessoais com checklist e seis cores, visíveis só para quem as criou.
- **Workspaces.** Multi-tenant desde o primeiro dia. URLs por slug, acesso por papel (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), convites e dados isolados por time.
- **Autenticação.** E-mail e senha, login com Google e GitHub, confirmação de e-mail, redefinição de senha e verificação em duas etapas por app autenticador ou código por e-mail, com códigos de backup.
- **Cobrança.** Planos (`FREE`, `PRO`, `BUSINESS`, `ENTERPRISE`) com integração à AbacatePay, trial de 14 dias e ciclo de vida da assinatura guiado por webhooks.
- **Página de status.** `/status` público, com verificações ativas em oito componentes (aplicação, banco de dados, cache, autenticação, pagamento, e-mail, armazenamento e processamento em segundo plano), linha do tempo de incidentes, post-mortems, histórico de 90 dias e alertas no Slack.
- **Privacidade (LGPD).** Consentimento de cookies, exportação de dados e exclusão de conta de verdade após 30 dias, com o conteúdo do time mantido de forma anônima.
- **E-mails transacionais.** Templates em React Email para boas-vindas, códigos de verificação, redefinição de senha, exclusão de conta, exportação de dados, convites, trial e post-mortems de incidentes.
- **Documentação da API.** Referência OpenAPI renderizada com Scalar em `/docs`.

## Roadmap

O que vem a seguir:

- **IA embarcada:** chat que enxerga os projetos e a wiki do time, sem colar contexto na mão.
- **Dashboards e análises:** indicadores em tempo real entre projetos.
- **Ciclos completos:** criação e gestão de ciclos e módulos, tela de ciclos ativos e gráficos de burn-down.
- **Integrações:** GitHub, Slack e outras ferramentas do dia a dia.
- **Busca e atalhos:** barra de comandos (Ctrl+K) e atalhos de teclado.
- **Caixa de entrada:** notificações e atualizações do workspace num lugar só.

## Stack

- **Backend:** Next.js 16 (App Router), PostgreSQL, Prisma 7, Redis, BullMQ, Silo (S3), Better Auth, Resend.
- **Frontend:** React 19, Tailwind CSS 4, Base UI, TanStack Query, React Email, Hugeicons.
- **Qualidade:** Vitest, Playwright, Stryker, Biome, Commitlint, Husky.
- **Observabilidade:** Axiom (logs, trilha de auditoria, web vitals), Sentry (rastreamento de erros), PostHog (análise de produto, só com consentimento).

## Capturas de tela

<!--
  Coloque capturas do produto nos espaços abaixo, uma por funcionalidade ou fluxo.
  Pasta sugerida: ./public/brand/screens/<nome>.png
-->

<p>
    <a href="https://nexopm.com" target="_blank">
      <!-- <img src="./public/brand/screens/workspaces.png" alt="Workspaces" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexopm.com" target="_blank">
      <!-- <img src="./public/brand/screens/auth.png" alt="Autenticação" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexopm.com" target="_blank">
      <!-- <img src="./public/brand/screens/billing.png" alt="Cobrança" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexopm.com" target="_blank">
      <!-- <img src="./public/brand/screens/status.png" alt="Página de status" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexopm.com" target="_blank">
      <!-- <img src="./public/brand/screens/docs.png" alt="Documentação da API" width="100%" /> -->
    </a>
</p>

## Desenvolvimento local

Suba a infraestrutura (Postgres, Redis, worker do BullMQ e Silo para armazenamento S3) com Docker Compose e depois rode o servidor de desenvolvimento:

```bash
pnpm install
pnpm docker:create        # só na primeira vez: cria e inicia os containers
pnpm prisma:migrate:dev   # aplica as migrations
pnpm dev
```

Nas próximas vezes, `pnpm infra` inicia os containers e aplica as migrations pendentes num passo só. Os arquivos Compose ficam em `infra/`: `dev.yml` (esta stack), `app.yml` (os containers da aplicação), `prod.yml` (a infraestrutura do servidor) e `loadtest.yml`. Veja esses arquivos e o bloco `scripts` do `package.json` para o panorama completo.

## Documentação

A referência da API e a documentação do produto ficam em [nexopm.com/docs](https://nexopm.com/docs).

## Como contribuir

Contribuições são bem-vindas. Veja o [`CONTRIBUTING.md`](CONTRIBUTING.md) para as instruções de ambiente, as convenções de código e o processo de PR. Ao participar, você concorda em seguir o nosso [Código de Conduta](CODE_OF_CONDUCT.md).

## Segurança

Se você encontrar uma vulnerabilidade, reporte de forma responsável em vez de abrir uma issue pública. Veja o [`SECURITY.md`](SECURITY.md) para saber como reportar de forma privada: envie um e-mail para **security@nexopm.com** com a descrição e os passos para reproduzir. Levamos todo relato legítimo a sério e investigamos com rapidez.

## Licença

O Nexo é distribuído sob a [GNU Affero General Public License v3.0](LICENSE) (AGPLv3).
