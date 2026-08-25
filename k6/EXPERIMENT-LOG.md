# Log de experimentos — escalando /issues

Objetivo: achar o teto real de usuários simultâneos que `/issues` aguenta
localmente, testar mudanças de arquitetura uma a uma, e documentar o efeito
de cada uma. Dados brutos ficam em `k6/results/*.json`; este arquivo é o
resumo interpretado.

Setup fixo em todos os testes: seed com 15.000 issues no projeto `CORE`
(`pnpm seed:load-test`), servidor rodando via `node .next/standalone/server.js`
(não `next start` — ver nota abaixo), stress test em `k6/stress-issues.js`
(rampa 10→200 VUs, aborta se falha > 50%).

## Nota — VU do k6 não é "usuário real"

Importante pra interpretar todos os números deste log (e pro artigo): uma
VU (Virtual User) do k6 roda a função de teste **em loop, sem pausa
nenhuma entre iterações** — nenhum dos scripts (`stress-issues.js`,
`stress-issues-multi.js`, `flows.js`) tem `sleep()`/think-time. Isso
significa que uma VU dispara o próximo request assim que o anterior
termina, o mais rápido que o servidor conseguir responder. Sem carga
nenhuma, 1 VU sozinha fez **258 requests em 3 segundos** contra
`/issues` — nenhum humano gera esse volume.

Ou seja: **"200 VUs" não é "200 usuários usando o Nexo"**. É mais perto
de "200 clientes martelando `/issues` sem parar" — um teste de *stress*
(pressão máxima num endpoint específico), deliberadamente mais agressivo
que tráfego real, feito pra achar o ponto de ruptura rápido, não pra
simular navegação real.

Pra estimar "usuários reais equivalentes", o número que importa é o
throughput sustentado, não a contagem de VUs. Na Rodada 2, o servidor
sustentou ~7-8 requests/s em `/issues` sob a rampa até 200 VUs
(`iterations: 7,38/s`). Se um usuário real bate em `/issues` a cada
~20-30s (abrindo/atualizando a lista ocasionalmente, não em loop),
isso equivale a uma capacidade sustentada de aproximadamente
**150-230 usuários reais simultâneos olhando pra esse projeto ao mesmo
tempo** — bem diferente de "200 usuários". Todo número de VUs citado
daqui pra frente neste log deve ser lido com essa ressalva.

## Nota — `next start` não serve para este build

`next.config.ts` usa `output: 'standalone'`. `next start` não é suportado
nesse modo (o próprio Next avisa). Rodar assim mascarava os dados: sem log
de request e, aparentemente, causando os 500 genéricos da primeira rodada.
Depois de trocar para `node .next/standalone/server.js` (com `public/` e
`.next/static/` copiados manualmente pro build standalone, que não copia
sozinho), a taxa de erro do baseline (15 VUs) caiu de 1,83% para 0% — mesma
carga, resultado diferente. Esse "achado" foi descartado do artigo.

## Baseline real (sem concorrência)

- 1 request: ~450-600ms, payload 8,6MB (15k issues, sem paginação)
- Rota real: `GET /api/workspaces/{id}/projects/{slug}/issues` (não a
  página SSR — essa é só o shell; os dados vêm via TanStack Query)

## Experimento 1 — baseline sob carga (`DB_POOL_MAX=5`, valor original)

Config: `src/lib/prisma.ts`, pool do Postgres travado em `max: 5`.

- 15 VUs constantes: 0% erro, mas p50 sobe pra 3,15s / p95 6,16s (6-7× mais lento)
- Stress (rampa até 200 VUs): estável até ~25 VUs, rachaduras a partir de
  ~50, colapso real (timeouts de 30s) a partir de ~100 VUs
- Resultado: `k6/results/stress-issues-20260822-1431.json`

## Experimento 2 — pool 5→20

Mudança: `DB_POOL_MAX=20` (env var, adicionada em `src/lib/prisma.ts` pra
não precisar de rebuild a cada teste — só precisa uma vez pra ler a env).

- Resultado: **quase nenhuma diferença**. Primeiras falhas até um pouco
  mais cedo (40-50s vs 50-60s), colapso total na mesma janela (~110-130s),
  só o volume total processado antes de quebrar foi um pouco maior (785 vs
  639 requests)
- Conclusão: pool de conexão **não é o gargalo dominante**
- Resultado: `k6/results/stress-issues-pool20-20260822-1436.json`

## Experimento 3 — monitorar CPU do processo Node durante o stress (pool=20)

Método: `ps -p <pid> -o %cpu,%mem` amostrado a cada 1s durante o stress test
(sysstat/pidstat não estava instalado). Máquina tem 4 cores.

- CPU do processo Node sobe de forma **monótona e contínua**: 88% → 109%
  ao longo do teste, nunca recupera. Memória sobe junto: 21% → 38%.
- Isso é a assinatura clássica de **saturação de single-thread**: o processo
  Node usa essencialmente 1 core inteiro (e passa um pouco disso, contando
  o thread pool do libuv), enquanto os outros 3 cores da máquina ficam
  disponíveis e não são usados — porque é um processo Node único, sem
  cluster/múltiplas instâncias.
- Conclusão: o gargalo real é **CPU de serialização JSON de um payload de
  8,6MB, repetida por request, num processo single-thread** — não o banco.
  Isso explica por que aumentar o pool (Experimento 2) quase não ajudou:
  não importa quantas conexões o Postgres libera, o processo Node já está
  gastando praticamente 100% de um core só montando/serializando a
  resposta.
- Resultado: `k6/results/stress-issues-cpu-20260822-1448.json`,
  CPU bruto salvo à parte (amostragem local, não versionado)

## Achado secundário — "Invalid password" sob concorrência

Sob stress pesado (~200 VUs), uma fração pequena mas real de logins (~3%,
6 em ~185 tentativas) falha com `Invalid password` no log do better-auth —
mesma senha fixa pra todos os usuários seed. Não investigado a fundo ainda;
hipótese: contenção no binding nativo do argon2 sob concorrência alta. Não
é bug do k6 (confirmado via contagem exata no log do servidor batendo com
as falhas reportadas). Fica registrado, não é o foco principal agora.

## Experimento 4 — escalonamento horizontal real (4 instâncias, 1 por core)

Mudança: 4 processos `node .next/standalone/server.js` (portas
3000-3003, `DB_POOL_MAX=15` cada — 60 conexões no total, dentro do limite
de 100 do Postgres), sem tocar em código de aplicação. k6 distribui os
VUs entre as 4 portas por round-robin sticky (`k6/stress-issues-multi.js`).

- **Não abortou** — rodou a rampa inteira até 200 VUs e voltou, coisa que
  nenhuma rodada de instância única conseguiu (sempre abortava por volta
  de ~110-130s com >50% de falha)
- Volume total processado: 1245-1303 requests vs 785-934 (instância
  única) — **~40-70% mais throughput bruto**
- Padrão de falha mudou: em vez de colapso total (ok caindo pra ~0), o
  `ok` por janela de 10s ficou estável (~25-36) do início ao fim — o
  sistema **degrada, mas não morre**
- CPU por instância (pico): 428307=59.8%, 428309=59.8%, 428311=55.7%,
  428313=54.0% — **bem abaixo dos 88-109% da instância única**. CPU
  deixou de ser o gargalo.
- Resultado: `k6/results/stress-issues-multi-20260822-1454.json`

## Experimento 5 — CPU do Postgres durante o teste multi-instância

Método: `docker stats nexo-db` amostrado a cada 2s durante uma repetição
do Experimento 4.

- CPU do container do Postgres oscila entre 30% e **194%** durante o
  teste (média bem acima de 70-90%), contra ~0% fora de carga — o banco
  está genuinamente sob pressão real, não é ruído
- Resultado: `k6/results/stress-issues-multi-pgcpu-20260822-1458.json`,
  CPU bruto do Postgres em `pg-cpu-monitor.log` (local, não versionado)

## Conclusão da rodada — cadeia causal completa

1. **Instância única**: gargalo é CPU do processo Node (single-thread),
   saturado montando/serializando 8,6MB de JSON por request sem paginação
   — colapsa em ~100 VUs simultâneos.
2. **Aumentar o pool de conexão (5→20)**: quase não ajuda, porque o
   gargalo nunca foi o pool — era CPU do Node.
