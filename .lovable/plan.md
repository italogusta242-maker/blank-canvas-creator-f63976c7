

## Plano: Hardening de boot + faxina de código morto

### Fase 1 — Forçar Home no boot (resolver bug "abre em Treinos")

**Arquivo:** `src/contexts/AuthContext.tsx`

**Mudança cirúrgica no listener `onAuthStateChange`:**

Hoje o listener trata `INITIAL_SESSION` igual a `SIGNED_IN` e chama `checkRoleAndRedirect`, que **só redireciona se o pathname não estiver em rotas protegidas**. O bug é que `/aluno/treinos` está dentro do guard `StudentGuard`, então o redirect early-returns e a aluna fica presa lá.

**Correção:** quando o evento for `INITIAL_SESSION` (ou seja, sessão restaurada de boot, não login fresco), forçar destino `/aluno` se a aluna estiver em qualquer subrota de `/aluno/*` que **não seja a home**. Login real (`SIGNED_IN`) continua respeitando a rota atual.

**Garantias explícitas (conforme você pediu):**
- ❌ Não toco em `access_token`
- ❌ Não toco em `refresh_token`
- ❌ Não toco em `setSession` / `getSession` / `signInWithPassword`
- ❌ Não toco no `safetyTimer` nem na lógica de retry
- ✅ Mexo apenas no branch de redirect dentro do `syncSessionState` quando `event === "INITIAL_SESSION"`

**Comportamento resultante:**
- Aluna fecha app em `/aluno/treinos` → reabre → Android tenta restaurar → AuthContext detecta `INITIAL_SESSION` → força `navigate("/aluno", { replace: true })` → cai na Home ✅
- Admin fecha em `/admin/usuarios` → reabre → continua em `/admin/usuarios` (rota admin, não toca) ✅
- Aluna faz login na tela de login → vai pra `/aluno` (comportamento já existente) ✅

### Fase 2 — Faxina de onboarding morto

**Arquivos a remover/limpar:**
1. **Deletar** `src/pages/Onboarding.tsx` — não está em nenhuma rota, é código órfão.
2. **Deletar** `src/pages/onboarding/` (pasta inteira: `constants.ts`, `CheckboxGroup.tsx`, `FileUploadField.tsx`, `googleSheetsScript.ts`) se nada mais importar.
3. **Deletar** `src/lib/submitOnboarding.ts` se nada mais importar.
4. **Limpar** `AuthContext.tsx`:
   - Remover state `onboarded` + setter
   - Remover `setOnboarded(true)` do `syncSessionState`
   - Remover `onboarded` e `setOnboarded` do `AuthContextType` e do provider value

**O que NÃO removo:**
- ❌ Coluna `onboarded` na tabela `profiles` (98 perfis dependem; mexer no banco é risco sem ganho)
- ❌ Coluna referenciada pelo trigger `handle_new_user` (continua setando `onboarded=true` no signup)

**Verificação obrigatória antes de deletar cada arquivo:** rodar `rg -n "from.*Onboarding"` pra garantir que ninguém importa.

### Fase 3 — Relatório de danos

Te entrego no fim:
1. ✅ Lista exata de arquivos deletados
2. ✅ Diff resumido do `AuthContext.tsx`
3. ✅ Confirmação do comportamento esperado
4. ✅ O que **não** mudou (treinos, exercícios, vídeos, banco, RLS, edge functions)

### Arquivos afetados

| Arquivo | Ação | Risco |
|---|---|---|
| `src/contexts/AuthContext.tsx` | Refatorar redirect do `INITIAL_SESSION` + remover `onboarded` state | Baixo (mudança isolada) |
| `src/pages/Onboarding.tsx` | Deletar | Zero (não usado) |
| `src/pages/onboarding/*` | Deletar pasta se órfã | Zero |
| `src/lib/submitOnboarding.ts` | Deletar se órfão | Zero |

### O que NÃO faço (reforçando seus limites)
- ❌ Não crio tela "Comece Aqui"
- ❌ Não mexo em treinos / exercícios / vídeos
- ❌ Não toco em payment gate (fica pra outro momento)
- ❌ Não aplico fade-in entre rotas (sem aprovação)
- ❌ Não mexo em banco / RLS / edge functions
- ❌ Não toco em fluxo de refresh token

### Como você valida depois

Pede pra uma aluna que tinha o problema:
1. Fechar PWA completamente
2. Reabrir
3. Confirmar que abre na Home (com saudação, planner, chama) — não em Treinos

Se ainda abrir em Treinos = é cache de PWA velho, ela precisa reinstalar. Se abrir na Home = correção funcionou.

