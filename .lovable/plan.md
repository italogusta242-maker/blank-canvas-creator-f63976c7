

## Plano: Corrigir crash na Comunidade (build error + tela branca)

### Causa Raiz

O erro de build em `src/pages/Comunidade.tsx` linha 282 é o que causa a tela branca no Safari (e em qualquer browser em produção):

- `useStreak()` retorna um **objeto** `{ streak: number, flameState: string }`, não um número.
- Linha 178: `const { data: currentStreak = 0 } = useStreak()` — o fallback `0` só é usado quando `data` é `undefined`. Quando a query resolve, `currentStreak` vira `{ streak: 5, flameState: "ativa" }`.
- Linha 282: `{currentStreak}` tenta renderizar um objeto como ReactNode → crash.
- Linha 282: `currentStreak === 1` compara objeto com número → sempre false (e TypeScript reporta o erro).

O build falha, o app não carrega, e o ErrorBoundary global mostra "O app encontrou um erro ao carregar".

### Correção

**Arquivo:** `src/pages/Comunidade.tsx`, linha 178

Mudar de:
```typescript
const { data: currentStreak = 0 } = useStreak();
```

Para:
```typescript
const { data: streakData } = useStreak();
const currentStreak = streakData?.streak ?? 0;
```

Isso extrai o número do streak corretamente do objeto retornado. Nenhuma outra linha precisa mudar — `currentStreak` volta a ser `number` e as comparações e renderizações funcionam.

### Outros erros de build mencionados

Os erros em `supabase/functions/audit-repair-users/index.ts` e `verify-bypass-email/index.ts` são edge functions Deno — não afetam o build do frontend Vite. Podem ser ignorados neste momento.

