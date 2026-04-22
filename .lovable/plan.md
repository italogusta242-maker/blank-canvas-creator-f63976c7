

## Plano: Corrigir bug de timezone no trilho "Esta Semana"

### Diagnóstico revisado

Você confirmou que **os labels dos dias estão corretos** (D S T Q Q S S aparecem nas posições certas). O problema é apenas no **mapeamento dos posts → slot do dia**:

- Postou ontem (segunda 21h37 BRT) → check apareceu no domingo
- Postou sábado à noite → slot ficou congelado

### Causa raiz

Em `src/pages/Comunidade.tsx` linha 270, a chave de cada slot do trilho é gerada com `toISOString().split("T")[0]`, que retorna data em **UTC**. Como BRT é UTC-3, qualquer abertura do app após 21h faz a data UTC adiantar 1 dia.

Já a comparação dos posts (linha 290) usa `isoToLocalDate()` que retorna data **local BRT correta**. Resultado: os dois lados não casam, o post cai no slot errado (geralmente o anterior).

A label visual usa `getDay()` em horário local separadamente, por isso ela continua certa — só o `date` interno está deslocado.

### Correção em `src/pages/Comunidade.tsx`

**1. Importar `toLocalDate`** (já existe `isoToLocalDate` no import de `@/lib/dateUtils`):
```typescript
import { isoToLocalDate, toLocalDate } from "@/lib/dateUtils";
```

**2. Geração dos 7 dias em horário local** (linhas 267-271):
```typescript
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (6 - i));
  return { date: toLocalDate(d), obj: d };
});
```

**3. Comparação `isPast` baseada em data local** (linhas 300-304):
```typescript
const todayLocal = toLocalDate(new Date());
// dentro do map:
const isPast = day.date < todayLocal;
```

**4. Remover exceção de domingo** (linha 305) — você confirmou que pode congelar igual aos outros:
```typescript
const frozen = !active && isPast;
```

### Resultado esperado

- Post feito segunda 21h37 BRT → check aparece no slot **S** (segunda), não mais no domingo
- Post feito sábado à noite → check aparece no slot **S** (sábado), não mais congelado
- Domingo congela normalmente quando não há atividade
- Funciona em qualquer horário do dia, sem deslocamento UTC

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Comunidade.tsx` | Import de `toLocalDate`; geração local dos 7 dias; `isPast` por string local; remoção da exceção `!isSunday` |

Sem mudanças de banco. Mudança isolada de baixo risco — só afeta o trilho visual "Esta Semana".

