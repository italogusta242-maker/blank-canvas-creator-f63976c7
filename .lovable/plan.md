

## Plano: Instalação PWA Inteligente (Detecção de Plataforma)

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/lib/detectPlatform.ts` | **Novo** — helper de detecção |
| `src/components/PWAInstallBanner.tsx` | Usar `detectPlatform`, adicionar cenário webview |
| `src/pages/InstalarApp.tsx` | Tutorial visual adaptativo por plataforma |

### Detalhes

**`src/lib/detectPlatform.ts`**
- Função pura que retorna `"standalone"`, `"ios-safari"`, `"ios-webview"`, `"android-chrome"`, `"android-webview"` ou `"desktop"`
- Regex do Gemini para webviews: `Instagram|FBAV|FBAN|WhatsApp|TikTok|musical_ly|Twitter|LinkedIn|wv`
- iOS = `/iPad|iPhone|iPod/` sem MSStream; Safari = sem chrome/crios/fxios no UA

**`PWAInstallBanner.tsx`** — Substituir detecção manual por `detectPlatform()`:
- `"standalone"` → não mostrar
- `"ios-webview"` / `"android-webview"` → mensagem "Abra no navegador" com instrução específica (Android: "3 pontinhos → Abrir no Chrome"; iOS: "ícone Safari ou 3 pontinhos → Abrir no navegador")
- `"ios-safari"` → instruções atuais (Compartilhar → Adicionar à Tela)
- `"android-chrome"` + `isInstallable` → botão install nativo
- `"desktop"` → botão install se disponível
- Manter cooldown 24h e delay 3s

**`InstalarApp.tsx`** — De página morta para tutorial dinâmico:
- Chamar `detectPlatform()` no mount
- Renderizar o cenário correto automaticamente:
  - **iOS Safari**: Ícone Share (↑) → "Adicionar à Tela Inicial" com passos numerados
  - **Android Chrome**: "Toque nos 3 pontinhos → Instalar app" ou "Adicionar à tela inicial"
  - **Webview**: "Você está acessando por dentro de outro app. Toque nos 3 pontinhos e escolha 'Abrir no Chrome/Safari'"
  - **Standalone**: "Você já instalou o app! ✓"
  - **Desktop**: Instruções genéricas + botão install se disponível
- Manter botão "Voltar" para `/`
- Visual limpo com ícones Lucide para cada passo

