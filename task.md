# Lista de Tarefas - Refatoração Annac

## Tarefa 1: Correção de Branding
- [x] Subtituir "BEM-VINDO AO ANAC CLUBE" em `Dashboard.tsx`
- [x] Subtituir "INFOSAAS ANAAC" em `AuthPage.tsx`

## Tarefa 2: Refatoração do Motor da Chama e Banco de Dados
- [x] Criar Script SQL de Migração (Adicionar coluna `scoring_rules` na tabela `challenges`)
- [x] Remover `ScoringRulesPanel.tsx` e suas referências (`AdminDashboard.tsx`)
- [x] Update `AuthenticatedApp.tsx` routing to support `/aluno/perfil/:userId?`
- [x] Update `Perfil.tsx` to handle `userId` params, support viewing other profiles (hide private settings, show Follow button), and make photo grid clickable with a popup Dialog.
- [x] Update `Comunidade.tsx` to remove `ProfileModal`, use `useNavigate` for profile clicks, fix "ESTA SEMANA" to use `useStreak`, fix Grammar, remove "v2.2" badge, and use `hustle_points` table.
- [x] Update `PostCard.tsx` to remove appearance animations, reverse image and text rendering order.
- [x] Update `useHustlePoints.ts` to write to `hustle_points`.
- [x] Update `GymRatsHub.tsx` to query `hustle_points` instead of `hustle_points_log`.
- [x] Check `GymRatsTab.tsx` or other files for `hustle_points_log` and fix them.

## Tarefa 3: UX do Admin (ChallengeView com Tabs)
- [x] Importar `<Tabs>` do UI Kit
- [x] Criar Aba 1: Apresentação (Título, Descrição e Carrossel)
- [x] Criar Aba 2: Regras de Pontuação (Inputs numéricos para JSONb)
- [x] Criar Aba 3: Módulos e Aulas (Reorder Group)
- [x] Ajustar layout e responsividade do `ChallengeView.tsx`

## Tarefa 4: Script de Teste (Seed/Mock)
- [x] Importar dependências do Supabase
- [x] Criar função utilitária em `src/lib/testEnvironment.ts` para injetar Desafio mockado
- [x] Injetar DietPlan com 4 refeições hoje e TrainingPlan hoje
- [x] Adicionar botão "Debug Chama" (ex: no Dashboard) para facilitar execução
