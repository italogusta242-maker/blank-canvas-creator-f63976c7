

## Plano: Sincronização Financeira Completa

### Resumo

Cruzar o CSV InfinitePay com o banco de dados, criar os 6 planos, registrar pagamentos/assinaturas retroativos, corrigir status, e gerar relatório de auditoria.

### Observações do Usuário
- **Victor Gabriel Viana Neri** → teste do dono da InfinitePay, **excluir** do cruzamento
- **Nomes masculinos** (Anísio, Pietro) → sinalizar, verificar com a aluna depois
- **2 alunas sem match** → provavelmente os pagamentos restantes são delas (dedução por eliminação)

### Estado Atual do Banco

| Dado | Valor |
|------|-------|
| Perfis ativo/active | 90 (85 + 5) |
| `subscription_plans` | 0 |
| `payments` | 0 |
| `subscriptions` | 0 |

### Etapas

**1. Criar os 6 planos em `subscription_plans`** (migration)

| Nome | Preço | Meses | Cupom |
|------|-------|-------|-------|
| Mensal | R$ 39,90 | 1 | - |
| Trimestral | R$ 109,00 | 3 | - |
| Semestral | R$ 197,00 | 6 | - |
| Mensal ANAAC10 | R$ 35,90 | 1 | ANAAC10 |
| Trimestral ANAAC10 | R$ 98,00 | 3 | ANAAC10 |
| Semestral ANAAC10 | R$ 177,00 | 6 | ANAAC10 |

**2. Corrigir status `active` → `ativo`** (insert tool)

5 perfis: `admin@anaac.com`, `villarinara@icloud.com`, `anaac.master@gmail.com`, `malulira9@gmail.com`, `aline_spok@hotmail.com`

**3. Script Python de cruzamento** (exec)

- Usuário reenvia o CSV (ou uso os dados já extraídos da análise anterior)
- Normaliza nomes do CSV e do banco
- Exclui Victor Gabriel Viana Neri (teste InfinitePay)
- Mapeia valores CSV → plano (3990→Mensal, 3590→Mensal ANAAC10, 3748→Mensal ANAAC10 cartão, 10900→Trimestral, 9800→Trimestral ANAAC10, 10230→Trimestral ANAAC10 cartão, 19700→Semestral, 18476→Semestral ANAAC10 cartão)
- Sinaliza nomes masculinos como "verificar com aluna"
- Alunas sem match no CSV → dedução por eliminação (associar pagamentos órfãos)

**4. Gerar relatório** → `/mnt/documents/auditoria_completa.csv`

Colunas: Nome DB, Email, Telefone, Status DB, Nome CSV, Valor Pago, Plano Inferido, Meio, Data, Resultado (PAREADO / SEM_PAGAMENTO_CSV / PAGAMENTO_SEM_PERFIL / REMARKETING / TESTE_EXCLUIDO / TERCEIRO_VERIFICAR)

**5. Criar registros retroativos** (insert tool, após aprovação)

- `subscriptions`: 1 por aluna pareada, vinculada ao plano correto
- `payments`: 1 por transação aprovada, com `gateway_transaction_id` = NSU

**6. Lista de remarketing**

Transações negadas/canceladas do CSV → sinalizadas no relatório para ação comercial

### Pré-requisito

Preciso que o CSV seja reenviado (o upload anterior não persistiu no sistema de arquivos). Assim que receber, executo tudo de uma vez.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar `subscription_plans` com 6 planos |
| Insert SQL | Corrigir 5 perfis `active` → `ativo` |
| Script Python `/tmp/` | Cruzamento CSV × DB |
| `/mnt/documents/auditoria_completa.csv` | Relatório final |
| Insert SQL (pós-aprovação) | Criar `subscriptions` + `payments` retroativos |

