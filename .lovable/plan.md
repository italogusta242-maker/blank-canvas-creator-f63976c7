

## Plano: Corrigir redirecionamento da página /instalar

### Problema

`AuthenticatedApp.tsx` linha 64-66 redireciona `/instalar` → `/` para usuários logados, impedindo o tutorial PWA de aparecer.

### Correção

| Arquivo | Mudança |
|---------|---------|
| `src/app/AuthenticatedApp.tsx` | Remover redirect de `/instalar`, adicionar rota lazy para `InstalarApp` |

### Detalhes

1. Remover `if (location.pathname === "/instalar") return <Navigate to="/" replace />;`
2. Adicionar import lazy: `const InstalarApp = lazy(() => import("@/pages/InstalarApp"));`
3. Adicionar rota antes do `StudentGuard`: `<Route path="/instalar" element={<InstalarApp />} />`