3. **Escalar horizontalmente (4 instâncias)**: ajuda de verdade — mais
   throughput, sem colapso total — porque usa os cores que estavam
   ociosos. Mas **não resolve o problema, só move o teto**: agora o
   Postgres compartilhado é quem sofre, porque as 4 instâncias continuam
   rodando a mesma query sem paginação, só que em paralelo.
4. **Causa raiz de tudo**: `IssueRepository.listByProject` (`src/repositories/issue.repository.ts:27`)
   busca o projeto inteiro sem `take`/`skip`/cursor. Escalar
   horizontalmente é um remendo real (funciona, mede-se o ganho), mas
   não ataca a causa — só reparte o custo entre mais processos e mais
   carga no banco.

## Rodada 2 — servidor de produção real (8 cores, 3.7GB RAM, 15GB swap)

Autorizado explicitamente pelo usuário, servidor pré-lançamento sem
usuários reais ainda. Mesmo seed (`SEED_MAIN_ISSUES=15000`), mesmo script
(`k6/stress-issues.js`), rodando fora do container (`nextjs-app` via
Docker, imagem já buildada em modo standalone).

### Achado 1 — porta 3000 não é alcançável da internet pública

`curl` direto pra `http://187.75.185.171:3000` a partir da minha máquina
dá timeout, mesmo com `curl` de dentro do próprio servidor pra
`127.0.0.1:3000` retornando 200. `ufw` está inativo e o `iptables` local
(`INPUT` policy `ACCEPT`, sem regras de bloqueio) não é o culpado — o
bloqueio é a nível de firewall/security group do provedor de nuvem, fora
do meu alcance via SSH. Só 80/443 respondem de fora.

### Achado 2 — rate limit do nginx derruba teste de IP único quase na hora

Testando via `https://187.75.185.171` (nginx), o teste abortou em **6s**
com só 2 VUs, 99% de falha — tudo `429` em `auth_setup`. O spoof de
`X-Forwarded-For` que funciona contra o rate limiter da aplicação (Redis,
por IP, ver `src/lib/auth.ts`) não engana o nginx, porque a zona de
`limit_req` do nginx é chaveada pelo IP real do socket
(`$binary_remote_addr`), não por header controlado pelo cliente. Um teste
de carga de uma única máquina é, do ponto de vista do nginx, um único IP
abusivo — e é bloqueado como deveria. **Isso é bom sinal de produção**,
mas significa que não dá pra medir capacidade real de app por esse
caminho sem distribuir os VUs entre muitos IPs de origem.

### Achado 3 — 403 ao rodar k6 direto no host contra `localhost:3000`

Pra contornar os dois achados acima, rodei o k6 *dentro* do próprio
servidor (upload do binário + script via SFTP), mirando
`http://localhost:3000` — sem passar pelo firewall de nuvem nem pelo
nginx. Primeira tentativa: **100% de falha, tudo 403 em `auth_setup`**.
Causa: better-auth valida o header `Origin` contra `trustedOrigins`
(`src/lib/auth.ts:44`), travado em `BETTER_AUTH_URL` — em produção,
`https://nexo.coodee.dev`. O script mandava `Origin: http://localhost:3000`
(o mesmo valor da URL de conexão), que não bate com o domínio
configurado. Corrigido separando a URL de conexão do header `Origin` —
`stress-issues.js` agora aceita `ORIGIN` como env var independente de
`BASE_URL` — e rodando com
`BASE_URL=http://localhost:3000 ORIGIN=https://nexo.coodee.dev`.

### Resultado real — rampa completa até 200 VUs, sem abortar

Com o `Origin` corrigido, o teste rodou a rampa inteira (10→200 VUs,
2m30s) **sem abortar** — algo que nenhuma rodada local de instância única
conseguiu (sempre abortava por volta de ~110-130s).

- `auth_setup`: **100% sucesso** (1382/1382) — zero problema de login
  sob carga real, diferente do achado secundário "Invalid password" da
  Rodada 1
- `issues`: **52,3% sucesso** (645/1233) — 588 falhas. **Correção**: a
  versão anterior deste log dizia "majoritariamente timeout de 30s" —
  errado. Contagem real por status HTTP: **567 respostas `500`** e 21
  `401`, **zero** timeout de fato (status `0`, que indicaria o k6 nunca
  recebendo resposta). Ou seja, o servidor está devolvendo erro
  explícito sob carga, não só ficando lento — `http_req_duration` alto
  (p95 = 21,53s, max = 29,56s) é sintoma da fila de requests esperando
  pra serem processados antes de errar, não de requests presos sem
  resposta. Gráfico: `k6/charts/08-producao-real-status-http.png`
- Taxa de falha total ficou em 41% (threshold `rate<0.5` não foi
  cruzado, por isso não abortou)
- `data_received`: **4,8GB** no total — reflexo direto do payload de
  8,6MB por request sem paginação (mesma causa raiz da Rodada 1)
- Resultado bruto: `k6/results/remote-onbox-localhost3000-20260822-1745.json`
  (rodado no host remoto via SFTP, copiado manualmente pra cá)

### CPU/RAM real do container `nextjs-app` durante o teste

Amostrado via `docker stats` a cada 2s no host remoto:

- CPU: pico de **176%** (de 800% disponíveis em 8 cores) — bem menos
  saturado proporcionalmente que os 88-109%/400% (≈22-27%) da máquina
  local de 4 cores. Mais cores ociosos ajudam mesmo sem paralelizar a
  aplicação, porque sobra mais espaço pro thread pool do libuv e pro GC.
- **RAM: pico de 2,6GB, de 3,7GB totais do host (~70%)** — achado novo,
  não visto na Rodada 1 (a máquina local tem bem mais RAM de sobra). O
  mesmo payload de 8,6MB por request, empilhado em alta concorrência,
  quase esgota a memória disponível numa instância de produção
  real. Isso é um risco genuíno de OOM que só aparece com hardware do
  tamanho real da produção — não teria aparecido testando só localmente.
- `nexo-db-1` ficou essencialmente ocioso (pico de ~22%, maioria <2%) —
  esperado, é instância única, sem o efeito de "move o gargalo pro banco"
  da Rodada 1 (que só apareceu com 4 instâncias em paralelo)

### Conclusão da Rodada 2

A causa raiz continua a mesma da Rodada 1 (query sem paginação em
`IssueRepository.listByProject`), mas o hardware real de produção expõe
uma dimensão que a máquina local não mostrou: **RAM, não só CPU, é um
gargalo real** quando o payload por request é grande e a memória
disponível é limitada (3,7GB). Isso reforça — com dado real de produção,
não só de laptop — que paginar `/issues` é a correção que ataca a causa
raiz, e que escalar horizontalmente numa VM deste tamanho tem uma margem
de segurança menor do que os testes locais sugeriam (2,6GB de pico numa
única instância deixa pouco espaço pra rodar mais de uma réplica sem
paginação primeiro).

## Gráficos

Imagens geradas a partir dos dados brutos deste log, em `k6/charts/`:

1. `01-latencia-baseline-vs-colapso.png` — p50/p95 baseline vs stress (Exp. 1)
2. `02-pool-nao-e-o-gargalo.png` — throughput pool=5 vs pool=20 (Exp. 1 vs 2)
3. `03-cpu-single-thread-satura.png` — CPU do Node ao longo do tempo, instância única (Exp. 3)
4. `04-escalonamento-horizontal-throughput.png` — throughput 1 vs 4 instâncias (Exp. 1/2 vs 4)
5. `05-cpu-por-instancia-horizontal.png` — CPU de cada uma das 4 instâncias ao longo do tempo (Exp. 4)
6. `06-gargalo-move-pro-postgres.png` — CPU do Postgres ao longo do tempo, 4 instâncias (Exp. 5)
7. `07-producao-real-cpu-ram.png` — CPU e RAM do container em produção real, 200 VUs (Rodada 2)
8. `08-producao-real-status-http.png` — breakdown por status HTTP em produção real (Rodada 2)
9. `09-vu-nao-e-usuario-real.png` — taxa de request de 1 VU vs estimativa de usuário real (ver nota acima)

## Próximo passo real (não implementado ainda — precisa de revisão)

