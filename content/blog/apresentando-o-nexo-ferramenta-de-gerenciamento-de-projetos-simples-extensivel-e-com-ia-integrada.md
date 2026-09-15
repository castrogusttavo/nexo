---
title: "Apresentando o Nexo: Ferramenta de gerenciamento de projetos simples, extensível e com IA integrada"
slug: "apresentando-o-nexo-ferramenta-de-gerenciamento-de-projetos-simples-extensivel-e-com-ia-integrada"
date: "2026-07-16"
excerpt: "Gerencie problemas, sprints e roadmap de produtos com tranquilidade."
cover: "/coverImages/image_1.jpg"
tag: "ANUNCIOS"
---

O Nexo é uma ferramenta de gerenciamento de produtos simples, extensível e **baseada em IA**. Ele
permite que os usuários comecem com uma ferramenta básica de rastreamento de tarefas e adotem
gradualmente várias estruturas de gerenciamento de projetos como Agile, Waterfall e muitas outras.

Neste post, vou explicar algumas das principais características do Nexo e como eles podem ajudá-lo a
gerenciar seus grandes projetos ou produtos de forma mais eficaz e rápida.

![arquitetura do nexo](https://plane.so/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fhero-desktop-light.webp&w=1920&q=75&dpl=dpl_HAA1aS9snWdLCm8mBZrKo75TVmM1)

O Nexo foi construído usando uma stack cuidadosamente selecionada: Next.js para frontend e backend
(as rotas de API vivem no próprio app, seguindo o fluxo rota → serviço → repositório → banco), PostgreSQL
como banco de dados principal e Redis para cache e processamento de tarefas em segundo plano com BullMQ.
[confirmar: temos um serviço de IA baseado em OpenAI/LangChain? preciso validar antes de publicar essa frase]

Atualmente, o Nexo Cloud está hospedado em servidor próprio para o frontend e os serviços de backend.

## Workspaces e projetos

![SUBSTITUA_PELA_IMAGEM_REAL: tela de workspace/projetos](SUBSTITUA_PELA_IMAGEM_REAL.png)

É muito fácil começar sua equipe no Nexo. Depois de se inscrever, você pode criar um espaço de trabalho e convidar sua equipe. Em seguida, você pode criar projetos dentro do espaço de trabalho e adicionar os membros da equipe a eles.

Os auto-hospedadores podem configurar seus serviços de e-mail configurando chaves ENV e usar todos os recursos de e-mail no Nexo.

## Wiki

![SUBSTITUA_PELA_IMAGEM_REAL: tela da wiki](SUBSTITUA_PELA_IMAGEM_REAL.png)

As questões são os blocos de construção fundamentais do Nexo, semelhantes aos blocos em Notion. Todas as suas atividades no Nexo estão vinculadas a problemas, permitindo que você conclua as tarefas atribuídas a você.

Assim que você iniciar um projeto, você pode começar a criar problemas pressionando a tecla de atalho C. Você pode usar a opção I'm Feeling Lucky localizada logo abaixo do título para permitir que a IA gere uma descrição, ou você pode clicar no botão AI para solicitar uma descrição.

Você pode visualizar todos os problemas em um projeto usando três visualizações diferentes: Lista, Kanban e Calendário. As visualizações da Lista e do Kanban são simples de entender. A visualização Calendário mostra os problemas com as datas de vencimento, o que lhe dá uma ideia melhor dos prazos.

### Detalhamento da wiki

A interface do usuário simples do Nexo facilita a adição de detalhes do problema. Você tem acesso a um editor de rich text com suporte de marcação e upload de imagem para adicionar todos os recursos e informações necessários para concluir seu problema.

Na barra lateral direita, você pode encontrar todas as subpropriedades de problemas, como estado, estimativa, prioridade, data de vencimento, cessionário e ferramentas de colaboração para ajudá-lo a priorizar problemas.

## Ciclos

![SUBSTITUA_PELA_IMAGEM_REAL: tela de ciclos](SUBSTITUA_PELA_IMAGEM_REAL.png)

No Nexo, um ciclo é um período de tempo específico durante o qual uma equipe trabalha na conclusão de itens em seu backlog. Normalmente, no final do ciclo, a equipe teria construído e implementado uma nova versão de seu projeto ou produto.

**Apenas um ciclo pode ser ativo em um determinado momento, enquanto os outros podem estar em um estado completo ou futuro.**

Criar ciclos e adicionar problemas dentro deles é muito fácil. Você pode usar a tecla de atalho Q para criar um novo ciclo. Dentro do ciclo, você pode criar novos problemas ou adicionar em massa problemas no backlog com apenas alguns cliques.

Para gerenciar o escopo, você pode utilizar o gráfico de burndown e os escopos Assignees e Labels encontrados na barra lateral da direita.

## Módulos

![SUBSTITUA_PELA_IMAGEM_REAL: tela de módulos](SUBSTITUA_PELA_IMAGEM_REAL.png)

Os módulos são projetos menores e focados que ajudam você a agrupar e organizar problemas dentro de um período de tempo específico. Eles permitem que você quebre seu trabalho em partes gerenciáveis e acompanhe o progresso em direção a metas ou objetivos específicos.

## Visualizações

![SUBSTITUA_PELA_IMAGEM_REAL: tela de visualizações](SUBSTITUA_PELA_IMAGEM_REAL.png)

As visualizações do Nexo permitem que você personalize suas propriedades de problema adicionando filtros e agrupando-os de acordo com suas preferências. Você pode aplicar essas personalizações a listas ou visualizações do Kanban, ou criá-las e salvá-las separadamente para compartilhar com sua equipe.

## Pages

![SUBSTITUA_PELA_IMAGEM_REAL: tela de pages](SUBSTITUA_PELA_IMAGEM_REAL.png)

Páginas no Nexo permitem que você faça anotações rapidamente durante stand-ups ou reuniões e converta-as em problemas com apenas alguns cliques.

Você pode mover blocos de Páginas para problemas e sincronizá-los para copiar automaticamente todas as descrições para os problemas.

## Configurações e Preferências

![SUBSTITUA_PELA_IMAGEM_REAL: tela de configurações](SUBSTITUA_PELA_IMAGEM_REAL.png)

O Nexo oferece uma ampla gama de personalizações, incluindo a capacidade de atualizar seus fluxos de trabalho e trabalhar com seus temas favoritos.

- Membros: Adicione e gerencie membros da equipe com quatro níveis de permissões: Proprietário, administrador, membro e espectador.
- Temas: Escolha entre quatro temas pré-construídos - modos de contraste claro, escuro, claro e contraste escuro.
- Gerenciar fluxos de trabalho: Adicione um número ilimitado de estados e organize-os com base em suas preferências.
- Gerenciar rótulos: crie rótulos personalizados e rótulos agrupados para organizar melhor seus problemas.
- Estimativa: Crie pontos de estimativa personalizados para seus problemas com até seis níveis.

## Dev-First (Teclado como primeira abordagem)

![SUBSTITUA_PELA_IMAGEM_REAL: menu de comando](SUBSTITUA_PELA_IMAGEM_REAL.png)

Ao usar atalhos e o menu de comando, você pode trabalhar com mais eficiência no Nexo.

O menu de comando fornece um recurso de pesquisa global que permite que você navegue para qualquer página ou problema em segundos. Além disso, enquanto trabalha dentro de problemas, você pode atualizar todas as propriedades com o menu de comando, sem sequer tocar no mouse.

Atualmente, o Nexo oferece duas integrações: o GitHub Sync e o Slack.

- O GitHub Sync permite que os usuários conectem qualquer repositório do GitHub a um projeto do Nexo, permitindo a sincronização cruzada de problemas entre o Nexo e o GitHub em ambas as direções.
- A integração do Slack permite que os usuários enviem notificações para canais preferidos sempre que os problemas forem atualizados ou criados. Você pode até criar problemas usando comandos do Slack diretamente do Slack.

Atualmente, o Nexo oferece dois importadores, JIRA e GitHub. Com esses importadores, você pode facilmente trazer todos os problemas, sprints e épicos para o Nexo simplesmente configurando tokens.

Atualmente, essas integrações e importadores estão disponíveis apenas na versão em nuvem.

## O que vem a seguir?

Neste post, destaquei algumas das principais características do Nexo. Nos próximos posts, vamos falar mais sobre os recursos de IA e sobre o que vem pela frente.

Ainda estamos nos estágios iniciais de desenvolvimento e apreciamos o feedback e o apoio de quem está testando com a gente.
