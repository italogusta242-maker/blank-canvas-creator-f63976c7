

## Plano: Corrigir Ranking — Dias Ativos Apenas por Posts

### Problema
Os rankings em `Comunidade.tsx` e `GymRatsHub.tsx` contam dias ativos como UNION de `community_posts` + `workouts`, contradizendo a regra oficial: **dias ativos = dias com post na comunidade**.

### Alterações

**1. `src/pages/Comunidade.tsx` (linhas 63-84)**
- Remover a query de `workouts` e o loop que adiciona dias de treino ao `activeDaysMap`
- Dias ativos passam a ser contados exclusivamente por `community_posts`

**2. `src/components/community/GymRatsHub.tsx` (linhas 51-75)**
- Remover a query de `workouts` e o loop correspondente
- Remover o `Promise.all` (fica só a query de posts)
- Dias ativos contados apenas por `community_posts`

**3. `src/components/comunidade/GymRatsTab.tsx`**
- Verificar se também usa workouts para ranking e aplicar a mesma correção

### Resultado
Uma aluna que postou 4 dias e treinou 5 dias terá **4 dias ativos** no ranking, alinhado com a regra de gamificação oficial.