Paginação de verdade em `GET /api/workspaces/[id]/projects/[slug]/issues`
(`limit`/`cursor` opcionais, mantendo o comportamento atual quando
nenhum parâmetro é passado, pra não quebrar o `useIssues()` do app real
sem also mexer no client). Essa é a mudança que ataca a causa raiz — as
duas anteriores (pool, horizontal) só compram tempo. Não implementada
autonomamente porque é mudança em lógica de produto real (contrato da
API), fora do escopo de "ajustar um parâmetro de infra" — fica pra
revisão manual.

## Rodada 3 — implementando as camadas propostas (worktree `perf/scale-1m-users`)

Revisão manual feita, camadas implementadas uma a uma neste worktree,
observabilidade fora do escopo por instrução explícita. Setup igual às
rodadas anteriores (`node .next/standalone/server.js`, rampa 10→200 VUs em
`k6/stress-issues.js`), rodando na porta **3001** (não 3000) pra não
colidir com o `pnpm dev` do checkout principal — exigiu sobrescrever
`BETTER_AUTH_URL=http://localhost:3001` só no processo do servidor de
teste (better-auth valida `Origin` contra isso, ver Achado 3 da Rodada 2),
sem tocar no `.env` versionado. O seed de 15k issues tinha sido perdido
(banco zerado desde a Rodada 2 — mesmo Postgres compartilhado entre
worktrees), refeito do zero com `pnpm seed:load-test`.

### Nota operacional — dois bugs achados só ao tentar rodar de verdade

Nenhum dos dois é da lógica de paginação em si, mas os dois bloqueavam a
verificação e precisaram de correção antes de qualquer número:

1. `next build` falhava (`Export IssuesFilters doesn't exist in target
   module`) — `filters.tsx` estava comentado inteiro nesse worktree como
   contorno pra dois componentes (`issue-filter.tsx`,
   `issues-analytics-panel.tsx`) que só existem *untracked* no checkout
   principal `nexo` (nunca commitados em nenhum branch — confirmado via
   `git log --all`). Corrigido copiando os dois arquivos do checkout
   principal (dependências deles já existiam todas neste worktree) e
   restaurando `filters.tsx` pro estado funcional. `typescript.
   ignoreBuildErrors: true` no `next.config.ts` mascara erro de *tipo*,
   não esse erro de resolução de módulo do Turbopack — o build quebrava
   de verdade.
2. `k6/stress-issues.js` referenciava `LIMIT` em `issuesFlow()` sem a
   `const LIMIT = __ENV.LIMIT ?? '1000'` no topo do arquivo — ficou de
   fora quando a mudança foi aplicada. Rodar assim gerou um
   `ReferenceError` por iteração, em loop apertado, por 2m30s inteiros:
   ~1,1GB de log e um `k6/results/*.json` de 2,8GB antes de eu notar e
   descartar os dois. Corrigido adicionando a constante que faltava.

### Experimento 6 — Camada 1: paginação cursor-based em `/issues`

Mudança: `GET /api/workspaces/[id]/projects/[slug]/issues` aceita
`cursor`/`limit` opcionais (`ListIssuesQuerySchema`, `limit` máx. 1000),
com paginação por cursor sobre `Issue.number` (`take + 1` pra saber se
tem próxima página). Sem parâmetro nenhum, mantém o comportamento antigo
byte a byte (mesmo array completo). `useIssues()` virou
`useInfiniteQuery` que busca todas as páginas automaticamente e achata
pro mesmo formato de array — zero mudança no `issue-list-view.tsx`.

**Verificação de contrato (`curl`, projeto `CORE`, 15.000 issues):**

| Chamada | Status | Tamanho do corpo | Itens |
|---|---|---|---|
| `?limit=1000` | 200 | **600.409 bytes** (~586 KB) | 1000, `nextCursor: 1000` |
| sem parâmetros (legado) | 200 | **9.007.438 bytes** (~8,59 MB) | 15000 |
| `?limit=1000&cursor=1000` | 200 | 586 KB | itens 1001-2000, `nextCursor: 2000` |
| `?limit=1000&cursor=14000` | 200 | — | itens 14001-15000, `nextCursor: null` |
| `?limit=5000` (acima do máx.) | **422** | — | rejeitado pelo schema, como esperado |

Confirma as duas pontas: o payload por página cai **~15×** (586 KB vs
8,59 MB), e o caminho sem parâmetros continua devolvendo exatamente o
mesmo payload de sempre — retrocompatibilidade real, não só na leitura
do código.

**Rampa k6 (10→200 VUs), mesmo binário, mesma porta, direto uma atrás da
outra:**

| | `LIMIT=` (legado, sem paginação) | `LIMIT=1000` (paginado) |
|---|---|---|
| Abortou (`http_req_failed < 0.5`)? | **Sim**, aos 2m24s | Não — rampa completa (2m39s) |
| Taxa de falha | 51,62% | **2,13%** |
| Requests processados | 895 | **3.378** (3,8×) |
| `http_req_duration` avg / p95 | 13,46s / 30s | **4,54s / 8,44s** |
| Primeira falha | timeout aos ~182 VUs | — (falhas não são timeout, ver abaixo) |
| Tipo de falha | 100% timeout de 30s | 21× `401`, 51× `500` |

O baseline sem paginação reproduziu o colapso da Rodada 1/Experimento 1
quase igual (mesma assinatura: só timeout de 30s, começa a falhar perto
de ~180 VUs). Com paginação, a rampa inteira roda sem cruzar o threshold
de abort — é a primeira vez, numa instância única local, que isso
acontece.

As 72 falhas residuais (2,13%) não são timeout — são erro explícito:
- **21× `401`**: mesma causa já documentada no "Achado secundário" da
  Rodada 1 (contenção do argon2 sob concorrência derruba login com
  `Invalid password` pra uma fração pequena de tentativas — reapareceu
  nos logs do servidor de teste, WARN do better-auth). Sem cookie válido,
  a VU bate em `/issues` sem sessão → `401`.
- **51× `500`**: concentrados entre 14:20:58 e 14:21:48, exatamente a
  janela de maior concorrência da rampa (100→200 VUs sustentados). Não
  investigado a fundo (sem observabilidade, por instrução), mas o
  suspeito mais direto é `DB_POOL_MAX=5` (o valor padrão, não
  sobrescrito neste teste) — o gargalo que a paginação resolve é
  CPU/serialização, não conexão de banco; com o payload pequeno agora, a
  única coisa que resta pra estourar sob pico de concorrência é o pool.
  Fica registrado como pista pro Experimento 9 (PgBouncer), não como bug
  da paginação.

Resultado bruto: `k6/results/stress-issues-rodada3-baseline-20260823-1416.json`,
`k6/results/stress-issues-rodada3-paginado-20260823-1419.json`.

### Conclusão do Experimento 6

Paginação cursor-based ataca a causa raiz como esperado: payload por
request cai de ordem de MB pra ordem de centenas de KB, e isso sozinho —
sem tocar em infra, sem escalar instância, sem cache — já tira o
endpoint do regime de colapso que nenhuma rodada anterior (pool maior,
4 instâncias) conseguiu evitar sozinha. O resíduo de falha que sobrou
(2,13%) não é do mesmo tipo do problema original (não é mais
CPU/serialização travando o event loop) — é autenticação sob concorrência
(já conhecido) e, provavelmente, pool de conexão pequeno demais pro nível
de paralelismo que a paginação agora permite sustentar. Ambos são
candidatos naturais pras próximas camadas (cache Redis reduz ainda mais a
carga repetida; PgBouncer/pool maior ataca o resíduo de `500`).

### Experimento 7 — Camada 2: cache Redis versionado da lista paginada

Mudança: `src/cache/issue-list.cache.ts` (novo). Cada página paginada é
cacheada sob `issues:list:page:{projectId}:{version}:{cursor}:{limit}`,
TTL 30s (mesmo precedente de `StatusCache`). `IssueService.list()` só
consulta/grava o cache no caminho paginado — a lista legada sem parâmetro
nunca é cacheada. `create`/`update`/`delete` chamam
`IssueListCache.invalidate(projectId)`, que só faz `INCR` na chave de
versão — sem `SCAN`/`DEL`. A leitura captura a versão uma vez só e
repassa pro `set()`, fechando uma race condition achada na revisão de
código desta camada (thread completo em mensagens anteriores desta
sessão): sem isso, um `write` concorrente no meio de um `read` podia
gravar dado desatualizado sob a versão nova.

