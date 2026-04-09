

## Plano: Figurinha no Perfil + Botão Instalar + Push Subscriptions

### Contexto

O desafio está no dia 2. Três problemas urgentes:
1. Alunas não conseguem baixar a "figurinha" (sticker de dias ativos) fora do fluxo de treino
2. O botão "Instalar" do PWA não aparece no app publicado
3. O admin mostra 0 sininhos ativados — e de fato há 0 registros em `push_subscriptions` (confirmado via query direta). O service worker só se registra fora de iframe/preview, mas o fluxo de push depende de: SW registrado → permissão concedida → fetch VAPID key → subscribe → POST subscription ao backend. Qualquer falha silenciosa nessa cadeia impede o registro.

---

### 1. Figurinha no Perfil (Prioridade 1)

**O que muda:** No `Perfil.tsx`, o bloco "Dias Ativos" (linha ~459-462) vira clicável. Ao tocar, abre um modal/sheet com um card visual (estilo VictoryCard simplificado) mostrando nome da aluna, avatar, dias ativos e chama. Botão "Baixar Figurinha" gera PNG via `html2canvas` e faz download direto.

**Arquivos:**
- Criar `src/components/ActiveDaysSticker.tsx` — componente que renderiza o card visual + lógica de `html2canvas` + download (reutilizando o padrão do VictoryCard)
- Editar `src/pages/Perfil.tsx` — ao clicar em "Dias Ativos", abre o Sheet com o `ActiveDaysSticker`

**Lógica do download:**
- Usar `html2canvas` para capturar o card
- `canvas.toBlob()` → criar URL → `<a download>` click programático (mesmo padrão do VictoryCard que já funciona)
- Fallback: se clipboard disponível, oferecer "Copiar" também

---

### 2. Botão de Instalação PWA (Prioridade 2)

**Diagnóstico:** O `PWAInstallBanner` e o `PushPermissionBanner` dependem de `beforeinstallprompt`, que só dispara se:
- O site tem manifest.json válido com ícones ✓
- O site é servido via HTTPS ✓  
- Há um service worker registrado ✓ (push-handler.js)
- O usuário **não** está já em standalone mode ✓

O banner aparece após 3s, mas **apenas se `isInstallable` for true** (vindo do hook). O `beforeinstallprompt` só dispara no Chrome/Edge Android — nunca no iOS Safari (tratado separadamente) e nunca no Firefox.

**Problema provável:** No domínio publicado `anaacclub.lovable.app`, o SW pode estar falhando silenciosamente (ex: arquivo não encontrado, scope errado), impedindo o `beforeinstallprompt`.

**Correções:**
- Adicionar logs de diagnóstico temporários no `PushPermissionBanner` e no `usePushNotifications` para entender o estado real no device da aluna
- Garantir que o banner iOS (instruções manuais) funcione independentemente — atualmente ele já detecta iOS, mas o banner pode estar sendo escondido pelo `localStorage` dismiss
- No `PushPermissionBanner`: mostrar o banner de "Instalar" com instruções manuais para **todos** os mobile browsers (não só iOS Safari), caso `beforeinstallprompt` não dispare em 5s. Texto: "Adicione à tela inicial pelo menu do navegador"

**Arquivos:**
- Editar `src/components/PushPermissionBanner.tsx` — fallback para instrução manual se `beforeinstallprompt` não disparou
- Editar `src/components/PWAInstallBanner.tsx` — mesma lógica de fallback

---

### 3. Push Subscriptions = 0 (Prioridade 3)

**Diagnóstico confirmado:** A tabela `push_subscriptions` tem 0 registros. Não há nenhum log de chamada à edge function `push-notifications`. Isso significa que nenhuma aluna completou o fluxo: SW register → requestPermission → registerSubscription.

**Causas prováveis:**
- O banner de push só aparece se `!isInstallable` (ou seja, se o beforeinstallprompt não disparou E não é iOS). Se `isInstallable` for true, ele mostra "Instalar" em vez de "Ativar notificações"
- Após instalar, o banner de push não reaparece automaticamente
- O `requestPermission()` pode estar falhando silenciosamente no `registerSubscription` (fetch VAPID key pode dar erro de CORS ou 500)

**Correções:**
- No `PushPermissionBanner`: após instalação bem-sucedida, mostrar imediatamente o prompt de push (segundo passo)
- Adicionar `console.error` detalhado em cada etapa do `registerSubscription` para diagnóstico
- No `AdminAvisos.tsx`: adicionar um card de diagnóstico que mostra se a edge function `push-notifications` está respondendo (teste ao vivo com `?action=vapid-key`)

**Arquivos:**
- Editar `src/hooks/usePushNotifications.ts` — melhorar logs de erro em cada etapa
- Editar `src/components/PushPermissionBanner.tsx` — fluxo sequencial: instalar → push
- Editar `src/pages/admin/AdminAvisos.tsx` — botão de diagnóstico de push

---

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/ActiveDaysSticker.tsx` | **Novo** — card visual + download PNG |
| `src/pages/Perfil.tsx` | Dias Ativos clicável → abre sticker sheet |
| `src/components/PushPermissionBanner.tsx` | Fallback manual para install + fluxo sequencial push |
| `src/components/PWAInstallBanner.tsx` | Fallback instrução manual mobile |
| `src/hooks/usePushNotifications.ts` | Logs detalhados de diagnóstico |
| `src/pages/admin/AdminAvisos.tsx` | Botão de diagnóstico de push |

