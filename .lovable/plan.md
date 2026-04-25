## Plano: Modal "Comece Aqui" — primeiro login da aluna

### Decisões confirmadas
- ✅ Aparece **só pra alunas novas** (criadas a partir de hoje). As 98 atuais não veem nada.
- ✅ **Sem vídeo** — só texto explicativo.
- ✅ **Sem X, sem fechar clicando fora** — único jeito de fechar é o botão "Entendi, vamos começar!".
- ✅ Aparece **só no Dashboard `/aluno`** (não em subrotas).

---

### Fase 1 — Banco (migration)

Alterar o trigger `handle_new_user` pra criar perfis novos com `onboarded = false` em vez de `true`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, status, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'ativo',
    false  -- ⬅️ MUDANÇA: era true, agora false pra disparar o modal
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name);
  -- Resto igual (user_roles + auto-follow ANAAC)
  ...
END;
$$;
```

**O que NÃO mexo:**
- ❌ Não altero as 98 alunas atuais (continuam `onboarded = true`)
- ❌ Não mexo em `AuthContext.tsx` que faz `ensureProfileExists` com `onboarded: true` — ele só roda como fallback se o trigger falhar, e nesse caso é melhor não mostrar modal mesmo
- ❌ Não toco em `useProactiveAlerts` nem `AdminUsuarios` que leem `onboarded`

---

### Fase 2 — Componente do Modal

**Novo arquivo:** `src/components/WelcomeModal.tsx`

Modal simples baseado no `Dialog` do shadcn (que já tem no projeto):
- Título: "Bem-vinda ao ANAAC Club! 🎯"
- Texto curto explicando: "Esse é seu ponto de partida. Aqui você acompanha treinos, dieta, sua chama diária e o desafio de 21 dias."
- Botão único, destaque: **"Entendi, vamos começar!"**
- **Sem botão X**, **sem fechar com ESC ou clique fora** (configura `onPointerDownOutside={(e) => e.preventDefault()}` e `onEscapeKeyDown={(e) => e.preventDefault()}` no `DialogContent`)
- Estilo segue o design system atual (light mode, tokens semânticos)

Props:
```tsx
interface WelcomeModalProps {
  open: boolean;
  onConfirm: () => Promise<void>;  // marca onboarded=true e fecha
}
```

---

### Fase 3 — Integração no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`

Adicionar lógica:
1. Lê `profile.onboarded` (já vem do `useProfile` hook).
2. Se `onboarded === false` → renderiza `<WelcomeModal open={true} ... />`.
3. No `onConfirm` do modal:
   - Faz `supabase.from("profiles").update({ onboarded: true }).eq("id", user.id)`
   - Invalida o cache do React Query (`queryClient.invalidateQueries(["profile"])`)
   - Modal fecha automaticamente porque `profile.onboarded` vira `true`

**Sem flicker:** O `useProfile` já tem estado de loading, e o `Dashboard.tsx` já mostra `<DashboardSkeleton />` enquanto carrega. O modal só renderiza DEPOIS do profile estar pronto, então não pisca.

---

### Fase 4 — Garantias e o que NÃO faço

**Não mexo:**
- ❌ Subrotas (`/aluno/treinos`, `/aluno/dieta`, etc.) — modal só no index
- ❌ Coluna `onboarded` na tabela (já existe)
- ❌ Lógica de roteamento ou `AuthContext`
- ❌ Notificações, push, gamificação
- ❌ Pagamentos, status, expiração
- ❌ Upload de fotos / Diário de Evolução (isso é o próximo passo, depois de validar esse)

**Comportamento resultante:**
| Quem | O que vê |
|---|---|
| Aluna nova (criada após o deploy) | Vê modal na 1ª vez que abrir o Dashboard, marca `onboarded=true`, nunca mais vê |
| 98 alunas atuais | Continuam normais, nunca veem o modal |
| Admin / Closer / CS | Não passam pelo `/aluno`, nunca veem |

---

### Arquivos afetados

| Arquivo | Ação | Risco |
|---|---|---|
| Migration SQL (trigger `handle_new_user`) | Alterar default `onboarded=true` → `false` | Baixo — só afeta signups futuros |
| `src/components/WelcomeModal.tsx` | Criar | Zero |
| `src/pages/Dashboard.tsx` | Adicionar 1 hook + 1 mutation + render condicional do modal | Baixo |

---

### Como você valida depois
1. Cria uma aluna teste nova pelo `/admin/usuarios`
2. Faz login com ela
3. Cai em `/aluno` → modal aparece
4. Clica "Entendi" → modal fecha, fica na home normal
5. Recarrega a página → modal **não** reaparece ✅
6. Faz login com qualquer aluna antiga → modal **não** aparece ✅

---

### Pergunta pra você definir antes do "go"
Qual texto exato você quer no modal? Sugestão de rascunho:

> **Bem-vinda ao ANAAC Club! 🎯**
> 
> Esse é seu ponto de partida. Aqui você vai encontrar:
> - 🔥 Sua chama diária (não pode apagar!)
> - 💪 Seus treinos personalizados
> - 🥗 Sua dieta e checklist diário
> - 🏆 O desafio de 21 dias
> - 👯 A comunidade de alunas
> 
> Bora começar?
> 
> [ Entendi, vamos começar! ]

Se quiser mudar o texto/emojis/copy, me passa antes que eu implemento direto. Se tá bom, é só aprovar o plano.