**Verificação manual (1 sessão, antes de qualquer rampa):**

| Chamada | Tempo | Redis |
|---|---|---|
| 1ª (miss) | 131ms | grava `issues:list:page:{id}:0:0:1000`, TTL 30s |
| 2ª (hit) | **25ms** (~5×) | — |
| `PATCH` numa issue | — | `INCR issues:list:v:{id}` → `0` → `1` |
| 3ª chamada, pós-`PATCH` | 66ms (miss de novo) | chave `v=0` continua no Redis, **órfã** — nada mais a lê; chave nova `v=1` aparece |

Confirma o mecanismo do design: invalidação não apaga nada, só torna o
endereço antigo inalcançável, e o TTL recolhe sozinho.

### Achado — a rampa padrão do k6 não serve mais pra medir esta camada

Rodei a mesma rampa 10→200 VUs do Experimento 6 com `LIMIT=1000` (cache
já quente pro código, frio pro dado). **Abortou em 8s, com só 3 VUs
ativas**, 55,93% de falha — mas isso não é o mesmo tipo de colapso de
sempre:

- `http_req_duration`: avg **19,55ms**, p95 35,25ms — nada de lento
- 100% das falhas são **`429`** (330 de 590 requests), zero timeout,
  zero `500`

Causa: `apiLimiter` é 100 requests/60s **por usuário** (`src/lib/rate-
limit.ts`). Cada VU do k6 autentica uma vez e reusa a mesma sessão pro
resto da vida (ver nota no topo deste arquivo — VU roda em loop sem
`sleep()`). Antes da paginação+cache, cada request levava ~4,5s, então
mesmo em loop apertado uma VU nunca chegava perto de 100 req/60s. Agora
uma resposta de cache leva ~20ms — uma única VU sozinha consegue disparar
esse orçamento inteiro em ~2 segundos. Não é regressão da Camada 1/2: é o
rate limiter (desenhado pra ritmo humano) fazendo o trabalho dele assim
que o endpoint ficou rápido o suficiente pra "sem `sleep()`" deixar de
ser uma particularidade inofensiva do k6 e virar o próprio gargalo. A
rampa padrão de VU único por sessão não consegue mais medir taxa de cache
sustentada sem primeiro esbarrar nisso — fica como nota pra quem for
mexer no script (precisa de várias sessões por VU, ou de `sleep()`
proporcional ao ganho de latência).

**Medição alternativa, sem esbarrar no rate limit:** autenticado 10
usuários distintos (IP fake por login, mesmo truque de `uniqueIp()` do
próprio script) e disparei 800 requests pra `?limit=1000` (80 por
usuário — dentro do orçamento de 100/60s de cada um), concorrência 40,
com `docker stats nexo-db` amostrado a cada ~1s durante a rajada:

- **800/800 respostas 200** — zero falha
- CPU do `nexo-db`: primeiras ~4 amostras (janela de miss/aquecimento)
  em **21,7% / 14,3% / 10,2% / 12,4%**, depois cai pra **0,00–3,31%** nas
  ~17 amostras restantes até o fim da rajada

Com a lista paginada sozinha (Experimento 6), cada request de `/issues`
batia no Postgres. Com o cache quente, centenas de leituras concorrentes
da mesma primeira página não tocam o banco depois do primeiro miss — o
`nexo-db` fica essencialmente ocioso servindo a mesma carga.

Resultado bruto: `k6/results/stress-issues-rodada3-cache-20260823-1510.json`
(rampa abortada, 429). A rajada de 800 requests foi um comando `curl`/
`xargs` ad-hoc, não um script novo — não versionado.

### Conclusão do Experimento 7

O cache versionado funciona exatamente como desenhado: `INCR` como
invalidação O(1), TTL como rede de segurança, e leitura repetida da
mesma página deixa de tocar o Postgres. O efeito colateral mais
interessante não é sobre a Camada 2 em si — é que ela deixou o endpoint
rápido o bastante pra expor uma dimensão nova do "VU não é usuário real"
já anotado na Rodada 1: um rate limiter pensado pra tráfego humano vira o
teto quando o servidor responde em milissegundos e o cliente de teste
nunca pausa entre requests. Isso não é um problema da Camada 2 — é um
lembrete de que, daqui pra frente, comparações de rampa entre camadas
precisam de mais sessões distintas por VU ou de `sleep()` proporcional
no script, ou os números vão parar de refletir o servidor e passar a
refletir o `apiLimiter`.

### Experimento 8 — Camada 3: nginx como LB real + 4 instâncias, health check

Mudança: `app/api/health/route.ts` (novo, `SELECT 1`, sem auth), `nginx/
nginx.conf` (upstream `least_conn`, `max_fails=3 fail_timeout=10s`),
`docker-compose.loadtest.yml` (novo, builda a imagem local via `buildx`,
4 serviços `nexo-app-1..4` por YAML anchor + `nexo-lb` na porta 8080).

### Nota operacional — cinco bugs achados só ao tentar subir de verdade

Nenhum é da lógica de paginação/cache das camadas anteriores; todos
bloqueavam a verificação e precisaram de correção antes de qualquer
número:

1. **Sem `buildx`/BuildKit no Docker do host** — o `Dockerfile` usa
   `RUN --mount=type=secret` e `--mount=type=cache`, sintaxe exclusiva
   do BuildKit; o builder clássico não builda esse Dockerfile de jeito
   nenhum, com ou sem secret. Resolvido instalando `docker-buildx`
   (pacman, Arch — não é `apt`).
2. **`app/api/health/route.ts` devolvia `200` no `catch`** — bug de
   transcrição (thread anterior desta sessão), corrigido pra `503`.
   Sem isso, o healthcheck nunca detectaria uma instância quebrada.
3. **`docker-compose.loadtest.yml` sem `env_file: .env`** — só o
   `environment:` explícito não é suficiente; a validação Zod de
   `lib/env/server.ts` exige o `.env` inteiro (`HUGEICONS_TOKEN`,
   `ABACATE_PAY`, etc.), e sem isso as 4 instâncias quebravam no boot.
4. **`NEXT_PUBLIC_AXIOM_TOKEN`/`NEXT_PUBLIC_AXIOM_DATASET` faltando
   como build arg** — são `NEXT_PUBLIC_*`, embutidos em build time, não
   em runtime; passar só `env_file` não adianta. Sem os build args
   corretos (o Dockerfile já declara os `ARG`, só não recebiam valor),
   o schema de env público falhava no boot com os mesmos vindos vazios.
5. **O maior: certificado TLS do `nexo-redis` não cobre o hostname
   `nexo-redis`** — o cert (gerado por `redis-tls/generate.sh` no
   checkout principal, usado por `docker-compose.infra.yml`) só tem
   SANs `redis`, `localhost`, `127.0.0.1`, `::1`. Como essas 4
   instâncias falam com o Redis pelo nome real do container
   (`nexo-redis`), toda verificação de hostname TLS falhava
   (`ERR_TLS_CERT_ALTNAME_INVALID`), e o `reconnectStrategy` do
   cliente Redis (`src/lib/redis.ts`) mascarava isso como um travamento
   longo (retry com backoff até 3s, até 10 tentativas) em vez de um
   erro rápido — qualquer rota que toque Redis (`/issues`, `/api/
   status`) parecia travada pra sempre. Diagnosticado testando `tls.
   connect()` puro (sem o client Redis) direto num container — erro em
   18ms, claro na mensagem. Corrigido com `NODE_TLS_REJECT_UNAUTHORIZED:
   "0"` só nesses 4 serviços (ainda é TLS, só sem checar CN/SAN) — não
   mexe no `docker-compose.infra.yml` compartilhado nem no código do
   app; aceitável pra infra local efêmera, mesmo espírito do desvio já
   assumido pra Camada 5.

Achado à parte, sem correção: `proxy_connect_timeout` não estava
setado em `nginx.conf` (ficava no default de 60s do nginx). Descoberto
no meio do teste de failover, quando `docker stop nexo-app-2` deixou
alguns requests pendurados esperando conectar num backend morto em vez
de falhar rápido e tentar o próximo. Adicionado `proxy_connect_timeout
3s;`.

### Verificação — rajada sustentada com `docker stop` no meio

