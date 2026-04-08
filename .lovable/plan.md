

## Plano: Zerar Pontuações + Popular Regras de Pontuação

### Problema
1. A tabela `scoring_rules` está **vazia** — por isso a tela admin mostra só o cabeçalho sem linhas
2. O sistema usa fallback hardcoded quando não encontra regras, então alunas estão pontuando sem configuração oficial
3. Existem 11 registros de hustle_points (90 pontos no total) que precisam ser zerados

### Ações

**1. Migration: Limpar pontos existentes e zerar campo em profiles**
- `DELETE FROM hustle_points;` — remove os 11 registros (90 pts)
- `UPDATE profiles SET hustle_points = 0 WHERE hustle_points > 0;` — zera o cache no perfil

**2. Migration: Popular `scoring_rules` com as 15 ações padrão**

Inserir todas as regras com os valores default para o admin poder ajustar:

| Ação | Pontos | Descrição |
|------|--------|-----------|
| workout_complete | 10 | Treino concluído |
| workout_weekly_bonus | 20 | Bônus semanal treino |
| workout_streak | 3 | Streak de treino |
| diet_log | 5 | Registrar refeição |
| diet_calories | 5 | Meta de calorias |
| diet_protein | 3 | Meta de proteína |
| diet_all_macros | 5 | Todos os macros |
| diet_weekly_bonus | 15 | Bônus semanal dieta |
| habit_water | 5 | Meta de água |
| habit_sleep | 5 | Meta de sono |
| habit_combined_bonus | 3 | Bônus hábitos |
| lesson_complete | 8 | Aula concluída |
| module_complete | 15 | Módulo concluído |
| community_post | 2 | Post na comunidade |
| community_reaction_bonus | 3 | Bônus de reações |

**3. Nenhuma alteração de código necessária**
- O `AdminPontuacao.tsx` já lê e edita `scoring_rules` corretamente
- O `useHustlePoints.ts` já busca regras do DB com fallback

### Resultado
- Todos os pontos zerados (fresh start)
- Admin verá as 15 regras listadas para editar valores antes de "liberar" a pontuação

