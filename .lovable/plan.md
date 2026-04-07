

## Ajustes na Aba de Dieta (DietPlan config diet)

O componente `DietPlan.tsx` (usado para cardápios hardcoded do Desafio) precisa de várias melhorias visuais e funcionais.

---

### Mudanças Planejadas

#### 1. Barra de progresso de refeições + integração com chama
- Adicionar uma barra de progresso "Refeições feitas X/Y" no topo (como já existe no `Dieta.tsx` para planos dinâmicos)
- Integrar com `useDailyHabits` para persistir e contar para a chama/flame

#### 2. Substituir ícone de relógio por bolinha de checkin
- Remover o `Clock` icon do header de cada refeição
- Colocar uma bolinha clicável (checkmark circle) que marca a refeição como feita
- Quando marcada: fundo rosa/primary com check branco
- Quando desmarcada: borda com fundo transparente

#### 3. Opções separadas (não inline)
- Atualmente todas as opções aparecem juntas dentro do card
- Mudar para: mostrar apenas a opção selecionada, com um botão "X opções" que abre um seletor
- O seletor mostra as opções disponíveis, o usuário escolhe qual ver
- Padrão: Opção 1 selecionada

#### 4. Formatação dos alimentos como no referência
- Em vez de mostrar o texto corrido ("Café (80ml), 2 Ovos..."), parsear e listar cada alimento individualmente
- Cada item: nome em negrito, porção abaixo em texto menor
- Substituições: botão "Ver substituições" por item ou por opção, com accordion

#### 5. Botão "Limpar" na aba de compras
- Já existe o progresso, adicionar um botão "Limpar" ao lado do contador para resetar todos os itens marcados

---

### Arquivos Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/components/diet/DietPlan.tsx` | Refatoração completa: checkin por refeição, seletor de opções, foods individuais, botão limpar compras |
| `src/components/diet/DietPlanData.ts` | Sem alteração (dados continuam iguais, o parsing é feito no componente) |

### Detalhes Técnicos

- **Parsing do texto `principal`**: Splitar por `, ` e ` e ` para extrair itens individuais (ex: "Café (80ml)" → nome: "Café", porção: "80ml")
- **Estado de opção selecionada**: `useState<Record<number, number>>` (mealIdx → optionIdx)
- **Checkin de refeição**: usar `useDailyHabits().toggleMeal()` com meal ID baseado em `config-diet-{calories}-meal-{idx}`
- **Botão limpar compras**: resetar `checkedItems` para `new Set()` no estado local