Mesma lição do Experimento 7 (o rate limiter de 100 req/60s por usuário,
compartilhado via Redis entre as 4 instâncias, satura antes de qualquer
rampa k6 de VU único conseguir subir): repeti a metodologia de vários
usuários distintos, dessa vez apontando pro nginx (`localhost:8080`) em
vez de uma instância só. 19 usuários autenticados, 9 ondas de 19 requests
cada pra `?limit=1000`, `max-time 8s` por request:

| Onda | Estado | Resultado |
|---|---|---|
| 1-3 | 4 instâncias no ar | 19/19 `200` cada |
| 4-7 | `nexo-app-2` parada (`docker stop`) | 19/19 `200` cada |
| 8-9 | `nexo-app-2` religada (`docker start`) | 19/19 `200` cada |

**171/171 requests com sucesso**, incluindo as 4 ondas inteiras rodadas
com uma das 4 instâncias fisicamente parada — zero erro visível pro
cliente durante a queda. Confirma o mecanismo: `max_fails=3
fail_timeout=10s` (passivo, o único que o nginx open-source tem) +
`proxy_next_upstream` reencaminham a request pra outro backend na hora,
sem o cliente perceber.

**Gap admitido, não uma mentira por omissão**: tentei medir CPU por
instância via `docker stats --no-stream` amostrado a cada 1s durante a
rajada, pra confirmar visualmente a distribuição via `least_conn` entre
as 3 instâncias restantes durante a queda. O `timeout 1` que usei pra
não travar o loop matou o próprio `docker stats` antes dele conseguir
amostrar (`--no-stream` precisa de mais de 1s pra calcular %CPU),
resultando em amostras majoritariamente "down"/vazias — dado não
confiável, descartado. A distribuição de carga entre as 3 instâncias
sobreviventes durante a queda fica como esperada por design
(`least_conn` é comportamento nginx bem estabelecido) mas **não
medida** numericamente nesta rodada.

Não repeti a comparação numérica direta com o Experimento 4
("1245-1303 requests sem abortar") — não é mais o mesmo teste: o
Experimento 4 media 4 instâncias servindo a lista *sem paginação* (o
gargalo era CPU/JSON); essas 4 instâncias já têm Camada 1+2, então o
teto agora é o rate limiter, não a capacidade de servir `/issues`, como
o Experimento 7 já tinha demonstrado. Comparar os dois números mediria
coisas diferentes.

### Conclusão do Experimento 8

O LB e o health check funcionam exatamente como desenhado — a única
coisa que falhou de verdade foi ambiente (buildx faltando, TLS do Redis
não cobrindo o hostname certo), não a lógica de roteamento/failover em
si. Todos os 5 bugs achados nesta seção são de infraestrutura de teste
local, não de código de produto: nenhum afeta `docker-compose.yml` (a
imagem publicada de produção) nem o `docker-compose.infra.yml`
compartilhado.

### Experimento 9 — Camada 4: PgBouncer (pooling de transação)

Mudança: `docker-compose.infra.yml` ganha o serviço `nexo-pgbouncer`
(porta 6432→5432, `POOL_MODE: transaction`), aditivo — não mexe no
`nexo-db` existente. `lib/env/_server.ts` ganha `DATABASE_URL_POOLED`
opcional; `src/lib/prisma.ts` usa
`DATABASE_URL_RUNTIME = DATABASE_URL_POOLED ?? DATABASE_URL` — sem essa
env, comportamento idêntico ao de hoje. Migrations continuam direto em
`DATABASE_URL` (porta 5432), `prisma.config.ts` não muda.

**Desvio da imagem planejada**: `bitnami/pgbouncer` não tem mais
nenhuma tag puxável no Docker Hub — a mesma migração pra "Bitnami Secure
Images" já documentada no comentário do `nexo-redis`, só que sem digest
fixo de fallback pra esse aqui (`curl` na API do Docker Hub confirmou
zero tags publicadas). Troquei por `edoburu/pgbouncer:v1.25.2-p0`
(imagem ativa, tags reais), variáveis de ambiente equivalentes
(`DB_HOST`/`DB_USER`/... em vez de `POSTGRESQL_*`).

**Armadilha operacional**: rodar `docker compose -f
docker-compose.infra.yml up -d nexo-pgbouncer` de dentro do worktree
`nexo-scale-1m` faz o Compose tratar isso como um projeto *diferente*
do que subiu o `nexo-db`/`nexo-redis` originais (nome do projeto =
nome do diretório) — na primeira tentativa, o Compose quase recriou o
`nexo-db` do zero (barrado só por conflito de `container_name`, mas não
antes de criar um volume `nexo-scale-1m_pgdata` vazio e desconectado).
Resolvido com `--no-deps` (só sobe o serviço pedido, não tenta
reconciliar as dependências) — o volume fantasma foi removido depois.
Isso é fricção de rodar `docker-compose.infra.yml` a partir de um
worktree com nome de diretório diferente, não um bug da Camada 4.

**Teste de fumaça (risco verificado — prepared statements nomeados)**:
confirmado antes de qualquer número, como o plano pedia. 10 requests
sequenciais + 60 concorrentes (`xargs -P 30`, cursors variados) direto
num servidor apontando `DATABASE_URL_POOLED` pra porta 6432 — 70/70
`200`, zero menção a "prepared statement" nos logs da app nem do
PgBouncer. Confirma a leitura de `@prisma/adapter-pg`: sem
`statementNameGenerator` configurado (não está), os prepared statements
são anônimos — compatíveis com pooling de transação.

**Comparação de conexões reais no Postgres** (setup do Experimento 8,
`DATABASE_URL_POOLED` setado nas 4 instâncias): 5 ondas de 19 requests
concorrentes (95 requests) contra as 4 instâncias atrás do nginx — cada
uma com `DB_POOL_MAX: 15`, até 60 conexões diretas possíveis se
estivessem batendo direto no Postgres (setup do Experimento 8).

- `pg_stat_activity` durante a rajada: **só 11 conexões reais** no
  `nexo-db`, e **todas** vindo do IP do `nexo-pgbouncer`
  (`172.19.0.5`) — três `active`, oito `idle`. Nenhuma conexão com
  `client_addr` de qualquer uma das 4 instâncias (`172.19.0.6-9`).
- Depois da rajada: 14 conexões idle, mesmo padrão — só PgBouncer fala
  com o Postgres, nunca a aplicação direto.

### Conclusão do Experimento 9

PgBouncer funciona como desenhado: 4 instâncias que poderiam abrir até
60 conexões diretas ficam reduzidas a uma dúzia de conexões reais no
Postgres, todas de uma única origem (o pooler). Teste de fumaça limpo
— sem indício de bug de prepared statement nomeado sob concorrência,
como o risco levantado antes de implementar já esperava (adapter sem
`statementNameGenerator` = statements anônimos = seguro em modo
transação). Único ponto de atenção fica registrado: o benefício real de
PgBouncer (menos conexões no Postgres) só aparece quando há motivo pra
ter muitas conexões concorrentes em primeiro lugar — com Camada 1+2 já
no ar, o volume de conexões que a Camada 1 original tentava evitar já
não existe mais na mesma escala; o ganho aqui é mais sobre teto de
conexões em pico de concorrência do que sobre throughput do dia a dia.

### Camada 6 — RAM por nó + CDN (documentação, sem código)

Nenhuma das duas é implementável dentro do worktree — não são mudança
de código, são decisão de infra/deploy.

**RAM por nó**: o achado real é o da Rodada 2 (produção real, 8 cores/
3,7GB RAM) — pico de **2,6GB de 3,7GB (~70%)** durante a rampa de 200
VUs, quando `/issues` ainda devolvia 8,6MB por request sem paginação.
Esse número é de *antes* da Camada 1 — o próximo passo real aqui não é
"aumentar RAM", é **remedir esse mesmo cenário em produção com Camada
1+2 já no ar** e confirmar que o payload menor (~586KB/página, ~15×
menor) baixa esse pico proporcionalmente antes de decidir se vale a
pena dimensionar mais RAM por instância. Sem essa remedição, qualquer
número de RAM recomendado aqui seria chute.

