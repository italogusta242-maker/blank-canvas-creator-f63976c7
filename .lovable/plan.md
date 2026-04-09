

## Plano: Garantir que o banner de push/instalação apareça para alunas

### Problema

O `PushPermissionBanner` tem condições que podem impedir sua exibição:

1. **iOS Safari (não PWA)**: `PushManager` não existe fora do modo standalone no iOS. O hook retorna `"unsupported"` e o banner nunca aparece.
2. **Android Chrome**: O evento `beforeinstallprompt` pode demorar a disparar. Se `isInstallable` for `false` e `pushState` for `"prompt"`, o banner de push aparece — mas se `beforeinstallprompt` disparar, muda para o banner de instalação (que some ao dismiss sem persistir).
3. **Dismiss sem persistência**: O dismiss não persiste no localStorage (por design), mas numa mesma sessão a aluna pode ter dismissado sem perceber.

### Correções

| Arquivo | Mudança |
|---------|---------|
| `src/components/PushPermissionBanner.tsx` | Adicionar modo iOS: quando `pushState === "unsupported"` e é iOS, mostrar banner com botão que leva para `/instalar` (tutorial de PWA) em vez de esconder completamente |
| `src/hooks/usePushNotifications.ts` | Nenhuma mudança necessária |

### Detalhes

No `PushPermissionBanner.tsx`:
- Detectar iOS + `pushState === "unsupported"` como um terceiro modo: **"iOS install guide"**
- Nesse modo, mostrar texto "Para receber notificações, instale o app" com botão "Como instalar" que navega para `/instalar`
- Manter os modos existentes para Android (install via `beforeinstallprompt`) e push (quando PushManager existe)
- Isso garante que **em qualquer cenário**, a aluna vê alguma forma de ativação

### Resultado

Todas as alunas verão o banner: Android mostra instalação/push nativo, iOS mostra tutorial de instalação manual.

