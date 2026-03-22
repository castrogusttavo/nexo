# ADR-003: SOPS + age para Gerenciamento de Secrets

**Status:** Aceito
**Data:** 2026-03-15

## Contexto

Secrets de produção estavam em um arquivo `.env` em texto plano no servidor. Problemas:

- Sem controle de versão — sem histórico do que mudou ou quando
- Sem trilha de auditoria — sem como saber quem mudou um secret
- Sem criptografia em repouso — qualquer pessoa com acesso ao servidor vê todos os secrets
- Sem processo de revisão — mudanças bypassam revisão de PR completamente

Opções consideradas:

1. **HashiCorp Vault** — completo, mas requer rodar um servidor + unsealing
2. **AWS Secrets Manager / GCP Secret Manager** — gerenciado, mas adiciona dependência de cloud
3. **SOPS + age** — criptografar no git, decriptar no deploy, sem serviço externo
4. **Sealed Secrets (Kubernetes)** — não aplicável, usamos Docker Compose

## Decisão

**SOPS + age**. Secrets são criptografados com chave pública age e commitados no git como `secrets/production.enc.env`. Decriptados no deploy pela pipeline de CD usando a chave privada age armazenada como secret do GitHub Actions.

### Como funciona

```
Desenvolvedor edita secrets:
  SOPS_AGE_KEY_FILE=~/.age/nexo-secrets.key sops secrets/production.enc.env
  → Abre $EDITOR com conteúdo decriptado
  → Re-criptografa ao salvar
  → git commit + push

Pipeline de CD faz deploy:
  sops --decrypt secrets/production.enc.env > /var/www/nexo/.env
  → Usa SOPS_AGE_KEY do GitHub Secrets
  → .env decriptado usado pelo docker compose
```

### Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `.sops.yaml` | Regras de criação — mapeia padrões de arquivo para chave pública age |
| `secrets/production.enc.env` | Secrets criptografados (commitados no git) |
| `.gitignore` | Permite `*.enc.env`, ignora `*.env` em secrets/ |
| `.dockerignore` | Exclui `secrets/` do contexto de build do Docker |

## Consequências

### Positivas

- Secrets têm controle de versão — histórico completo de mudanças no git
- Criptografados em repouso — mesmo se o repo vazar, secrets estão seguros
- Sem serviço externo para rodar ou manter
- Processo padrão de revisão de PR para mudanças em secrets
- age é mais simples que GPG — arquivo de chave único, sem gerenciamento de keyring

### Negativas

- Rotação de chave requer re-criptografar todos os secrets com a nova chave
- Chave age única = ponto único de comprometimento (mitigado por armazenar a chave privada apenas no GitHub Secrets e máquinas de desenvolvedores)
- Desenvolvedores precisam de `sops` + `age` instalados localmente para editar secrets

### Setup inicial necessário

1. Instalar `sops` + `age` no runner self-hosted
2. Gerar par de chaves age: `age-keygen -o nexo-secrets.key`
3. Armazenar chave privada como secret do GitHub Actions `SOPS_AGE_KEY`
4. Atualizar `.sops.yaml` com a chave pública