**CDN de assets estáticos**: já não é um gap — `next.config.ts` já
define `staticAssetHeaders` com `Cache-Control` de longa duração,
aplicado a `_next/static`, fontes e outros assets (confirmado no
arquivo, linhas 19 e 66-74). Colocar um CDN de verdade na frente
(Cloudflare, CloudFront, etc.) é decisão de onde/como fazer deploy —
ortogonal ao código da aplicação, que já está pronto pro CDN respeitar
esses headers assim que existir um.

### Experimento 10 — Camada 5: réplica de leitura do Postgres

Mudança: streaming replication de verdade, não "só adiciona uma
réplica". `docker-compose.infra.yml` ganha `nexo-db-replica`
(`postgres:17-alpine`, entrypoint dedicado em
`docker/postgres-replica/entrypoint-replica.sh`, roda `pg_basebackup -R`
no primeiro start). `src/lib/prisma-replica.ts` (singleton preguiçoso,
mesmo estilo de `getQueueConnection()`) cai pro client primário sem
`DATABASE_URL_REPLICA`. `IssueRepository.listByProject`,
`listByProjectPage` e `countByProject` passam a usar
`getPrismaReplica()` — só os 3 métodos de leitura usados por `/issues`;
escrita continua toda no primário.

**Achado — `wal_level`/`max_wal_senders` já eram suficientes**: o plano
original previa configurar `wal_level=replica, max_wal_senders=3`
explicitamente no `nexo-db`. Conferido com `SHOW wal_level` no
container já rodando: **já é `replica`** (default do Postgres desde a
9.6), `max_wal_senders`/`max_replication_slots` já em 10. Isso
significou não precisar reiniciar o `nexo-db` compartilhado (usado
também pelo checkout `nexo` principal) — só precisei de duas mudanças
que aplicam via reload, sem restart: `CREATE ROLE replicator WITH
REPLICATION LOGIN PASSWORD '...'` e uma linha nova em `pg_hba.conf`
(`host replication replicator 172.19.0.0/16 scram-sha-256`), seguido de
`SELECT pg_reload_conf()`. `docker/postgres-init/01-*.sh` e `02-*.sh`
escrevem o equivalente pra quando o volume for inicializado do zero,
mas não retroagem num volume que já tem dado — documentado
explicitamente nos dois arquivos.

**Dois bugs reais no entrypoint da réplica, achados só ao rodar**:

1. `su-exec` não existe nessa imagem — é `gosu` (a alpine oficial do
   Postgres inclui `gosu`, não `su-exec`; confundi com a convenção de
   outras imagens alpine). Sem isso, o container ficava em loop de
   restart, o `pg_basebackup` nunca completava porque `PGPASSWORD`
   dentro de `su-exec ... env ...` nem chegava a resolver o binário.
2. Meu entrypoint customizado bypassa o `docker-entrypoint.sh` da
   imagem oficial (que faria `initdb`, errado pra uma réplica) — mas
   isso também bypassa o drop de privilégio automático dele. `exec
   postgres` direto falha ("root execution... not permitted").
   Corrigido explicitando `exec gosu postgres postgres` +
   `chown -R postgres:postgres "$PGDATA"` depois do `pg_basebackup`
   (que também precisou rodar como `gosu postgres`, não como root, pra
   os arquivos já nascerem com o dono certo).

**Também achado, sem ser bug**: porta `5433` (planejada pro
`nexo-db-replica`) já está em uso por um container `steel-db` de outro
projeto rodando na mesma máquina — trocado pra `5434`.

**Verificação de replicação**:

- `pg_stat_replication` no primário: `state=streaming`,
  `sync_state=async`, LSN idêntico dos dois lados
  (`wait-for-replica-sync.sh` confirmou em <1s).
- `select count(*) from issues` bate exatamente nos dois:
  **19.680** em ambos, logo depois do clone.
- Réplica rejeita escrita: `INSERT ... → ERROR: cannot execute INSERT
  in a read-only transaction` — confirma que é standby de verdade, não
  só uma cópia estática.
- Lag real medido: criei uma issue (`número 15001`) via API (vai pro
  primário) e li de volta via `/issues` (vai pra réplica)
  **imediatamente em seguida** — já apareceu. Confirmado também via
  `psql` direto nos dois lados. Numa rede docker local, o lag é baixo
  o bastante pra não aparecer em teste manual — o trade-off
  "leitura logo após escrita pode ver dado desatardado" continua
  real e aceito (é da natureza de réplica assíncrona), só não
  observável nessa escala/latência de rede.

**Comparação de carga primário vs réplica** (setup do Experimento 9 —
4 instâncias + PgBouncer — com `DATABASE_URL_REPLICA` também setado):
6 ondas de 19 requests concorrentes pra `/issues`, `docker stats`
amostrado a cada ~1-2s durante a rajada:

| Momento | `nexo-db` (primário) | `nexo-db-replica` |
|---|---|---|
| Pico durante a rajada | 7,82% | **34,59%** |
| Resto da amostragem | 0,00–3,39% (residual — WAL sender, não query) | 0,00–3,27% |

O CPU de leitura migrou visivelmente pro `nexo-db-replica` — os picos
mais altos (28-35%) aparecem lá, o primário fica na faixa de ruído de
fundo (menos de 8% mesmo no pico, provavelmente overhead de
replicação, não execução de query — `/issues` não toca mais nele).
Depois da rajada, `pg_wal_lsn_diff` entre `pg_current_wal_lsn()` e
`replay_lsn` = **0 bytes** — réplica não ficou pra trás mesmo sob a
carga.

### Conclusão do Experimento 10

Réplica de leitura funciona como desenhado, mecanismo real (streaming
replication via `pg_basebackup -R`, não simulado): dado idêntico,
lag desprezível em rede local, réplica genuinamente rejeita escrita, e
o CPU de leitura migra pra ela sob carga — confirmado com números, não
só lido no código. Os dois bugs do entrypoint (`gosu` errado, drop de
privilégio faltando) são 100% infra de teste local, não afetam
`docker-compose.yml` de produção nem o código da aplicação. O achado
mais importante pro resto do plano: **não precisei reiniciar o
`nexo-db` compartilhado** — os defaults do Postgres já bastavam, e as
duas mudanças que precisei (role + `pg_hba.conf`) aplicam via reload
sem downtime, o que reduz bastante o risco de mexer numa camada dessas
num Postgres que outro checkout ainda depende.

## Verificação final — pilha completa (nginx + 4 instâncias + PgBouncer + réplica)

`k6/flows.js` (login → home → issues → onboarding) contra a stack
inteira das camadas 1-5 juntas, pra confirmar que nada quebrou nos
outros fluxos além de `/issues`.

### Achado — rate limiter embutido do Better Auth atrás do nginx

Primeira tentativa: **99,76% de falha em login**, `issues` também
falhando (99,05%, mesma causa do rate limiter de API já documentada no
Experimento 7). Log da app: `[Better Auth]: Rate limiting could not
determine a client IP and is falling back to a single shared per-path
bucket`. Essas 4 imagens rodam com `NODE_ENV=production` (via
`Dockerfile`), e o limiter embutido do Better Auth só fica desativado
com `DISABLE_AUTH_RATE_LIMIT=true` — que eu não tinha setado no
`docker-compose.loadtest.yml`. Sem um `trustedProxies` configurado, o
Better Auth não confia no `X-Forwarded-For` que o nginx repassa, então
todo login de qualquer IP cai no mesmo bucket compartilhado e derruba
sob concorrência. Não é bug de nenhuma camada — é o mesmo motivo pelo
qual o e2e do próprio projeto já roda com essa env setada (documentado
no `CLAUDE.md`). Corrigido adicionando `DISABLE_AUTH_RATE_LIMIT: "true"`
no `docker-compose.loadtest.yml`, recriando só as 4 instâncias (env-only,
sem rebuild).

### Resultado depois da correção

**2.248/2.248 checks, 100% sucesso, zero falha** em `login`, `home`,
`issues` e `onboarding` juntos, rodando contra a pilha completa. Todos
os 4 thresholds (`rate<0.01` por fluxo) passaram.

## Fechamento da Rodada 3 — antes vs depois das 5 camadas

