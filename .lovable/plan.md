

## Diagnóstico: Figurinha/Ranking mostrando 1 dia em vez de 6

### Problema encontrado

A aluna **Karol** (8b58935c) tem **6 dias ativos reais** (posts em 09, 10, 13, 14, 15, 16 de abril), mas a tabela `flame_status` contém **10 linhas duplicadas**, todas com `streak: 1`.

O componente **GymRatsTab** (aba "Ofensiva" no ranking) lê o streak diretamente de `flame_status`, pegando o valor errado (1). A figurinha no Treinos.tsx usa `useStreak()` que conta posts diretamente — deveria mostrar 6 corretamente.

### Outras alunas afetadas

| Aluna | Dias Reais | flame_streak | Linhas duplicadas |
|-------|-----------|-------------|-------------------|
| Karol | 6 | 1 | 10 |
| Lorrayne | 7 | 1 | 8 |
| Ariana | 5 | 1 | 1 |
| Alana | 6 | null | 0 |

Várias outras também têm divergência (ex: Duda tem 9 dias reais mas flame_streak=7).

### Causa raiz

A `flame_status` é uma tabela legada que não está sendo atualizada corretamente. Enquanto `useStreak()` e `useFlameState()` calculam o streak diretamente dos `community_posts` (correto), o `GymRatsTab` ainda lê de `flame_status.streak` (stale).

### Plano de correção

1. **Corrigir `GymRatsTab`**: Remover a dependência de `flame_status` para streak. Calcular o streak contando dias únicos de `community_posts` diretamente (mesmo padrão do `useStreak` e `GymRatsHub`).

2. **Limpar dados duplicados**: Executar uma migration para:
   - Deletar linhas duplicadas de `flame_status` (manter apenas 1 por user)
   - Atualizar o `streak` para o valor real calculado de `community_posts`

3. **Verificar a figurinha**: Confirmar que `ActiveDaysSticker` recebe `streakNum` do `useStreak()` (que já calcula corretamente). Se a aluna vê "1", pode ser cache — a correção do passo 1 resolve.

