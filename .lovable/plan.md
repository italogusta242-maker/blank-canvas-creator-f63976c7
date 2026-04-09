

## Plano: Corrigir sistema de Push Notifications (sininho mostrando zero)

### Diagnóstico

O "sininho ativado" mostra 0 porque a tabela `push_subscriptions` está genuinamente vazia. A cadeia está quebrada em múltiplos pontos:

1. **Edge Function nunca foi chamada** — zero logs no `push-notifications`, o que significa que nunca foi deployada ou nunca respondeu
2. **Falta unique index** — o upsert usa `onConflict: "user_id,endpoint"` mas não existe constraint unique nesses campos, causando falha
3. **VAPID keys nunca foram geradas** — `app_settings` não tem registro de VAPID
4. **Service Worker só registra no domínio publicado** — no preview do Lovable, o SW é desregistrado (comportamento correto, mas impede testes no preview)

### Correções

| # | Arquivo/Ação | Mudança |
|---|-------------|---------|
| 1 | **Migração SQL** | Criar unique index em `push_subscriptions(user_id, endpoint)` para o upsert funcionar |
| 2 | **Deploy Edge Function** | Forçar re-deploy da `push-notifications` (fazer qualquer mudança trivial para triggerar deploy automático) |
| 3 | **`src/hooks/usePushNotifications.ts`** | Adicionar logs de erro mais visíveis (console.error) quando VAPID key fetch falha, para facilitar debug futuro |
| 4 | **Teste no domínio publicado** | Após deploy, testar no `anaacclub.lovable.app` (o push só funciona lá, não no preview) |

### Detalhes técnicos

**Migração SQL:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx 
ON public.push_subscriptions(user_id, endpoint);
```

**Edge Function re-deploy:**
Adicionar um comentário ou atualizar timestamp no `push-notifications/index.ts` para forçar o deploy automático do Lovable.

**Melhoria no hook:**
No `registerSubscription`, trocar o `return` silencioso por `console.error` + `toast.error` quando o VAPID fetch falha, para que o admin consiga ver quando algo dá errado.

### Resultado esperado

Após as correções e deploy, quando uma aluna acessar `anaacclub.lovable.app`, aceitar notificações, a subscription será salva na tabela e o contador do admin refletirá o número real.

