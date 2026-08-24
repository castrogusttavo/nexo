// Preset OWASP argon2id (Password Storage Cheat Sheet): m=19MiB, t=2, p=1.
// Defaults da lib (64MB, parallelism 4) assumem um hash isolado rodando
// rápido numa máquina dedicada — sob concorrência real isso satura a CPU
// do servidor inteiro (ver k6/EXPERIMENT-LOG.md). Único lugar que define
// esses parâmetros — auth.ts e scripts/seed-load-test.ts importam daqui
// pra nunca gerar hashes com configs diferentes do que a app realmente usa.
export const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const
