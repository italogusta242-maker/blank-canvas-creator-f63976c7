
## Plano: Infraestrutura do Diário de Evolução (Frente B — Parte 1)

### Auditoria do que já existe (importante antes de mudar nada)

**Tabela `monthly_assessments` JÁ EXISTE e está em uso ativo:**

Colunas que já estão lá hoje:
- `id`, `user_id`, `created_at`, `assessed_at`
- **Peso/medidas:** `peso` (real), `weight` (real, duplicada/legado), `altura`, `body_fat`, `gordura`, `braco`, `cintura`, `coxa`, `quadril`, `peitoral`, `panturrilha`
- **Fotos (5 ângulos, em PT):** `foto_frente`, `foto_costas`, `foto_lateral`, `foto_lado_direito`, `foto_lado_esquerdo`
- **JSON livres:** `photos`, `measurements`
- **Texto:** `notes` ✅ (já existe!)
- **RLS:** `assess_insert_own`, `assess_select_own`, `assess_update_own` — todas ok, escopo `auth.uid() = user_id`

**Código em produção que já usa essas colunas:**
- `src/lib/submitMonthlyAssessment.ts` — grava reavaliação (peso, altura, fotos via JSON `photos`)
- `src/pages/monthly-assessment/MonthlyAssessment.tsx` — formulário de reavaliação mensal completo
- `src/components/especialista/StudentPhotosPanel.tsx` — lê `foto_frente/costas/lateral/lado_direito/lado_esquerdo`
- `src/components/especialista/StudentEvolutionChart.tsx` — lê `peso` pra gráfico de evolução
- `src/pages/especialista/EspecialistaAlunos.tsx` — lista avaliações
- 4 edge functions (`generate-diet-plan`, `generate-training-plan`, `check-stale-plans`, `admin-delete-user`)

**Bucket `evolution_photos`:** ❌ não existe. Hoje as fotos da reavaliação vão pro bucket público `community_media` (mesmo bucket dos posts da comunidade) — **isso é um problema de privacidade real**.

---

### Decisão crítica: NÃO criar colunas duplicadas

O pedido original sugere criar `weight`, `photo_front_url`, `photo_side_url`, `photo_back_url`. Mas:

- `weight` JÁ existe (e há `peso` em paralelo — não vou piorar a duplicação)
- `photo_front_url` seria duplicata de `foto_frente`
- `notes` JÁ existe

**O que vou fazer:** reutilizar as colunas que já estão em uso. Sem migration de schema. O Diário de Evolução vai gravar em `peso`, `foto_frente`, `foto_costas`, `foto_lateral`, `notes` — o mesmo schema que a reavaliação mensal usa hoje. Isso garante que o gráfico de evolução, o painel da especialista e as edge functions continuem funcionando sem 1 linha de código alterada.

A única migration nessa fase é **storage**, não schema.

---

### Fase 1 — Bucket privado `evolution_photos` + RLS

**Migration SQL (única):**

```sql
-- 1. Criar bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('evolution_photos', 'evolution_photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: aluna só vê/escreve na própria pasta {user_id}/*
CREATE POLICY "Evolution photos: users read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evolution_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Evolution photos: users upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evolution_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Evolution photos: users update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'evolution_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Evolution photos: users delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'evolution_photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Admin / Especialista podem LER fotos de qualquer aluna (pra acompanhamento)
CREATE POLICY "Evolution photos: admin/specialist read all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evolution_photos'
    AND (
      has_role('admin'::app_role, auth.uid())
      OR has_role('specialist'::app_role, auth.uid())
    )
  );
```

**Estrutura de pastas resultante:**
```
evolution_photos/
  {user_id}/
    2026-04-25_frente.jpg
    2026-04-25_costas.jpg
    2026-04-25_lateral.jpg
```

**Como o frontend vai acessar (preview/download):**
Como o bucket é privado, `getPublicUrl` não funciona. Vai usar `createSignedUrl(path, 3600)` — URL temporária de 1h, gerada sob demanda quando a aluna abre o Diário. Já existe esse padrão no projeto pra fotos de chat (`MediaMessage.tsx`).

---

### Fase 2 — Tipagem (zero ação)

`src/integrations/supabase/types.ts` é auto-gerado pelo Supabase. Como a tabela `monthly_assessments` já está lá com todas as colunas (incluindo `notes`), não preciso alterar nada. O arquivo vai se atualizar sozinho depois da migration de storage (mas storage não muda tipos).

---

### Fase 3 — O que NÃO faço nessa frente

❌ Não crio coluna `photo_front_url` / `photo_side_url` / `photo_back_url` — usaria `foto_frente`, `foto_lateral`, `foto_costas`  
❌ Não crio coluna `weight` (já existe — e tem `peso` em paralelo)  
❌ Não adiciono `notes` (já existe)  
❌ Não migro fotos antigas que estão em `community_media` (são da reavaliação mensal antiga, não do Diário)  
❌ Não crio nenhuma tela ainda (Parte 2 do plano)  
❌ Não toco no fluxo da reavaliação mensal (`MonthlyAssessment.tsx`) — ele continua usando `community_media`. Se você quiser depois eu migro, mas é outro escopo.

---

### Resultado esperado depois dessa fase

| Item | Status |
|---|---|
| Bucket `evolution_photos` (privado) | ✅ Criado |
| RLS aluna lê/escreve só `{user_id}/*` | ✅ Configurado |
| RLS bloqueia acesso público | ✅ Bucket `public=false` + sem policy `anon` |
| RLS admin/especialista lê tudo | ✅ Configurado |
| Tabela `monthly_assessments` pronta pra registros do Diário | ✅ Já estava (vai usar `peso`, `foto_frente`, `foto_costas`, `foto_lateral`, `notes`) |
| Tipagem TS atualizada | ✅ Auto (já contém tudo) |

---

### Pergunta antes do "go"

A reavaliação mensal antiga (`/aluno/avaliacao-mensal`) hoje grava fotos no bucket público `community_media`. Quer que eu **migre essa rota também** pra usar `evolution_photos` privado, ou deixo só pro Diário novo? 

- **Opção A:** Só Diário novo usa privado (reavaliação antiga continua pública — risco de privacidade nas 0 fotos atuais)  
- **Opção B:** Reavaliação mensal também passa a salvar no privado a partir de agora (fotos antigas continuam onde estavam, novas vão pro privado)

Recomendo **Opção B**, mas é decisão sua. Se aprovar o plano sem responder, sigo com **Opção A** (escopo mínimo dessa task).
