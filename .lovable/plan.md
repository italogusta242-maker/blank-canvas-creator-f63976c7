

## Plano: Remodelar a página de Avisos Gerais → Central de Notificações

### O que muda

1. **Renomear** "Avisos Gerais" → "Notificações" no sidebar e "Central de Broadcast" → "Central de Notificações" no título da página
2. **Remover** cards de "Sininho ativado" e "Alunas ativas", e o campo de "Conteúdo Rico (Markdown)"
3. **Adicionar seletor de destinatário**: toggle entre "Todas as alunas" e "Aluna específica", com um dropdown de busca de alunas (profiles com status ativo)
4. **Lógica de envio**:
   - "Todas" → insere em `broadcast_notifications` (como hoje)
   - "Aluna específica" → insere em `notifications` com o `user_id` selecionado

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/admin/AdminAvisos.tsx` | Reescrever: remover stats/markdown, adicionar seletor de destinatário com busca, dois modos de envio |
| `src/components/admin/AdminLayout.tsx` | Mudar label de "Avisos Gerais" para "Notificações" (linha 36) |

### Detalhes do seletor de destinatário

- Radio/toggle: "Todas as alunas" (default) vs "Aluna específica"
- Quando "Aluna específica": input de busca que filtra `profiles` por `full_name` ou `email`, mostra dropdown com avatar + nome
- Ao disparar para aluna específica: `supabase.from("notifications").insert({ user_id, title, body, type: "admin_broadcast" })`

### Migração SQL

Necessária uma policy de INSERT na tabela `notifications` para admins, já que atualmente só edge functions (service role) podem inserir:

```sql
CREATE POLICY "notif_insert_admin" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (has_role('admin'::app_role, auth.uid()));
```

### Formulário simplificado

- Título da Notificação (obrigatório)
- Mensagem (obrigatório) — campo textarea, sem markdown
- Destinatário: Todas / Aluna específica
- Botão: "Disparar para Todos" ou "Enviar para [Nome]"

### Histórico

Mantém o histórico de broadcasts. Quando envio individual, mostra no histórico também (buscar de ambas as tabelas ou só manter broadcasts).

