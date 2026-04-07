

## Correções: Adesão, Nome do Planner, e Auto-check de Treino

### Problema 1: Adesão (círculo hero) não bate com Score de Evolução

**Causa**: `calculateAdherence()` em `useFlameState.ts` calcula apenas `dias_treinados / 7 * 100`. O score de evolução usa o composto `Treino(40) + Dieta(40) + Metas(20) = 100`. São métricas completamente diferentes.

**Solução**: Substituir a adesão do círculo pelo `performanceScore` do `useRealPerformance()`. Assim, o que aparece no círculo do hero será exatamente o score de hoje (mesmo valor do gráfico).

**Arquivo**: `src/pages/Dashboard.tsx`
- Em vez de usar `adherenceReal` do `useFlameState()`, usar `performanceScore` do `useRealPerformance()` como valor de adesão passado ao `DashboardHero`
- Manter o `useFlameState` apenas para streak e flame state

### Problema 2: Nome "Planner Principal" em vez de "Metas Diárias"

**Arquivo**: `src/components/dashboard/DailyGoals.tsx` (linha 241)
- Trocar `"Planner Principal"` por `"Metas Diárias"`

### Problema 3: Treinamento marca como feito incorretamente

**Causa**: `isGoalDone("treino")` verifica se o último dia do array `performanceData` tem `training > 0`. Isso significa que se a aluna treinou ontem, hoje mostra como feito. Mas o planner diz "X treinos na semana" — deveria checar se o total de treinos na semana atingiu a meta semanal.

**Solução**: Mudar a lógica do `treino` para contar dias com treino nos últimos 7 dias e comparar com a meta do planner (ex: Elite = 5 treinos/semana, Essencial = 2, etc.).

**Arquivo**: `src/components/dashboard/DailyGoals.tsx`
- Extrair o número de treinos exigidos do `description` do goal (ex: "2 treinos" → 2, "5 treinos" → 5)
- Contar dias únicos com `training > 0` nos últimos 7 dias do `performanceData`
- Marcar como feito apenas se `diasTreinados >= metaSemanal`

---

### Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Passar `performanceScore` como adesão ao hero em vez de `adherenceReal` |
| `src/components/dashboard/DailyGoals.tsx` | Renomear "Planner Principal" → "Metas Diárias"; corrigir auto-check de treino para contar treinos semanais |
| `src/hooks/useFlameState.ts` | Sem alteração (mantém streak/state, adesão não é mais usada no hero) |

