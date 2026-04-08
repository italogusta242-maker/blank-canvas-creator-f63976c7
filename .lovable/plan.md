

## Plano Unificado de Performance Mobile

Todas as melhorias são invisíveis para a aluna — mesmo visual, app mais rápido no 4G.

---

### 1. Habilitar cache do navegador

**Arquivo:** `index.html`

Remover as 3 meta tags anti-cache (linhas 8-10: `Cache-Control`, `Pragma`, `Expires`). O Vite já gera hashes nos nomes dos arquivos, então cache é seguro. Hoje cada visita re-baixa TODOS os assets do zero.

### 2. Fonts sem bloquear renderização

**Arquivo:** `index.html`

Trocar o `<link href="fonts.googleapis.com/..." rel="stylesheet">` por carregamento assíncrono:
```html
<link rel="preload" href="..." as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="..."></noscript>
```
Elimina ~750ms de bloqueio no primeiro paint.

### 3. Cache global no React Query

**Arquivo:** `src/App.tsx`

Adicionar defaults globais no `QueryClient`:
- `staleTime: 300_000` (5 min)
- `gcTime: 1_800_000` (30 min)

Hoje, trocar de aba (Treinos → Dashboard → Dieta) refaz TODAS as queries. Com isso, dados ficam em cache por 5 minutos.

### 4. Priorizar imagem LCP

**Arquivo:** `src/components/InsanoLogo.tsx`

Adicionar `fetchpriority="high"` e `loading="eager"` na tag `<img>` do logo para o navegador priorizar o download.

### 5. Imagens da comunidade — redimensionar via Storage Transform

**Arquivo:** `src/components/community/PostCard.tsx`

Adicionar `?width=600&resize=contain` na URL da imagem do feed + skeleton state enquanto carrega (padrão `animate-pulse` que já usamos). Cada imagem passa de ~3MB para ~50KB.

**Arquivo:** `src/components/community/PostDetailModal.tsx`

Mesma lógica com `?width=800` para o modal (resolução um pouco maior).

### 6. Comprimir imagens antes do upload

**Arquivo:** `src/components/community/CreatePost.tsx`

Adicionar função `compressImage` usando Canvas API (max 1200px largura, JPEG 0.8). Reduz upload de ~3MB para ~200KB. Executada antes do `supabase.storage.upload`.

### 7. Skeleton states nos gráficos do Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`

Em vez de lazy loading, envolver `PerformanceEvolution` e os gráficos de volume com skeleton states enquanto os dados carregam (usando o padrão `<Skeleton>` + `animate-pulse` que já existe no projeto). Sem mudança no import — o componente carrega normal, mas mostra skeleton até os dados estarem prontos.

---

### Resumo de arquivos

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Remover meta no-cache; fonts async |
| `src/App.tsx` | staleTime + gcTime globais no QueryClient |
| `src/components/InsanoLogo.tsx` | fetchpriority na img |
| `src/components/community/PostCard.tsx` | Transform URL + skeleton state na imagem |
| `src/components/community/PostDetailModal.tsx` | Transform URL na imagem do modal |
| `src/components/community/CreatePost.tsx` | compressImage antes do upload |
| `src/pages/Dashboard.tsx` | Skeleton states nos gráficos |

### Impacto esperado

- **FCP**: ~4.9s → ~2.5s (fonts async + cache)
- **Navegação entre abas**: instantânea (staleTime 5min)
- **Feed comunidade**: scroll fluido no 4G (imagens 50KB vs 3MB)
- **Uploads**: 80% menores (compressão client-side)
- **Revisitas**: quase instantâneas (assets cacheados)

