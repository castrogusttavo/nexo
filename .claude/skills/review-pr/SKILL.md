---
name: review-pr
description: Revisa PRs seguindo checklist profissional de 3 passes
disable-model-invocation: true
---

Analise o código em 3 passes:

## Pass 1: Estrutura (2 min)
- Arquitetura faz sentido?
- Responsabilidades bem definidas?
- Nomenclatura clara?

## Pass 2: Lógica (3 min)
- Lógica está correta?
- Edge cases cobertos?
- Testes adequados?

## Pass 3: Segurança (2 min)
- Vulnerabilidades (XSS, SQL injection)?
- Dados sensíveis expostos?
- Validação de inputs?

## Output
1. Issues encontradas (por severidade)
2. Sugestões de melhoria
3. Aprovado/Mudança necesárias/Rejeitar
