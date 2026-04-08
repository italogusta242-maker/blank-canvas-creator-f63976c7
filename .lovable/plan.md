

## Unificar Streak + Pontos em "Dias Ativos"

### Resumo

Remover "Pontos" e "Streak" como métricas separadas. Tudo vira **"Dias Ativos"** -- um único número baseado em dias com pelo menos 1 post na comunidade. O ranking passa a ordenar por dias ativos. A chama continua funcionando igual, mas o label muda de "Streak" para "Dias Ativos".

---

### Mudanças

**1. Lógica de dias ativos: `useFlameState.ts` e `useStreak.ts`**
- Trocar `workouts.started_at` por `community_posts.created_at` como fonte de dias ativos
- UNION com `workouts.started_at` histórico para preservar dias já contabilizados
- O número exibido (hoje chamado "streak") passa a ser a contagem de dias únicos com post OU treino histórico
- A lógica de chama (ativa/trégua/extinta) continua igual, mas baseada em posts

**2. Ativar chama ao postar: `CreatePost.tsx`**
- Após inserir post, chamar `shouldIncrementFlame` + `optimisticFlameUpdate`
- Invalidar queries de flame/streak
- Não dar hustle_points separados (pontos deixam de existir)

**3. Remover ativação de chama nos treinos: `Treinos.tsx` e `RunningSection.tsx`**
- Remover chamadas de `shouldIncrementFlame` e `optimisticFlameUpdate` do save de treino/corrida

**4. Dashboard Hero: `DashboardHero.tsx`**
- Remover prop `totalPoints` e a coluna "Pontos"
- Renomear label "Streak" → "Dias Ativos"
- Manter "Ranking" e "Adesão"

**5. Dashboard: `Dashboard.tsx`**
- Remover import/uso de `useHustlePoints`
- Não passar `totalPoints` para o Hero

**6. Ranking da Liga: `Comunidade.tsx` (useSegmentedRanking)**
- Em vez de somar `hustle_points` do mês, contar dias únicos com `community_posts` + `workouts` históricos no mês
- `score` = quantidade de dias ativos no mês
- Ordenar por dias ativos

**7. PodiumCard: `PodiumCard.tsx`**
- Trocar label "pts" → "dias"
- Remover exibição separada de streak (já é o mesmo número)

**8. GymRatsTab: `GymRatsTab.tsx`**
- Remover categorias "Pontos Totais" e "Treinos"
- Manter uma única visão: ranking por dias ativos
- Renomear para "Dias Ativos" com ícone Flame

**9. GymRatsHub: `GymRatsHub.tsx`**
- Trocar lógica de pontos para contar dias ativos (dias com post) por período
- Labels: "Semana", "Mês", "Geral" continuam, mas contam dias ativos

**10. FlameCard: `FlameCard.tsx`**
- Onde aparece "streak", trocar o label para "Dias Ativos"

**11. Trilha de 7 dias na Comunidade: `Comunidade.tsx`**
- Trocar query de `workouts.finished_at` por `community_posts.created_at` + workouts históricos

**12. Edge Function `daily-flame-check`**
- Na função `isDayApproved`, checar `community_posts` em vez de workouts/dieta

**13. Perfil: `Perfil.tsx`**
- Onde exibe "streak", trocar label para "Dias Ativos"

---

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useFlameState.ts` | Posts como fonte + UNION workouts |
| `src/hooks/useStreak.ts` | Posts como fonte + UNION workouts |
| `src/components/community/CreatePost.tsx` | Ativar chama ao postar |
| `src/pages/Treinos.tsx` | Remover ativação de chama |
| `src/components/training/RunningSection.tsx` | Remover ativação de chama |
| `src/components/dashboard/DashboardHero.tsx` | Remover "Pontos", renomear "Streak" → "Dias Ativos" |
| `src/pages/Dashboard.tsx` | Remover useHustlePoints |
| `src/pages/Comunidade.tsx` | Ranking por dias ativos, trilha 7 dias por posts |
| `src/components/community/PodiumCard.tsx` | Label "pts" → "dias", remover streak separado |
| `src/components/comunidade/GymRatsTab.tsx` | Categoria única: dias ativos |
| `src/components/community/GymRatsHub.tsx` | Contar dias ativos por período |
| `src/components/FlameCard.tsx` | Label "Streak" → "Dias Ativos" |
| `src/pages/Perfil.tsx` | Label "Streak" → "Dias Ativos" |
| `supabase/functions/daily-flame-check/index.ts` | isDayApproved checa posts |

### O que NÃO muda
- Visual da chama (cores, animações, estados)
- Hustle points continuam no banco (dados históricos), mas não são mais exibidos
- Workouts históricos preservados na contagem

