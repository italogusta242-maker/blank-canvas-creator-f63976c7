

## Plano: Banner PWA sempre visível no Android + anti-pisca

### Mudança única

**`src/components/PWAInstallBanner.tsx`**

1. **Visibilidade**: Adicionar `p === "android-chrome"` à condição de exibição (linha ~33) para que o banner apareça mesmo sem `beforeinstallprompt`

2. **renderContent para android-chrome**: Quando `isInstallable` é `false`, mostrar instruções manuais ("Toque nos ⋮ e selecione Instalar app"). Quando `true`, mostrar botão "Instalar Agora" (já funciona)

3. **Anti-pisca**: Manter altura fixa (`min-h-[120px]`) no container interno para que a troca de texto→botão não empurre o layout

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/components/PWAInstallBanner.tsx` | Condição de visibilidade + fallback manual Android + altura fixa |

