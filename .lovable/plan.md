

# Plano: 3 Bugs Críticos de Produção

## Bug 1 — "Load failed" no mobile

**Causa raiz**: `AuthPage.tsx` chama `supabase.auth.signInWithPassword` direto, **sem timeout, sem retry, sem log**. Em redes 4G/5G instáveis o `fetch` é cancelado pelo iOS Safari → o SDK lança `TypeError: Load failed` (mensagem genérica do WebKit). O usuário só vê "Load failed" sem entender se é credencial errada ou rede.

Importante: o `AuthContext.signIn()` JÁ tem `withTimeout` + try/catch — mas a `AuthPage` não usa esse método, chama o supabase cru.

**Correção**:
1. `AuthPage.tsx` passa a usar `useAuth().signIn()` (que já tem timeout de 12s e tratamento de exceção).
2. Traduzir mensagens crípticas: `Load failed`, `Failed to fetch`, `NetworkError` → "Falha de conexão. Verifique seu 4G/Wi-Fi e tente novamente."
3. Adicionar 1 retry automático em caso de erro de rede (não em erro de credencial).
4. Logar `console.error` com `{ email, errorType, message }` para diagnóstico futuro.

## Bug 2 — "Lock was stolen by another request"

**Causa raiz**: `src/integrations/supabase/client.ts` configura `storage: localStorage` mas **não define `storageKey` nem desabilita o `navigator.locks`**. Quando o usuário tem o app aberto em 2 abas (PWA + browser, ou recarregou no meio da auto-refresh), o gotrue-js tenta adquirir o lock do IndexedDB simultaneamente → `AbortError: Lock was stolen`. O ErrorBoundary captura, mostra "ERRO DE INICIALIZAÇÃO" e o botão "Voltar para login" não funciona porque o `recoverApp` tenta `signOut` que **também precisa do lock**, falhando em loop.

**Correção** em `src/integrations/supabase/client.ts`:
1. Trocar `storage: localStorage` pelo `safariStorage` adapter já existente em `src/lib/safariStorage.ts` (mais resiliente).
2. Adicionar `storageKey: 'anaac-auth'` para isolar do default e evitar colisões com outras abas/projetos Lovable no mesmo domínio.
3. Adicionar `lock: (name, acquireTimeout, fn) => fn()` — desabilita o navigator.locks (que é a fonte do "Lock was stolen"). Sem lock, o pior caso é uma corrida benigna no refresh de token, que o próprio SDK absorve.
4. Em `src/lib/recoverApp.ts`: envolver `supabase.auth.signOut()` em try/catch que IGNORA `AbortError` e segue para limpar storage manualmente (já faz, mas hoje aguarda o signOut antes — vamos paralelizar e dar timeout de 1.5s).
5. Em `src/main.tsx`: filtrar `AbortError: Lock was stolen` no `unhandledrejection` para NÃO mostrar a tela vermelha (é benigno após a correção).

## Bug 3 — Chama "congelada" em dia de descanso após treino

**Causa raiz**: Investigando o código, na verdade **não existe lógica de "dia de descanso programado"** no banco — o `useFlameState` decide o estado da chama olhando só `community_posts` (não `workouts`):

```ts
// useFlameState.ts:50
if (activeDates.has(today) || activeDates.has(yesterday)) computedState = "ativa";
else if (streak > 0) computedState = "frozen";
```

Ou seja: a aluna **finalizou o treino**, isso atualizou `flame_status.streak` (Treinos.tsx:222), MAS ela **não publicou o post na comunidade**. Como o estado da chama deriva de posts (não de workouts), o estado virou/permaneceu `frozen`. O `VictoryCard` então renderiza "CHAMA CONGELADA" em azul.

Isso é uma **inconsistência de fonte da verdade**: streak vem de `flame_status.streak` (atualizado por workout), mas state vem de `community_posts` (só post). Em qualquer cenário onde a aluna treina mas não posta, vê chama congelada apesar de ter aumentado dias ativos.

**Correção** em `src/hooks/useFlameState.ts`:
1. Mudar o cálculo do `state`: considerar **`workouts.finished_at` E `community_posts.created_at`** como sinais de atividade do dia (união dos dois sets).
2. Manter `isoToLocalDate` para timezone correto (BRT).
3. Buscar `workouts` em paralelo aos `posts` no `queryFn`.
4. Atualizar `streak = activeDates.size` continua, mas agora `activeDates` é a união de dias com post OU treino.

Resultado: aluna que treina sem postar verá chama **ATIVA** + streak correto. Aluna que só posta também ativa. A "trilha 7 dias" da Comunidade já considera workouts (verificado em mensagem anterior).

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/integrations/supabase/client.ts` | safariStorage + storageKey + lock=noop |
| `src/lib/recoverApp.ts` | timeout no signOut + ignorar AbortError |
| `src/main.tsx` | filtrar AbortError no unhandledrejection |
| `src/pages/AuthPage.tsx` | usar useAuth().signIn + retry + tradução de erro |
| `src/hooks/useFlameState.ts` | união workouts+posts para state e streak |

## Ordem de execução

1. Bugs 1 e 2 (impeditivos de acesso) em uma única leva.
2. Bug 3 logo depois.
3. Pedir teste end-to-end no mobile real (não basta preview).

