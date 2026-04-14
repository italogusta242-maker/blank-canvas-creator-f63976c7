

## Plano: Remover daily-flame-check

### Contexto

Após as correções anteriores, o `useFlameState` e `useStreak` calculam streak e estado **diretamente dos posts** na `community_posts`, ignorando a tabela `flame_status` para esses cálculos. O `daily-flame-check` só atualiza `flame_status.state`, que não tem mais efeito na UI.

### Alterações

**1. Deletar a Edge Function `daily-flame-check`**
- Remover `supabase/functions/daily-flame-check/index.ts`
- Remover a função deployada no backend

**2. Remover o cron job associado**
- Executar SQL para desagendar o job `daily-flame-check` do `pg_cron` (se existir)

**3. Nenhuma outra mudança necessária**
- A tabela `flame_status` continua existindo porque outros lugares ainda a usam (Treinos.tsx escreve nela ao completar treino, admin lê streak, GymRatsTab lê streak)
- Mas o "juiz da meia-noite" que congelava/zerava chamas não será mais executado

### Resultado

Nenhum processo automático altera o estado das chamas. O estado é calculado em tempo real pelos hooks do frontend baseado nos posts da comunidade.

