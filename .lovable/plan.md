

## Diagnóstico final + ações

### 🔥 Chama — já está correto, mas vou reforçar

A regra "**nunca zera, só congela**" **já está implementada** em `useFlameState.ts` e `useStreak.ts`. O `streak` é a contagem total de dias únicos com post desde 08/04 — nunca decrementa.

**Estado de cada aluna (validado no banco agora):**

| Aluna | Posts (dias únicos) | Último post BRT | Estado correto no app |
|---|---|---|---|
| Karol (Hellen) | **6** | 16/04 22:54 | 🔥 **ATIVA** (postou ontem) |
| Izalici | **6** | 14/04 21:38 | 🧊 **frozen** (3 dias sem postar — streak preservado em 6) |
| Fernanda | **9** | 16/04 21:10 | 🔥 **ATIVA** |
| Nicoly | **2** | 15/04 18:35 | 🧊 **frozen** (streak preservado em 2) |
| Ana Julia | **0** | nunca postou | normal (sem chama) |

**Nenhuma chama está "zerada" — todas mostram o número total de dias únicos com post.** Se Hellen está vendo "0", é cache do React Query. Vou adicionar **invalidação automática** da `flame-state` query quando ela publica um post novo, para refletir imediatamente.

### 📱 Acesso ao app — diagnóstico não-conclusivo via SQL

A tabela `auth_logs` está vazia para esses e-mails (logs do Supabase Auth não estão sendo persistidos na analytics). Pra descobrir **por que** Nicoly e Ana Julia não conseguem entrar, preciso instrumentar o `AuthContext.signIn` para gravar tentativas falhadas em uma tabela `auth_failure_logs` (com email, mensagem de erro, user-agent, plataforma).

### O que vou fazer (3 mudanças pequenas)

1. **`src/hooks/useFlameState.ts`** + **`src/hooks/useStreak.ts`**: adicionar comentário explícito reforçando "streak nunca decrementa, só congela"; garantir que `Karol` (Hellen) reflita ATIVA imediatamente após post.

2. **`src/components/community/CreatePost.tsx`** (ou onde publica): após `INSERT` em `community_posts`, chamar `queryClient.invalidateQueries({ queryKey: ["flame-state"] })` e `["streak"]` — para a chama atualizar **na hora**, sem precisar recarregar.

3. **Nova tabela `auth_failure_logs`** + instrumentação em `AuthContext.signIn`:
   - Migration cria tabela com: `email`, `error_message`, `error_type` (network/credential/timeout), `user_agent`, `platform` (ios/android/desktop), `created_at`.
   - RLS: só admin pode ler (`has_role('admin', auth.uid())`); INSERT público (anônimo, pré-login).
   - Em cada erro de login, faz fire-and-forget INSERT na tabela.
   - **Resultado**: amanhã eu consulto e te digo exatamente por que Nicoly/Ana Julia não entram (rede ruim? senha errada? bloqueio?).

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useFlameState.ts` | Comentário explícito da regra + sem mudança lógica (já correto) |
| `src/hooks/useStreak.ts` | Mesmo |
| `src/components/community/CreatePost.tsx` | Invalida `flame-state` e `streak` após publicar |
| `supabase/migrations/...` | Cria `auth_failure_logs` + RLS |
| `src/contexts/AuthContext.tsx` | INSERT em `auth_failure_logs` em cada falha |
| `src/pages/AuthPage.tsx` | Idem (captura também o cenário pré-AuthContext) |

Após implementar, peço pra Nicoly e Ana Julia tentarem entrar 1 vez no celular — e te trago o log exato amanhã.

