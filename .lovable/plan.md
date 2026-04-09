

## Plano: Figurinha igual ao VictoryCard + Botão na Tela de Treinos

### O que muda

1. **`ActiveDaysSticker.tsx`** — Refazer o visual do card para ficar **idêntico** ao do VictoryCard (Flame SVG com cor `#ff2a5f`, texto "DIAS ATIVOS" em vermelho, número grande branco, "ANAAC CLUB" embaixo). Hoje ele usa emoji 🔥 e gradiente azul diferente.

2. **`Perfil.tsx`** — Remover o Sheet/sticker do perfil (a funcionalidade migra para a tela de treinos).

3. **`Treinos.tsx`** — Adicionar um botão com ícone de download + "Dias Ativos" na view `"list"` (header da Sala de Treinos). Ao clicar, abre um Sheet com o `ActiveDaysSticker` usando o mesmo visual do VictoryCard.

---

### Detalhes técnicos

**`ActiveDaysSticker.tsx`** — Card oculto para captura:
- Trocar emoji `🔥` por componente `<Flame>` do Lucide renderizado como SVG inline (html2canvas captura melhor)
- Cor: `#ff2a5f` (mesmo do VictoryCard)
- Texto "DIAS ATIVOS" em `fontSize: 26, fontWeight: 900, color: #ff2a5f`
- Número em `fontSize: 64, fontWeight: 900, color: #ffffff`
- "ANAAC CLUB" em `fontSize: 14, letterSpacing: 4px, opacity: 0.8`
- Fundo: `transparent` (igual VictoryCard — o fundo escuro vem do container externo `bg-black/40`)
- Manter lógica de pré-render 500ms, download blob e copy clipboard

**`Perfil.tsx`** (linha 462):
- Remover `onClick={() => setStickerOpen(true)}` e o ícone Download
- Remover o `<Sheet>` do `ActiveDaysSticker`
- Manter o número de "Dias Ativos" como texto estático

**`Treinos.tsx`** (view `"list"`, ~linha 475-483):
- Adicionar botão ao lado do "Histórico" com ícone `Download` + texto "Dias Ativos"
- Estado `stickerOpen` para controlar o Sheet
- Importar `ActiveDaysSticker`, `Sheet`, `SheetContent`
- Passar `streak`, `full_name` (do profile query) e `flameState`

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ActiveDaysSticker.tsx` | Visual idêntico ao VictoryCard |
| `src/pages/Perfil.tsx` | Remover Sheet/sticker, manter texto estático |
| `src/pages/Treinos.tsx` | Adicionar botão "Dias Ativos" + Sheet |

