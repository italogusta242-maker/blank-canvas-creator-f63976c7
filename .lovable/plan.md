

## Plano: Corrigir sistema de push notifications end-to-end

### Problemas encontrados

1. **Coluna `keys` NOT NULL sem default** — A tabela `push_subscriptions` tem uma coluna `keys` (jsonb, NOT NULL) sem default. O edge function insere `p256dh` e `auth` como colunas separadas mas nunca preenche `keys`, fazendo o INSERT/UPSERT falhar silenciosamente.

2. **Edge function precisa re-deploy** — A tabela `app_settings` está vazia (sem VAPID keys), indicando que a edge function nunca executou com sucesso.

3. **Banner dismiss permanente** — Se a aluna fechou o banner uma vez, `localStorage` guarda `push_banner_dismissed = "true"` pra sempre, mesmo que nunca tenha ativado. Deveria só persistir quando `pushState === "granted"`.

### Correções

| # | O que | Como |
|---|-------|------|
| 1 | **Migração SQL** | `ALTER TABLE push_subscriptions ALTER COLUMN keys SET DEFAULT '{}'::jsonb;` — permite o upsert funcionar mesmo sem preencher `keys` |
| 2 | **Re-deploy edge function** | Forçar deploy da `push-notifications` para garantir que está ativa |
| 3 | **`PushPermissionBanner.tsx`** | Remover persistência do dismiss no localStorage — dismiss só dura a sessão (state local). Persistir dismiss APENAS quando `pushState === "granted"` |
| 4 | **`push-notifications/index.ts`** | Também preencher a coluna `keys` no upsert com `JSON.stringify({p256dh, auth})` para robustez |

### Resultado

- Banner aparece para toda aluna que não ativou notificações
- Ao clicar "Ativar", solicita permissão do navegador → registra subscription no banco
- Admin vê o contador real em "Sininho ativado" na aba Avisos