| | Rodada 1/2 (antes) | Rodada 3 (Camadas 1-5) |
|---|---|---|
| Payload de `/issues` | 8,6MB, sempre | **586KB/página** (~15× menor), legado intacto sem parâmetro |
| Rampa 10→200 VUs, instância única | Colapsa ~100-180 VUs, 51-52% falha | **Completa sem abortar**, 2,13% falha residual |
| Throughput vs baseline | 785-934 req (single) → 1245-1303 req (4 instâncias, Exp. 4) | 3.378 req (paginado, single) — 3,8× o baseline single-instance |
| CPU sob carga | Node satura 1 core inteiro (88-109%) | CPU deixa de ser o teto — vira o rate limiter (achado novo) |
| Postgres sob 4 instâncias | 30-194% CPU, sem paginação (Exp. 5) | Conexões reais caem pra dúzia via PgBouncer; leitura migra pra réplica |
| RAM em produção real (Rodada 2) | Pico 70% de 3,7GB, sem paginação | Não remedido ainda — Camada 6, próximo passo real |
| Failover de instância | Não testado | 171/171 sucesso com instância parada (Exp. 8) |
| Auth sob concorrência atrás de LB | Não testado | Achado + corrigido (`DISABLE_AUTH_RATE_LIMIT`) |

A causa raiz identificada na Rodada 1 (`IssueRepository.listByProject`
sem paginação) foi a única mudança que precisou de decisão de produto
real — todo o resto (cache, LB, pool, réplica) foi infraestrutura em
cima dela. O padrão que se repetiu em **todas as 5 camadas**: a
implementação em si raramente foi o problema — 15 bugs reais no total
(Camada 1: 1 typo; Camada 2: 1 race condition; Camada 3: 5 bugs de
ambiente; Camada 4: 1 imagem inexistente + 1 armadilha de projeto
Compose; Camada 5: 2 bugs de entrypoint + 1 porta ocupada; verificação
final: 1 rate limiter atrás de proxy) só apareceram ao efetivamente
rodar cada camada, não ao ler o código. Nenhum desses bugs sobreviveu
sem ser corrigido antes do número final ser aceito no log.

## Rodada 4 — argon2 sob concorrência (worktree `perf/argon2-tuning`)

Com a Rodada 3 fechada, o teste composto (`flows.js`, login+home+issues+
onboarding) contra a pilha completa parou de escalar limpo por volta de
2000 VUs — timeouts de 60s aparecendo, mas só quando login e `/issues`
competem pelo mesmo CPU ao mesmo tempo. `k6/stress-auth-only.js` (login
isolado, sem `/issues` junto) isolou a causa: verificação de senha via
argon2 rodando com os defaults da lib (`memoryCost: 65536` = 64MB,
`parallelism: 4` — cada verificação já tenta usar 4 threads sozinha).

No servidor de produção real (8 cores — mesma máquina da Rodada 2):
pico de 571% CPU (de 800% disponíveis) com "só" 400 VUs de login
concorrente sustentado a 440-570%, Postgres irrelevante (0-5,6% o tempo
todo). Login nunca deu erro nesse teste — só degradou (p50 2,82s, p95
13,1s): é o CPU do processo Node sendo saturado pela verificação
argon2, não um limite de conexão ou de banco.

### Correção — preset OWASP em vez dos defaults da lib

Defaults do `argon2` (`memoryCost: 65536`, `parallelism: 4`) foram
desenhados pra um hash isolado rodando rápido numa máquina dedicada,
não pra um SaaS multiusuário verificando dezenas de logins em paralelo.
Trocado pelo preset argon2id recomendado no topo do OWASP Password
Storage Cheat Sheet: `memoryCost: 19456` (~19MB), `timeCost: 2`,
`parallelism: 1`. Extraído pra `src/lib/argon2-config.ts` (única fonte
da verdade, importado por `src/lib/auth.ts` e por
`scripts/seed-load-test.ts` — antes o seed chamava `hash()` sem opções,
gerando hashes com os defaults da lib mesmo depois da mudança em
`auth.ts`, o que teria mascarado qualquer teste feito contra os
usuários seedados).

Importante: `verify()` do pacote `argon2` lê os parâmetros do próprio
hash armazenado (formato PHC, `$argon2id$v=19$m=...,t=...,p=...$...`),
não da config atual do código — só afeta hash geração de hashes novos.
Isso também abriu um atalho pro teste: pra comparar antes/depois basta
re-hashear a senha dos usuários de teste com cada preset via SQL
direto, sem rebuildar a imagem entre uma rodada e outra.

### Verificação — A/B controlado, mesma máquina, mesma instância

Sem acesso a uma segunda máquina de 8 cores pra reproduzir os números
de produção 1:1, a comparação foi feita local (worktree, 4 núcleos),
isolando 1 das 4 instâncias do nginx (batendo direto no IP do
container, sem passar pelo LB) pra eliminar a variável de
horizontal-scaling da equação — só o parâmetro do argon2 muda entre as
duas rodadas, mesmo hardware, mesmo `stress-auth-only.js` (rampa até
400 VUs).

| Métrica | Antes (defaults: m=64MB,t=3,p=4) | Depois (OWASP: m=19MB,t=2,p=1) |
|---|---|---|
| Iterações completas (~3m20s) | 2.672 | 7.151 (2,7×) |
| Erros | 0,33% (9/2.672 — timeout de 30s) | **0%** |
| p50 | 6,51s | 1,53s (4,25× mais rápido) |
| p95 | 25,06s | 7,96s (3,15× mais rápido) |
| max | 30s (bateu no timeout) | 8,4s |
| CPU pico (1 instância, 4 núcleos = 400%) | 371,7% (93%) | 317,1% (79%) |
| CPU sustentado (último quarto do teste) | 337,2% | 230,1% (-32%) |

Confirma a hipótese: no hardware mais fraco daqui (4 núcleos, sem
horizontal scaling), os defaults chegam a gerar erro real (timeout),
coisa que a Rodada 2 não viu nem a 8 núcleos — mostra que o problema
escala pior que linear com menos CPU disponível. Preset novo elimina o
erro, corta a latência em ~4× no p50 e ~3× no p95, e ainda sobra CPU
(79% vs 93% no pico).

p95 de 7,96s a 400 VUs sustentados ainda não é bom o suficiente pra
login em produção — é o resultado esperado (parallelism 1 sacrifica
velocidade de hash por menos contenção agregada, a troca é deliberada),
mas não fecha o problema sozinho. Mudança commitada no worktree,
aguardando decisão sobre produção antes do merge (troca de segurança
real: hash mais barato = mais fácil de forçar por brute-force offline
se o banco vazar — aceitável pro threat model atual, mas é decisão de
produto, não só de performance).

## Rodada 5 — validação em produção real (8 núcleos), login não escala como `/issues`

Depois do merge do preset argon2 (`src/lib/argon2-config.ts`) e da
paginação (Camada 1), subiu tudo em produção real. Reseed completo
(`SEED_ONBOARDED_USERS=2500`, 15k issues) e `k6/stress-auth-only.js`
(login isolado, sem `/issues` junto, rampa até 400 VUs com think-time de
1-2s — cadência de usuário real, não loop apertado) direto no host via
SSH, `localhost:3000`, mesma metodologia da Rodada 2.

### Achado 1 — o preset OWASP ajudou muito menos aqui do que no worktree local

| Config | CPU pico (de 800%, 8 núcleos) | RAM pico | p50 | p95 | Throughput |
|---|---|---|---|---|---|
| Antes de tudo (defaults do argon2) | 571% | ~2,2GB | 2,82s | 13,1s | 23,46/s |
| + preset OWASP (m=19MB,t=2,p=1) | 590% | ~1GB | 3,03s | 14,7s | 21,97/s |

No worktree local (4 núcleos) o mesmo preset cortou p95 em ~3× e
eliminou erro. Em produção (8 núcleos), CPU e latência ficaram
estatisticamente iguais — só RAM caiu de verdade. A explicação: com
mais núcleos disponíveis, o gargalo de CPU do hash nunca foi tão
dominante aqui quanto no worktree de 4 núcleos — outra coisa estava
segurando a fila com peso parecido, escondendo o ganho do preset mais
barato (ver Achado 3 abaixo).

### Achado 2 — `UV_THREADPOOL_SIZE=8` piorou, de forma reproduzível

Hipótese testada: argon2 roda no threadpool do libuv, que por padrão
tem só 4 slots (`UV_THREADPOOL_SIZE` não setado), independente dos 8
núcleos reais do container. Subiu pra 8 esperando mais hashes
concorrentes de verdade.

