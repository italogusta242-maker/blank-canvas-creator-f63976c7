

## Plano: Botão "Instalar App" fixo no Dashboard

### O que será feito

Um banner/card na Dashboard (abaixo do Hero, acima dos goals) com botão "Instalar Aplicativo". Ele desaparece automaticamente quando o app já está instalado (standalone) ou logo após a instalação (evento `appinstalled`).

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useIsAppInstalled.ts` | **Novo** — hook que retorna `true` se standalone ou após `appinstalled` |
| `src/pages/Dashboard.tsx` | Importar hook + `usePushNotifications`; renderizar card de install entre Hero e DailyGoals (mobile e desktop) |

### Detalhes

**`useIsAppInstalled.ts`**
- Checa `matchMedia("(display-mode: standalone)")` e `navigator.standalone`
- Escuta evento `appinstalled` para sumiço instantâneo
- Retorna `boolean`

**`Dashboard.tsx`**
- Importar `useIsAppInstalled`, `usePushNotifications` (para `isInstallable` + `installPWA`), `useNavigate`, `detectPlatform`
- Entre o `<DashboardHero>` e o grid de goals, renderizar condicionalmente (só se `!isInstalled && platform !== "standalone"`):
  - Card com ícone Download, texto "Instale o app para uma experiência completa", botão "Instalar Aplicativo"
  - `onClick`: se `isInstallable` → `installPWA()`, senão → `navigate("/instalar")`
  - Botão X para dismiss (localStorage cooldown 7 dias)
  - Estilo: `bg-card border border-border rounded-2xl p-4` com gradiente sutil
- Mesmo card no layout desktop

