

## Plano: Trocar ícones PWA para ANAAC Club + limpar arquivos legados

### Problema

O `manifest.json` referencia `insano-icon-192.png` e `insano-icon-512.png` — ícones antigos do Shape Insano (o logo laranja com medalha). Além disso, existem vários arquivos legados "insano" tanto em `public/` quanto em `src/assets/`.

### O que será feito

**1. Gerar ícones PWA corretos (192x192 e 512x512) a partir do logo ANAAC**
- Usar `public/anaac-logo.png` como base para gerar `public/anaac-icon-192.png` e `public/anaac-icon-512.png` via script (ImageMagick/sharp)
- Fundo escuro (`#0a0a0a`) com o logo centralizado para ficar bonito como ícone de app

**2. Atualizar `public/manifest.json`**
- Trocar referências de `/insano-icon-192.png` → `/anaac-icon-192.png`
- Trocar referências de `/insano-icon-512.png` → `/anaac-icon-512.png`

**3. Atualizar `index.html`**
- Trocar `apple-touch-icon` de `/anaac-logo.png` para `/anaac-icon-192.png` (ícone quadrado otimizado)

**4. Deletar arquivos legados do Shape Insano**

| Arquivo | Ação |
|---------|------|
| `public/insano-icon-192.png` | Deletar |
| `public/insano-icon-512.png` | Deletar |
| `public/insano-logo-branco.svg` | Deletar |
| `public/insano-logo.png` | Deletar (se existir) |
| `src/assets/insano-logo-branco.svg` | Deletar |
| `src/assets/insano-logo.png` | Verificar se algum componente usa → redirecionar import para `anaac-logo.png` antes de deletar |
| `src/assets/insano-logo.svg` | Deletar |

**5. Corrigir imports que referenciam arquivos insano**
- `src/components/InsanoLogo.tsx` — já usa `anaac-logo.png` ✓
- `src/components/training/VictoryCard.tsx` — import `insanoLogo` aponta para `anaac-logo.png` ✓ (nome da variável legado, mas path correto)
- Nenhum componente importa os SVGs insano diretamente

### Resultado

O ícone do PWA na instalação e na tela inicial será o logo rosa/vermelho da ANAAC Club em vez do logo laranja antigo.