| Config | CPU pico | p95 | Throughput |
|---|---|---|---|
| + `UV_THREADPOOL_SIZE=8` | 462% | 17,05s | 19,49/s |
| Repetição (controle, sem mudar nada) | — | 17,01s | 19,78/s |

Repetido pra descartar ruído de ambiente — bateu quase igual nas duas
vezes. CPU pico caiu (462% vs 571-590%) mas latência e throughput
pioraram. Explicação mais provável: numa máquina de 8 núcleos, threadpool
em 8 não deixa folga nenhuma pra thread principal do Node e coleta de
lixo rodarem sem brigar por CPU — com 4 slots sobrava exatamente essa
folga. Revertido (`UV_THREADPOOL_SIZE` removido do `.env`).

### Achado 3 — o gargalo real escondido: `DB_POOL_MAX` nunca foi setado em produção

Checado: `DB_POOL_MAX` não existia no `.env` de produção, então caía no
default do código (`5` — o mesmo valor descartado como gargalo lá no
Experimento 1/2, só que naquela época escondido por um gargalo maior,
CPU de serialização de `/issues`). Postgres aguenta até 100 conexões
(`max_connections`), mas a aplicação só conseguia ter 5 queries em voo
ao mesmo tempo — login faz lookup de usuário + verificação + possível
escrita de sessão, todas competindo pelas mesmas 5 vagas. Isso explica
os dois achados acima: baratear o hash não ajuda se o request já estava
preso esperando conexão de banco antes/depois do hash, e mais hashes
terminando ao mesmo tempo (threadpool maior) só aumenta quantos
requests tentam pegar uma das mesmas 5 vagas simultaneamente.

Subido `DB_POOL_MAX=25` (`UV_THREADPOOL_SIZE` já revertido nessa
rodada):

| Config | CPU pico | p95 | Throughput | Falhas |
|---|---|---|---|---|
| + `DB_POOL_MAX=25` | 606% | **12,71s** | **23,58/s** | 0,30% (15 timeouts de 30s) |

Melhor resultado das quatro rodadas — confirma que o pool era parte
real do problema — mas é basicamente **igual ao ponto de partida do
dia**, não uma melhora dramática. CPU continua saturando ~75% do host
inteiro com 400 logins concorrentes.

### Conclusão — login não escala do jeito que `/issues` escalou

`/issues` tinha uma causa raiz única e corrigível (payload sem
paginação) que, uma vez resolvida, liberou o resto da pilha. Login é
estrutural de um jeito diferente: `argon2` é *deliberadamente* caro de
CPU (é a própria definição de segurança de hash de senha), e essa
Rodada 5 mostrou que dá pra tirar fricção adjacente (parâmetro do hash,
pool de conexão) sem eliminar o custo de fundo. Com as três mudanças
juntas (preset OWASP + `DB_POOL_MAX=25`, threadpool no default), o
teto prático de produção pra login concorrente continua próximo de
**~400 tentativas simultâneas antes de degradar pra dezenas de
segundos de espera** — mesma ordem de grandeza de antes de qualquer
ajuste, só que agora sem timeout de erro na maioria dos casos.

Diferente de `/issues`, não escalar login horizontalmente (mais
instâncias) resolve por si só — cada instância paga o mesmo custo de
CPU por hash, então N instâncias dividem N vezes menos tráfego cada,
mas o custo por operação não muda. O que resolveria de verdade —
fila com backpressure explícito no login, ou aceitar rajadas grandes
como cenário degradado por design — é mudança de produto, não só de
infra, e fica registrada como próximo passo real, não implementada
nesta rodada.

## Rodada 6 — backpressure no login: falhar rápido em vez de pendurar

Implementado `src/lib/auth-concurrency-gate.ts`: um gate de concorrência
em memória, por instância, limitando `argon2.verify()` a
`AUTH_VERIFY_CONCURRENCY` chamadas simultâneas (default 4 — perto do
tamanho do threadpool do libuv), com fila limitada
(`AUTH_VERIFY_QUEUE_DEPTH`, default 20) e tempo máximo de espera na fila
(`AUTH_VERIFY_QUEUE_WAIT_MS`, default 4s). Passado isso, rejeita rápido
com `429`/`RATE_LIMITED`/`Retry-After: 3` em vez de deixar o request
pendurado 10-25s. `sign-in-form.tsx` tenta de novo automaticamente até 2
vezes com backoff a partir do `Retry-After`, mostrando "Muitos acessos
agora, tentando de novo..." em vez de travar a UI em silêncio.
`DB_POOL_MAX` também virou default de código (25, não só env var) — e
`process.env.DISABLE_AUTH_RATE_LIMIT` (já usado pra desligar o rate
limiter embutido do better-auth em e2e) passa a desligar esse gate
também, senão o CI (sem think-time, várias suítes de teste criando
sessão em paralelo) estoura o orçamento em segundos e enche a run de
429 — confirmado que quebrou o CI numa tentativa antes desse ajuste.

### Verificação — mesmo `stress-auth-only.js`, agora com retry como o client real

Script ajustado pra replicar a lógica do `sign-in-form.tsx`: até 2
tentativas, backoff pelo `Retry-After` + jitter, checando tanto o
resultado da 1ª tentativa quanto o resultado final (depois do retry) —
sem isso, um 429 intencional (o gate funcionando) apareceria como
"falha" no k6 mesmo quando o usuário real nunca percebe, porque o
browser tenta de novo sozinho.

| Métrica | Antes (Rodada 5, `DB_POOL_MAX=25` sozinho) | Depois (gate + retry) |
|---|---|---|
| p50 | 2,92s | **104ms** |
| p95 | 12,71s | **1,18s** |
| max | ~30s (timeout) | 1,8s |
| Sucesso na 1ª tentativa | ~100% (mas lento) | 61% (3.236/5.297) |
| Sucesso final (com retry) | — | 83% (4.154/4.981) |
| Fluxos completos/s | 23,58/s | **26,63/s** (melhor throughput do dia) |
| CPU pico | 606% | 572% (igual, dentro do ruído — esperado) |

O threshold `http_req_failed` do k6 disparou em 50% e abortou o teste —
mas isso conta **cada request HTTP individual**, incluindo os `429`
intencionais de tentativas que depois tiveram sucesso no retry. A
métrica que importa pro usuário real é "resultado final depois do
retry automático": **83% de sucesso**, com quem teve sucesso esperando
near-instantaneamente (p95 = 1,18s) em vez de até 17s.

### Conclusão da Rodada 6

O gate não aumenta a capacidade real de CPU do servidor (pico continua
~570-600%, igual às rodadas anteriores) — ele muda **o que acontece
quando essa capacidade estoura**. Antes: todo mundo espera numa fila
invisível, sem saber se vai dar certo, por até 25s. Agora: quem cabe no
orçamento é atendido quase instantaneamente, quem não cabe recebe um
"tente de novo" claro em milissegundos e o próprio client já tenta de
novo sozinho.

Ainda assim, **17% dos logins não se recuperam nem depois de 2
tentativas** com 400 VUs simultâneos — esse é o teto real de captação
de novos usuários numa rajada extrema nesse hardware, hoje. Isso não é
mais um bug escondido atrás de uma espera longa — é um número visível,
mensurável, e um limite de capacidade que dá pra decidir
conscientemente se vale a pena atacar (mais tentativas de retry, um
`AUTH_VERIFY_QUEUE_DEPTH` maior, ou aceitar como teto de lançamento) em
vez de descobrir por acidente em produção.

### Decisão — aceitar o teto de 400 logins simultâneos como está

400 tentativas de login *ao mesmo tempo, na mesma instância* é um
cenário de pico extremo — bem mais raro que "1M de usuários" sugere à
primeira vista, já que login é um evento pontual por sessão, não
tráfego contínuo. Decisão consciente de não perseguir esse número mais
(fila maior, mais retries) nesta rodada: o ganho de UX do gate já
resolve o problema real (espera de até 25s sem feedback), e o teto
residual de 17% só aparece num pico que a Nexo, pré-lançamento, ainda
não tem motivo pra esperar tão cedo. Fica registrado como decisão de
produto, revisável se o padrão de tráfego real um dia justificar — não
como limitação técnica não resolvida.
