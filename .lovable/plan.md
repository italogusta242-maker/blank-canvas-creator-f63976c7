

## Plano: Sistema de Notificações Completo

### Problemas Atuais

1. **Broadcast não funciona corretamente** — O AdminAvisos tenta chamar a edge function diretamente do frontend para cada usuário (49 chamadas separadas). A lógica de "batching" tem um bug: cria todas as promises de uma vez e depois tenta fatiar, mas já foram iniciadas. Além disso, broadcasts não criam registros na tabela `notifications`, então o trigger de push não dispara.

2. **Cron `motivational-notifications` ainda ativo** — Dois cron jobs (19h e 22h BRT) continuam disparando notificações automáticas de "flame_rescue" que você pediu para remover.

3. **Não existe sistema de agendamento** — Sem tabela ou UI para programar notificações.

### Alterações

**1. Remover cron motivational-notifications**
- SQL: `SELECT cron.unschedule('motivational-notifications-19h'); SELECT cron.unschedule('motivational-notifications-22h');`
- Deletar `supabase/functions/motivational-notifications/index.ts`

**2. Corrigir broadcast — usar o trigger do banco**
- Em vez de chamar a edge function 49 vezes do frontend, o broadcast vai inserir um registro na tabela `notifications` para CADA usuário ativo
- O trigger `push_on_notification_insert` (que já funciona) cuida do push automaticamente
- Isso garante que broadcast funcione igual ao individual

**3. Criar tabela `scheduled_notifications`**
```sql
CREATE TABLE scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  recipient_mode text NOT NULL DEFAULT 'all', -- 'all' ou user_id
  target_user_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);
```

**4. Criar edge function `send-scheduled-notifications`**
- Busca notificações com `status = 'pending'` e `scheduled_at <= now()`
- Para cada uma: insere na tabela `notifications` (para individual) ou insere para todos os usuários ativos (para broadcast)
- Marca como `sent`

**5. Criar cron job para disparar a cada 5 minutos**
- Chama a edge function `send-scheduled-notifications`

**6. Criar sistema de "Pool de Mensagens" (rotação)**
- Nova tabela `notification_templates`:
```sql
CREATE TABLE notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'geral', -- 'motivacional', 'lembrete', 'engajamento'
  created_at timestamptz DEFAULT now()
);
```
- O admin cadastra várias mensagens no pool
- Ao agendar, pode selecionar "Escolher do pool" que pega uma mensagem aleatória da categoria

**7. Redesenhar AdminAvisos com abas**
- **Aba "Enviar Agora"** — funcionalidade atual (corrigida)
- **Aba "Agendar"** — selecionar data/hora, destinatário, mensagem (manual ou do pool)
- **Aba "Pool de Mensagens"** — CRUD de templates organizados por categoria
- **Aba "Histórico"** — histórico unificado (enviados + agendados)

### Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/AdminAvisos.tsx` | Redesenhar com abas |
| `supabase/functions/send-scheduled-notifications/index.ts` | Nova edge function |
| `supabase/functions/motivational-notifications/index.ts` | Deletar |
| Migração SQL | Criar tabelas + cron + remover crons antigos |

### Resultado

- Push funciona de verdade para broadcast e individual
- Admin pode agendar notificações para qualquer horário
- Pool de mensagens permite variar o conteúdo sem repetir
- Crons automáticos antigos removidos

