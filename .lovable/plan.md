

## Plano: Simplificar Motor de Performance — Adesão = Metas Diárias

### Problema Atual

O score de performance é composto por 3 pilares separados:
- Treino: 40 pts (baseado em séries completadas)
- Dieta: 40 pts (baseado em refeições completadas)
- Metas Diárias: 20 pts (baseado em goals do planner)

Isso é complexo, propenso a bugs, e desacoplado da experiência visual das alunas.

### Nova Lógica

A adesão (%) e o gráfico de evolução serão derivados **exclusivamente das metas diárias**:

```text
adherence = (metas concluídas / total de metas do dia) × 100
```

As metas diárias já incluem treino, água, sono, dieta e metas comportamentais — então elas já capturam tudo. Conforme a aluna marca cada meta, a % sobe proporcionalmente.

### Alterações

**1. `src/hooks/useRealPerformance.ts`**
- Remover cálculos separados de `trainingScore` e `dietScore` do score final
- O `performanceScore` passa a ser: `Math.round((completedGoals / totalGoals) * 100)`
- Manter a lógica de deduplicação (auto-detected agua/treino/sono)
- Manter volume semanal e dados de treino (usados em outros componentes)
- `buildPerformanceData` para o gráfico de evolução: cada dia usa a mesma fórmula (goals concluídas / total)

**2. `src/components/dashboard/DailyGoals.tsx`**
- Atualizar o cálculo otimista do histórico de 7 dias para usar a mesma fórmula simplificada
- Remover referências a `trainingPts` e `dietPts` no cálculo do score

**3. `src/pages/Dashboard.tsx`**
- `adherence` já consome `performanceScore` — continua funcionando automaticamente
- Nenhuma mudança estrutural necessária

**4. `src/components/dashboard/DashboardHero.tsx`**
- Nenhuma mudança — já consome `adherence` como prop

**5. `src/components/dashboard/PerformanceEvolution.tsx`**
- Nenhuma mudança — já consome `performanceData` com `score`

### Resultado

- Aluna com 5 de 8 metas = 62% de adesão
- Aluna com 8 de 8 metas = 100% de adesão
- Gráfico de evolução reflete exatamente o progresso das metas ao longo dos dias
- Zero dependência de queries extras (diet_plans, workouts) para calcular o score

### Dados Preservados

Os dados de treino (volume semanal, séries, grupos musculares) e dieta continuam sendo buscados e expostos pelo hook — são usados em outros componentes (cards de volume, modal de detalhes). Apenas o `performanceScore` muda de fórmula.

