

## Plano: Correções de Alunas + Painel Admin de Comunidade

### 1. Correções pontuais nas alunas (via SQL direto)

**Yhanca Nicoly dos Santos Zeferino** (`yhanca.nicoly@outlook.com`)
- Verificado no banco: `planner_type` já está como `essencial` ✅
- Posts ativos: 11/04 e 13/04 — **dias ativos preservados** (a contagem é dinâmica via `community_posts`, então mudar liga não apaga histórico)
- Ação: confirmar `planner_type='essencial'` (idempotente) — sem perda de dados

**Izalici Gabriela Back Rodrigues** (`izalici.rodrigues06@gmail.com`)
- Posts existentes: 09, 10, 11, 12, 13, 14, 16/04 — **falta o dia 15/04**
- Ação: inserir 1 post de sistema com `created_at = 2026-04-15 12:00 BRT`, conteúdo: `"[Registro retroativo - falha técnica do app] Treino realizado ✅"` 
- Isso adiciona 1 dia ativo ao streak dela automaticamente (lógica do `useStreak` conta dias únicos com post)

### 2. Nova aba Admin → Comunidade (`/admin/comunidade`)

Adicionar item no menu lateral do `AdminLayout.tsx` (ícone `MessagesSquare`) entre "Notificações" e "Logs do Sistema".

**Página `src/pages/admin/AdminComunidade.tsx`** com 3 abas internas:

#### Aba 1: Feed Geral
- Lista paginada de **todos os posts** da comunidade (`community_posts` + join com `profiles` + contagem de likes/comentários)
- Cada card mostra: avatar, nome, data, conteúdo, imagem (se houver), curtidas, comentários
- Filtros: por aluna (autocomplete), por período (hoje/7d/30d/tudo), por liga (`planner_type`)
- Ação por post: **Excluir** (admin pode remover post inadequado) — usando RLS já existente (admin tem permissão via `posts_delete_own` precisa ser ampliada, ou via service-role no client admin)

#### Aba 2: Perfis das Alunas
- Grid com todas as alunas ativas (avatar + nome + liga + dias ativos + total de posts)
- Click em uma aluna abre modal com:
  - Bio do perfil
  - Histórico de posts (lista cronológica)
  - Streak atual + total de dias ativos desde 08/04/2026
  - Última atividade

#### Aba 3: Rankings das 3 Ligas
- 3 colunas lado a lado (em mobile: tabs): **Essencial | Constância | Elite**
- Cada coluna mostra ranking ordenado por dias ativos (lógica idêntica à `useSegmentedRanking` em `Comunidade.tsx`)
- Mostra posição, avatar, nome, dias ativos
- Top 3 destacados com pódio (ouro/prata/bronze)
- Filtro de período: Semanal / Mensal / Tudo

### 3. Alterações técnicas

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/AdminComunidade.tsx` | **NOVO** — página com 3 abas |
| `src/components/admin/AdminLayout.tsx` | Adicionar item "Comunidade" no `navItems` |
| `src/app/AuthenticatedApp.tsx` | Adicionar rota `/admin/comunidade` |
| **Migration SQL** | Adicionar policy `posts_delete_admin` em `community_posts` para permitir admin excluir qualquer post |
| **SQL data-fix** | UPDATE `profiles` Yhanca + INSERT post retroativo Izalici |

### 4. Reaproveitamento

- Reusar componente `PodiumCard` existente para o pódio dos rankings
- Reusar lógica de `useSegmentedRanking` (extrair para hook compartilhado `src/hooks/useLeagueRanking.ts`)
- Reusar `PostCard` adaptado (sem botão de curtir — apenas visualização + excluir)

### 5. Resultado esperado

- Yhanca consegue usar a liga essencial mantendo seus 2 dias ativos
- Izalici passa a ter 8 dias ativos (Apr 9-16, exceto buraco preenchido)
- Admin tem visibilidade total da comunidade num só lugar
- Admin pode moderar conteúdo (excluir posts ofensivos/spam)
- Admin vê quem está liderando cada uma das 3 ligas em tempo real

