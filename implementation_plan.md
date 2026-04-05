# Refatoração Principal do Projeto Annac

Esta proposta cobre os 4 épicos principais de refatoração do Motor da Chama ("Flame"), Branding, Admin UX e Mock de Testes descritos na solicitação.

## User Review Required

> [!WARNING]
> Irei adicionar a coluna `scoring_rules` na tabela `challenges` com um JSON default. Se preferir, executarei este script via Supabase CLI localmente ou SQL direto. Por favor confirme como deseja aplicar a migração de banco (via SQL Editor no seu painel ou executando CLI/comando).

> [!NOTE]
> A lógica da `adherence` será refatorada. Com o arquivo de Mock, os testes ficam automatizados. Confirme se as regras de pontuação ficarão alocadas apenas ao desafio globalmente `ativo` ou caso exista tabela pivô de usuário-desafio. Assumo que buscaremos o desafio mais recente onde `is_active = true`.

## Proposed Changes

---

### Ajustes de Branding (Texto Estático)

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/pages/Dashboard.tsx)
- Substituir ocorrências de texto "BEM-VINDO AO ANAC CLUBE" para "BEM-VINDO AO ANNAC CLUBE".

#### [MODIFY] [AuthPage.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/pages/AuthPage.tsx)
- Substituir "INFOSAAS ANAAC" para "INFOSAAS ANNAC".

---

### Refatoração do Motor da Chama (Database & Scoring)

#### [NEW] Database Migration Script (`supabase/migrations/...` ou raw SQL)
- Comando SQL gerado para o admin injetar: `ALTER TABLE challenges ADD COLUMN scoring_rules JSONB DEFAULT '{"workout": 30, "diet": 40, "running": 30}';`

#### [DELETE] [ScoringRulesPanel.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/components/admin/ScoringRulesPanel.tsx)
- Excluir o componente. Remover sua referência e renderização da página de dashboard:
#### [MODIFY] [AdminDashboard.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/pages/admin/AdminDashboard.tsx)
- Remover os imports e renderização do `<ScoringRulesPanel \>`.

#### [MODIFY] [AdminDesafios.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/pages/admin/AdminDesafios.tsx)
- Na mutation `saveAllM`, adicionar `scoring_rules: challenge.scoring_rules` no upsert inicial para registrar o JSONB.

#### [MODIFY] [useRealPerformance.ts](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/hooks/useRealPerformance.ts)
- Adicionar uma query para resgatar o `active_challenge` com `is_active = true`.
- Refatorar os cálculos (Treino, Dieta). Em vez de chumbado * 40pts ou *30pts, mapear pelas propriedades do `.scoring_rules` advindo do JSONB do `active_challenge`.
- Ajustar a fórmula do adesão total: Somar `(Pontos Conquistados (score acumulado)) / (Total de Pontos Possíveis)` das regras ativas do dia.

#### [MODIFY] [DailyGoals.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/components/dashboard/DailyGoals.tsx)
- Adicionar uma TanStack Query `useMutation` para que ao clicar num hábito (ex: Água/Refeições), ele altere a DailyHabit/Database.
- Chamar `queryClient.invalidateQueries({ queryKey: ["daily-habits"] })` para invalidar a performance em tempo real. (Atualmente, ele não reflete o real status da base).

---

### UX do Admin (Tabs)

#### [MODIFY] [ChallengeView.tsx](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/components/admin/ChallengeView.tsx)
- Adicionar interface de `Tabs` de `src/components/ui/tabs.tsx`.
- Aba 1 (**Apresentação**): Englobar o Header (InLineEdit, Titles) e Carrossel de Banners.
- Aba 2 (**Regras de Pontuação**): Adicionar os Inputs Numéricos de Dieta, Treino, Corrida, planner, etc., atrelando ao state local de `challenge.scoring_rules`.
- Aba 3 (**Módulos e Aulas**): Englobar o sistema `Reorder.Group` de arraste de módulos e o render dos modais de módulos.

---

### Seed/Mock Tooling

#### [NEW] [testEnvironment.ts](file:///c:/Users/Pichau/blank-canvas-creator-f63976c7/src/lib/testEnvironment.ts)
- Exportar assíncrono `injectMockGamificationData(userId: string)`.
- Fazer injeção:
  1. Criar um Challenge Dummy test com `scoring_rules = { dieta: 50, treino: 50 }` na tabela challenges.
  2. Criar ou Atualizar a habit log para dar 100% nas refeiçoes (`completed_meals = [...]`).
  3. Criar Workouts finalizados hoje para validar Treino.

## Open Questions

> [!WARNING]
> Como deseja injetar a migração para adicionar a coluna `scoring_rules`? Eu posso gerar o comando SQL cru para você colar no painel local/online do banco ou eu posso conectar um terminal de bash local (ex: rodar `npx supabase db execute`) se esse DB localmente permitir isso? (Fornecerei o SQL de qualquer jeito).

## Verification Plan
1. Atualizar e compilar a aplicação sem erros de TSLint Types.
2. Validar que na página "Auth" e "Dashboard" os textos estão com "ANNAC"
3. UI da tela Admin Desafios reflete Tabs com a view limpa.
4. O `useRealPerformance` fará os fetchs corretos a partir do *rules* e retornará corretamente.
