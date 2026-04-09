

## Figurinha de "Dias Ativos" no Perfil

### O que será feito

Ao tocar no bloco "Dias Ativos" no perfil, abre um Sheet (bottom drawer) com um card visual mostrando chama, número de dias ativos e branding ANAAC. Botões "Baixar" e "Copiar". Imagem gerada via `html2canvas`. Fallback: imagem visível no modal para long-press nativo.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ActiveDaysSticker.tsx` | **Novo** — card visual + html2canvas + download/copiar |
| `src/pages/Perfil.tsx` | "Dias Ativos" clicável → abre Sheet |

### Detalhes técnicos

**`ActiveDaysSticker.tsx`**
- Props: `streak`, `userName`, `flameState`, `onClose`
- Card visual renderizado em div oculta (`position: fixed; top: -9999px`) para evitar conflito com animação do Sheet (ponto levantado pelo Gemini)
- `useEffect` com 500ms delay para pré-render via `html2canvas` → `setPreparedBlob`
- Card visível no Sheet como preview (imagem já renderizada ou fallback estático)
- Botão "Baixar": blob → `<a download>` programático
- Botão "Copiar": `ClipboardItem` com fallback para download
- Imagem visível para long-press nativo (fallback supremo mobile)

**`Perfil.tsx`** (linhas 459-462)
- Adicionar estado `stickerOpen`
- Envolver div "Dias Ativos" com `onClick={() => setStickerOpen(true)}` + `cursor-pointer`
- Adicionar ícone `Download` (12px) ao lado do label
- Renderizar `<Sheet open={stickerOpen}>` com `<ActiveDaysSticker>`
- Passar `streakNum`, `full_name`, flame state do `useStreak`

### Ponto de atenção do Gemini aplicado

O `html2canvas` captura uma div **fora** da área animada do Sheet (renderizada com `position: fixed; top: -9999px`). A preview no Sheet mostra a imagem já convertida em `<img src={blobUrl}>`, não o DOM original. Isso evita canvas cortado/branco durante animação.

