

## Plano: Remover popups de instalação + Adicionar opção nos 3 pontinhos do Perfil

### O que muda

1. **Remover todos os popups/banners de instalação PWA**
2. **Adicionar "Instalar App" no menu de 3 pontinhos do Perfil**
3. **Investigar e corrigir o bug de download/instalação**

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Remover card de instalação (mobile + desktop), remover imports `useIsAppInstalled`, `usePushNotifications`, `detectPlatform`, `Download`, e toda lógica `showInstallCard`/`installDismissed`/`handleInstallClick`/`dismissInstall` |
| `src/components/AppLayout.tsx` | Remover `<PWAInstallBanner>` e `<PushPermissionBanner>` + imports relacionados |
| `src/pages/Perfil.tsx` | Adicionar `DropdownMenuItem` "Instalar App" com ícone `Download` no menu dos 3 pontinhos. Importar `useIsAppInstalled`, `usePushNotifications`, `useNavigate`, `detectPlatform`. Só exibir o item se `!isAppInstalled && platform !== "standalone"`. `onClick`: se `isInstallable` → `installPWA()`, senão → `navigate("/instalar")` |

### Detalhes do Perfil (menu 3 pontinhos)

Antes de "Editar Perfil", adicionar:
```
<DropdownMenuItem onClick={handleInstallClick} className="gap-2 cursor-pointer">
  <Download size={15} /> Instalar App
</DropdownMenuItem>
```

Condicionalmente renderizado apenas quando o app ainda não foi instalado.

### Bug de download

O `installPWA()` vem do `usePushNotifications` e depende do `deferredPrompt` capturado via `beforeinstallprompt`. Se o prompt não foi capturado (iOS, webview, ou Chrome que não disparou o evento), `deferredPrompt` é null e `installPWA()` retorna sem fazer nada silenciosamente. O fallback correto (navegar para `/instalar`) já existe na lógica `handleInstallClick`, que será movida para o Perfil.

