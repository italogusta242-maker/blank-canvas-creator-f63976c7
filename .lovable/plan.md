

## Plano: Corrigir Chamas Sendo Zeradas

### Problemas Encontrados

Existem **3 bugs** que fazem o streak aparecer como 0 ou "1 dia ativo":

**Bug 1 — `useFlameState.ts` e `useStreak.ts`: streak depende de atividade hoje/ontem**
- Linhas 61-67 em `useFlameState.ts` e 44-50 em `useStreak.ts`: `if (isActive)` — se a aluna não postou hoje NEM ontem, o `calculatedStreak` fica **0**, mesmo que ela tenha 5 dias ativos acumulados
- A regra decidida é: chamas **congelam**, nunca zeram. Mas o código zera porque só calcula streak quando `isActive = true`

**Bug 2 — `useFlameState.ts`: `consecutiveMisses > 1` quebra o streak**
- Linha 85: se a aluna pular 2 dias seguidos (ex: sexta e sábado), o loop para e o streak fica menor do que deveria
- A regra é: streak = total de dias ativos desde o início do desafio, sem resetar

**Bug 3 — `daily-flame-check` Edge Function: demote para "extinta"**
- Linha 100-104: quando state é "tregua" e a aluna não posta, vai para "extinta"
- A regra é: nunca zerar/extinguir, apenas congelar

**Bug 4 — Sticker mostra "1 dia ativo"**
- O sticker na página Treinos usa `useStreak` que sofre do Bug 1, então mostra streak calculado como 0 ou 1

### Alterações

**1. `src/hooks/useFlameState.ts`**
- Remover a condição `if (isActive)` — sempre calcular o streak
- Remover a lógica de `consecutiveMisses` que quebra o streak
- Streak = contagem de **todos os dias únicos com post** desde CHALLENGE_START_DATE
- State: "ativa" se postou hoje/ontem, "frozen" caso contrário (nunca "extinta" ou "normal" para quem tem dias)
- Remover workouts da contagem (consistência com ranking)

**2. `src/hooks/useStreak.ts`**
- Mesma correção: streak = total de dias com post desde CHALLENGE_START_DATE
- Remover workouts da contagem
- Remover `consecutiveMisses`
- State: "ativa" ou "frozen" (nunca zero se tem posts)

**3. `supabase/functions/daily-flame-check/index.ts`**
- Remover a transição `tregua → extinta`
- Quando não posta: `ativa → frozen` (congelada)
- Quando `frozen` e não posta: permanece `frozen` (nunca zera)

**4. `src/hooks/useFlameState.ts` — `calculateAdherence`**
- Remover workouts da contagem de adesão (consistência)

### Lógica Final Simplificada

```text
streak = count(distinct dates com post >= CHALLENGE_START_DATE)
state  = postou hoje ou ontem ? "ativa" : (streak > 0 ? "frozen" : "normal")
```

Streak nunca zera. Chama congela quando inativa, mas dias acumulados são preservados.

