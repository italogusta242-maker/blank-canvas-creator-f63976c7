

## Diagnóstico Completo para o Lançamento

### Problemas Encontrados

**1. Sem manifest.json — Instalação PWA não funciona**
Não existe um arquivo `manifest.json` no projeto. Sem ele:
- Android: o evento `beforeinstallprompt` nunca dispara, então `isInstallable` fica sempre `false` e o botão "Instalar" nunca aparece
- iOS Safari: o `PWAInstallBanner` detecta iOS e mostra instruções manuais, mas sem manifest o "Adicionar à Tela Inicial" não cria um app standalone
- O service worker `push-handler.js` é registrado mas sem manifest ele opera como SW genérico, não como PWA

**2. Sem cron jobs configurados**
A extensão `pg_cron` não está habilitada (tabela `cron.job` não existe). Isso significa:
- `daily-flame-check` (00:00 BRT) — NÃO roda automaticamente
- `motivational-notifications` (19h e 22h BRT) — NÃO roda automaticamente
- O flame/streak vai acumular sem nunca ser processado

**3. Email de autenticação**
O domínio `www.anaacclub.com.br` está configurado como domínio customizado, mas não há domínio de email configurado. Os emails de autenticação (redefinição de senha, confirmação) estão usando o remetente padrão da Lovable, que funciona mas vai como `noreply@lovable...`.

**4. Push Notifications — estrutura OK, 0 inscritos**
O fluxo técnico está correto (VAPID keys, push-handler.js, edge function). O problema é que sem o manifest.json + PWA instalada, o banner de push nunca aparece no fluxo correto. Mesmo assim, no navegador desktop/Android Chrome o push pode funcionar se a aluna aceitar.

---

### Plano de Correção

**Etapa 1: Criar `manifest.json` (resolve instalação Android + iOS + push)**
Criar `public/manifest.json` com:
- `name`: "ANAAC Club"
- `short_name`: "ANAAC"
- `start_url`: "/"
- `display`: "standalone"
- `background_color` e `theme_color`
- Icons: usar `insano-icon-192.png` e `insano-icon-512.png` que já existem
- Adicionar `<link rel="manifest" href="/manifest.json">` no `index.html`

**Etapa 2: Habilitar pg_cron + pg_net e criar 2 cron jobs**
Migration SQL para habilitar as extensões, depois INSERT dos crons:
- `daily-flame-check`: todo dia às 03:00 UTC (00:00 BRT)
- `motivational-notifications`: às 22:00 UTC (19h BRT) e 01:00 UTC (22h BRT)

**Etapa 3: Melhorar o banner de push/instalação no iOS**
O `PWAInstallBanner` já tem lógica iOS. Mas o `PushPermissionBanner` prioriza instalação sobre push — no iOS nunca vai instalar via prompt. Ajustar para que no iOS mostre diretamente o banner de push (já que instalação é manual).

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `public/manifest.json` | Novo — manifest PWA |
| `index.html` | Adicionar `<link rel="manifest">` |
| Migration SQL | Habilitar pg_cron/pg_net + criar 3 cron jobs |
| `src/components/PushPermissionBanner.tsx` | Ajuste menor para iOS |

### O que NÃO precisa mudar
- Service worker `push-handler.js` — já está correto
- Edge function `push-notifications` — funcional
- `usePushNotifications` hook — funcional
- Emails de auth — funcionam pelo default da Lovable (alunas já estão redefinindo senha)

