---
title: "Bastidores: como cortamos pela metade a escrita do autosave da wiki sem arriscar nada"
slug: bastidores-autosave-wiki-yjs
date: 2026-09-02
excerpt: "A wiki do Nexo já salva em tempo real via Yjs. Então por que ainda tinha um autosave REST rodando por baixo — e por que dava pra deixar ele mais lento sem perder uma letra?"
tag: TECNOLOGIA
---

## Duas escritas pra cada tecla

Cada tecla que você aperta na wiki do Nexo dispara duas coisas ao mesmo tempo. A gente só prestava atenção numa delas.

**O que mudou:**

- Debounce do autosave REST: `800ms` → `1500ms`
- Frequência de escrita durante digitação rápida: cortada quase pela metade
- Risco de perda de digitação: nenhum — antes e depois

A primeira escrita é a óbvia: o conteúdo sincroniza em tempo real com quem mais estiver na página, via [Yjs](https://docs.yjs.dev/) (um CRDT — a estrutura de dado que resolve edição concorrente sem trava nem "última escrita vence") conversando com um servidor [Hocuspocus](https://tiptap.dev/docs/hocuspocus/introduction) dedicado. A segunda é menos óbvia: por baixo, o editor também dispara um autosave REST comum, salvando o texto como JSON simples no Postgres.

Duas cópias do mesmo conteúdo, dois caminhos de escrita. Isso não é redundância por acidente — é intencional. Só que ninguém tinha revisitado se o segundo caminho ainda precisava ser tão agressivo quanto era no primeiro dia do editor.

## Por que existem dois caminhos pro mesmo conteúdo

O doc Yjs guarda o estado binário do CRDT — ótimo pra sincronizar edição concorrente, inútil pra qualquer coisa que precise *ler* o texto sem rodar Yjs primeiro. Listagem de páginas, busca, preview: nada disso quer decodificar um documento CRDT só pra mostrar as três primeiras linhas.

Por isso existe `WikiPage.content`: um snapshot plano em JSON, mantido por um autosave REST separado, que serve exatamente pra esses casos de uso fora do editor. O problema nunca foi ter os dois caminhos — foi a velocidade de um deles.

## O número que ninguém tinha questionado

```ts
// antes
const AUTOSAVE_DELAY_MS = 800 // ms
```

800ms de debounce parece razoável até você lembrar que a wiki inteira já tem uma rede de segurança melhor rodando ao lado: o Hocuspocus persiste o doc Yjs no Postgres sozinho, com o próprio debounce da lib (`2000ms`, com teto de `10000ms`), escrevendo o snapshot binário completo via `Y.encodeStateAsUpdate()` a cada save.

Ou seja: **nada depende do autosave REST pra não perder uma tecla digitada.** Ele existe só pra manter o JSON plano razoavelmente atualizado — não é a fonte de verdade, é uma cópia de conveniência pra fora do mundo Yjs.

## O ajuste

```ts
// depois
// O conteúdo real já está sincronizado em tempo real via Yjs/Hocuspocus —
// este autosave só mantém WikiPage.content (o snapshot plano em JSON, usado
// por listagem/busca fora do doc Yjs) atualizado. Como nada depende dele pra
// não perder digitação, um debounce maior aqui só reduz a frequência de
// escrita sem risco real de perda de dado.
const AUTOSAVE_DELAY_MS = 1500 // ms
```

Quase dobrar o debounce corta a frequência de escrita do autosave REST pela metade durante digitação rápida — menos round-trip pro Postgres, menos carga de escrita, zero risco novo. A garantia de durabilidade nunca esteve nesse caminho pra começar.

A gente também revisou o outro lado — o debounce do próprio Hocuspocus — antes de mexer em qualquer coisa. Estava certo do jeito que já era: defaults da lib bem calibrados pra um doc colaborativo por página. Não precisava de ajuste, só de confirmação.

## A lição

O ajuste real aqui não foi mudar um número — foi entender qual dos dois caminhos de escrita era a rede de segurança de verdade antes de mexer no outro. Se a gente tivesse mexido no debounce do Hocuspocus achando que era "a mesma coisa" do autosave REST, teria arriscado exatamente o que queria evitar: perder digitação numa queda de conexão. Em vez disso, sobrou margem num caminho que nunca precisou ser rápido pra começo de conversa.
