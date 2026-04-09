

## Plano: Corrigir registro de push subscriptions (alunas clicam "Ativar" mas nada é salvo)

### Diagnóstico

A edge function `push-notifications?action=subscribe` funciona corretamente (testei agora — inseriu com sucesso na tabela). O problema está no **frontend**: erros são engolidos silenciosamente no hook `usePushNotifications.ts`.

Possíveis causas:
1. **Service Worker não registra** — `navigator.serviceWorker.ready` trava para sempre se o SW falhou ao registrar (ex: `push-handler.js` não encontrado no domínio custom)
2. **Fetch do subscribe falha silenciosamente** — o hook não verifica o `response.status` da chamada de subscribe, nem loga o erro
3. **VAPID key fetch falha** — se a requisição ao edge function falhar (CORS, rede), o hook retorna silenciosamente sem feedback

### Correções

**1. `src/hooks/usePushNotifications.ts` — Adicionar logging robusto e fallback**

- Adicionar `console.log` em cada etapa (SW ready, VAPID fetch, subscribe)
- Verificar `response.ok` na chamada de subscribe e logar o body de erro
- Adicionar timeout no `navigator.serviceWorker.ready` (5s) — se não resolver, logar erro e mostrar toast
- Adicionar `toast.error` quando o subscribe falha para que a aluna saiba que algo deu errado

**2. `src/main.tsx` — Garantir SW registra em todos os domínios de produção**

- A condição atual exclui `id-preview--` e `lovableproject.com`, mas pode haver edge cases. Verificar que `anaacclub.com.br` e `anaacclub.lovable.app` passam pela condição.

**3. Criar trigger automático `push_on_notification_insert`**

Conforme a arquitetura descrita, criar o trigger no banco que chama a edge function via `pg_net` a cada INSERT em `notifications`:

```sql
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://iimkmfhgjupjvrsseqro.supabase.co/functions/v1/push-notifications?action=send-to-user',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title, 'body', COALESCE(NEW.body, ''))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_notification();
```

**Nota**: O trigger usará os secrets do Vault (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`) já configurados.

**4. Limpar dado de teste** — Deletar o registro de teste que inseri em `push_subscriptions` durante o diagnóstico.

**5. `supabase/functions/push-notifications/index.ts`** — Trocar referências "Shape Insano" → "ANAAC Club".

### Arquivos a editar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.ts` | Logging robusto, timeout no SW ready, verificar response do subscribe |
| `supabase/functions/push-notifications/index.ts` | Branding "ANAAC Club" |
| Migração SQL | Trigger `push_on_notification_insert` + limpar dado de teste |

### Resultado

- Quando aluna clica "Ativar", erros são visíveis (console + toast)
- Subscriptions são salvas corretamente
- Toda notificação inserida no banco dispara push nativo automaticamente via trigger

