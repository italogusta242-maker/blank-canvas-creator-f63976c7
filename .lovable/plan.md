

## Diagnóstico e Correções: Ranking, Pontuação e Sininho

### Problemas encontrados

**1. Ranking da Liga mostra apenas Top 10**
No arquivo `Comunidade.tsx` linha 90, o código faz `.slice(0, 10)` — cortando qualquer aluna depois da 10a posição. Resultado: alunas que treinaram não aparecem.

**2. Aba "Liga" do GymRatsTab lê coluna errada**
O `GymRatsTab.tsx` busca `profiles.hustle_points` (uma coluna estática, sempre 0) em vez de somar da tabela `hustle_points`. A coluna `profiles.hustle_points` nunca é atualizada — os pontos ficam apenas na tabela `hustle_points`. Por isso o ranking geral aparece zerado para quase todo mundo.

**3. Sininho mostrando 0 — problema de RLS**
A tabela `push_subscriptions` tem RLS com `push_select_own`, que permite apenas a própria aluna ver seu registro. Quando o admin faz `SELECT count(*)`, retorna 0 porque o admin não é dono de nenhuma subscription. Precisa de uma policy que permita admins verem todos os registros.

---

### Correções

**1. Remover limite de 10 no ranking da Liga** (`Comunidade.tsx`)
- Remover `.slice(0, 10)` da linha 90 para mostrar todas as alunas da liga
- Manter o sort por pontuação

**2. Corrigir GymRatsTab para ler da tabela correta** (`GymRatsTab.tsx`)
- Em vez de `profiles.hustle_points`, fazer SUM da tabela `hustle_points` por `user_id`
- Juntar com profiles para nome/avatar
- Manter as 3 categorias (pontos, streak, treinos)

**3. Adicionar RLS admin para push_subscriptions** (Migration SQL)
```sql
CREATE POLICY "push_select_admin" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (public.has_role('admin'::app_role, auth.uid()));
```

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Comunidade.tsx` | Remover `.slice(0, 10)` |
| `src/components/comunidade/GymRatsTab.tsx` | Buscar pontos da tabela `hustle_points` em vez de `profiles.hustle_points` |
| Migration SQL | Adicionar policy `push_select_admin` na tabela `push_subscriptions` |

