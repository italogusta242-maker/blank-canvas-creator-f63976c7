

## Diagnóstico: "meu dia não contabilizou, está azul"

### O que as alunas relataram (print)
- **Renata Ricci**: "meu não contabilizou o de **segunda** (13/04), por isso está azul"
- **Fernanda**: "meu não contabilizou o de **terça** (14/04), tá azul. Eu postei"

### Verificação no banco

Confirmei consultando `community_posts` com timezone BRT vs UTC:

| Aluna | Post em BRT | Salvo no banco (UTC) | Bug |
|---|---|---|---|
| Renata | Domingo 13/04 às 21:12 | `2026-04-14 00:12 UTC` | Vira **terça 14** no UI |
| Fernanda | Segunda 12/04 às 22:49 | `2026-04-13 01:49 UTC` | Vira **terça 13** no UI |
| Fernanda | Quarta 15/04 às 22:13 | `2026-04-16 01:13 UTC` | Vira **quinta 16** no UI |

Posts feitos **após 21h no horário de Brasília** (BRT = UTC-3) viram o dia seguinte em UTC. O trilho "7 dias" da Comunidade mostra o dia errado como inativo (azul) e o seguinte como ativo.

### Causa raiz (linha 288-289 de `src/pages/Comunidade.tsx`)

```ts
(posts || []).forEach((p) => { 
  const d = p.created_at?.split("T")[0];  // ❌ Usa data UTC crua
  if (d) activeDays.add(d); 
});
```

O código pega o trecho antes do "T" da string ISO (que é UTC). Para um post de domingo 21:12 BRT salvo como `2026-04-14T00:12Z`, o split retorna `"2026-04-14"` (terça), não `"2026-04-13"` (domingo, dia real do post).

O mesmo bug ocorre com `workouts.finished_at` na linha 289.

### Escopo

Afeta **todas as alunas que postaram entre 21h-23:59 BRT**. Não é só Renata e Fernanda — é qualquer post noturno. Os outros componentes corretos (`useStreak`, `useFlameState`, `GymRatsTab` recém-corrigido) também usam `.split("T")[0]` cru, então têm o mesmo bug latente — mas o impacto é menor lá porque contam apenas dias únicos totais, não associam a dias da semana.

Mais grave: na **trilha de 7 dias** o usuário vê visualmente o "dia errado" colorido.

### Plano de correção

1. **Criar helper `toLocalDate(isoString)`** em `src/lib/dateUtils.ts` (já existe `toLocalDate(Date)` — adicionar overload para string ISO) que converte UTC → data local BRT antes de extrair YYYY-MM-DD.

2. **Corrigir `src/pages/Comunidade.tsx`** (trilha 7 dias) — substituir os dois `.split("T")[0]` por `toLocalDate(parseSafeDate(...))`. Também ajustar o intervalo de busca para incluir 3h extras de margem (posts de 21-23:59 BRT = UTC do dia seguinte).

3. **Corrigir `src/components/comunidade/GymRatsTab.tsx`** (linha que monta `flameMap`) — mesma correção, para o ranking de Ofensiva contar dias únicos pelo BRT real.

4. **Corrigir `src/hooks/useStreak.ts` e `src/hooks/useFlameState.ts`** — mesma correção, para consistência total entre figurinha, ranking e perfil.

### Verificação pós-fix

Re-rodar a query mental:
- Renata domingo 13/04 21:12 BRT → trilha mostra **domingo aceso** (não terça)
- Fernanda segunda 12/04 22:49 BRT → trilha mostra **segunda acesa** (não terça)
- Streak total não muda (mesmo número de dias únicos), mas a **distribuição visual** fica correta.

