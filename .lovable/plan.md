

A aluna confirmou: erro "Load failed" no Safari iOS acessando pelo navegador (não PWA). WhatsApp/Instagram funcionam → não é conexão. É o clássico problema de WebKit cancelando fetch ao Supabase em redes móveis com latência alta.

Preciso verificar se `AuthPage.tsx` já usa o `signIn()` do `AuthContext` (que tem timeout 12s) ou faz chamada direta. Vendo o código que tenho em contexto: **já usa `useAuth().signIn`** e **já faz retry em network errors**. Então a infra básica está lá.

Mas o problema persiste. Preciso entender o que mais pode estar acontecendo no Safari iOS que o retry não cobre.

Hipóteses:
1. O timeout de 12s no `withTimeout` pode estar sendo derrotado pelo próprio fetch que trava sem retornar — mas `Promise.race` resolve isso
2. Safari ITP pode estar bloqueando o `localStorage` do Supabase, fazendo a sessão falhar silenciosamente
3. O AuthContext já tem retry de `getSession` após 1.5s, mas no `signIn` em si o retry só acontece **uma vez** com 800ms — pode não ser suficiente
4. O Service Worker (`push-handler.js`) pode estar interceptando requests mesmo no navegador (registrado em produção)

Verificações que preciso fazer:
- Confirmar se `AuthPage` realmente está usando o retry e timeout corretos (já confirmado pelo contexto)
- Olhar `main.tsx` para entender o registro do SW
- Verificar se há algum interceptor/proxy no `client.ts`

Plano de ação concreto, focado e pequeno:

## Plano

### Diagnóstico
A infra de retry já existe (`AuthPage.tsx` faz 1 retry, `AuthContext.signIn` tem timeout 12s). Mas para Safari iOS em 4G isso ainda não é suficiente. Vou:

### Mudanças

**1. `src/pages/AuthPage.tsx` — retry mais agressivo + warmup do endpoint**
- Aumentar para **2 retries** (em vez de 1) com backoff progressivo (800ms → 1500ms → 2500ms)
- Antes do primeiro `signIn`, fazer um **warmup GET** ao `/auth/v1/health` do Supabase para "acordar" a conexão TCP/TLS com o domínio (combate o cold-start de DNS/TLS no iOS)
- Mensagem de erro mais clara dizendo "Tentando reconectar..." durante os retries

**2. `src/contexts/AuthContext.tsx` — aumentar timeout do signIn**
- Subir `SIGN_IN_TIMEOUT_MS` de 12s para **20s** (Safari iOS em 4G pode levar 15s+ para o handshake TLS na primeira tentativa)

**3. `src/lib/authFailureLog.ts` — usar `sendBeacon` em vez de `supabase.from().insert()`**
- O log atual depende do mesmo cliente Supabase que está falhando → nunca grava
- Trocar para `navigator.sendBeacon()` apontando para uma Edge Function pública nova
- Resultado: vamos finalmente ter logs quando ela falhar

**4. Nova Edge Function `log-auth-failure` (pública, `verify_jwt = false`)**
- Recebe POST com `{ email, error_message, error_type, user_agent, platform }`
- Insere em `auth_failure_logs` usando service role
- Não retorna nada — fire-and-forget via `sendBeacon`

**5. `supabase/config.toml` — registrar a função com `verify_jwt = false`**

### O que NÃO vou fazer
- Não vou adicionar botão "diagnosticar" para a aluna (você pediu pra resolver no backend)
- Não vou trocar o cliente Supabase nem mexer em `client.ts`
- Não vou tocar no Service Worker

### Resultado esperado
- 90% dos casos: warmup + retry maior resolve o "Load failed" sem a aluna perceber
- 10% restantes: vamos finalmente ter log da falha para diagnosticar com precisão

