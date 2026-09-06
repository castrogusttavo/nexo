---
title: "Bastidores: comentários em tempo real na wiki sem abrir mais um canal"
slug: bastidores-comentarios-tempo-real-wiki
date: 2026-09-01
excerpt: "Toda página da wiki do Nexo já mantém uma conexão em tempo real aberta pro editor colaborativo. Em vez de abrir uma segunda só pra comentários, a gente reaproveitou a primeira."
tag: TECNOLOGIA
---

## O canal que já estava aberto

Você abre uma página da wiki do Nexo. Sem fazer nada, o editor já sobe uma conexão com o servidor Hocuspocus pra sincronizar o texto via Yjs em tempo real. Essa conexão carrega mais do que o conteúdo do documento — ela também tem um canal de **awareness**, o protocolo que o Yjs usa pra transmitir presença: quem está na página, a cor do cursor de cada um, a posição de cada cursor a cada tecla.

**O que a gente evitou construir:**

- Um WebSocket dedicado só pra comentários
- Mais uma conexão por cliente pra autenticar, reconectar e monitorar
- Mais um ponto de falha no editor

Comentário é outra história. Ele não vive dentro do doc Yjs — mora no Postgres, como qualquer outra entidade do sistema, com seu próprio service e sua própria tabela. Sem fazer nada, dois usos desse canal já existiam: sincronizar texto e transmitir presença de cursor. A gente precisava de um terceiro: avisar todo mundo olhando a mesma página que um comentário mudou.

## O caminho óbvio (que a gente não tomou)

A solução mais direta seria abrir um canal de tempo real dedicado só pra comentários. Funciona — várias equipes fazem exatamente isso. Só que a wiki já tinha uma conexão em tempo real aberta, autenticada, com reconexão automática, rodando por página. A pergunta virou: dá pra avisar "um comentário mudou" usando o canal que já existe, em vez de abrir outro?

## Reaproveitando a awareness

Awareness não é feita só pra cursor — é um dicionário de estado arbitrário que cada cliente conectado expõe pros outros. Em vez de inventar transporte novo, cada mutação de comentário (criar, editar, resolver, apagar) atualiza o próprio estado de awareness do cliente que fez a mutação:

```ts
function broadcastCommentsChanged() {
  editor
    .getOption(YjsPlugin, 'awareness')
    ?.setLocalStateField('wikiCommentsRev', Date.now())
}
```

Do outro lado, todo cliente olhando a mesma página escuta mudanças nesse canal. Quando percebe que a revisão de um colaborador avançou, invalida a query de comentários — o React Query busca de novo, a UI atualiza sozinha:

```ts
awareness.on('change', handleChange)
// dentro de handleChange: compara wikiCommentsRev de cada peer
// contra o último valor visto; só reage se mudou
```

Zero conexão nova. Zero servidor novo. A mesma conexão que já garantia colaboração de texto agora também garante comentário em tempo real.

## O detalhe que quase estragava tudo

Awareness já dispara mudança a cada movimento de cursor — de todo mundo, a cada tecla. Se o listener reagisse a qualquer evento de `change` no canal, a gente teria uma tempestade de refetch de comentários toda vez que alguém só movesse o mouse.

A correção foi guardar, por cliente conectado, a última revisão vista:

```ts
const lastRevByClientRef = useRef<Map<number, number>>(new Map())
```

E só disparar a invalidação quando o `wikiCommentsRev` de um peer específico realmente mudou de valor — não em qualquer tick do canal. Sem esse detalhe, "reaproveitar infraestrutura existente" teria trocado um problema (canal novo) por outro pior (refetch em excesso a cada movimento de mouse de qualquer colaborador).

## A lição

Reaproveitar um canal que já existe é mais barato do que abrir um novo — mas nunca é de graça. O preço não é escrever menos código de transporte, é filtrar o ruído de um canal desenhado pra outra coisa. Quem for reaproveitar awareness, presença, ou qualquer protocolo de "estado compartilhado" pra um caso de uso que não é o original paga esse imposto de qualquer jeito. A questão é só se você paga de propósito, como aqui, ou descobre depois que seu app está refazendo fetch a cada movimento de cursor de todo mundo na sala.
