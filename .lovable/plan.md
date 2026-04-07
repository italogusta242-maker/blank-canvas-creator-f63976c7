

## Plano: Finalizar Sincronização Financeira

### Ações Imediatas

**1. Desativar Mariana Honório (churn)**
- Profile ID: `e0535f95-71d6-4550-9e63-f27041129526`
- UPDATE `profiles` SET `status = 'cancelado'`
- Não criar subscription/payment para ela

**2. Match Solange A Vilar → Inara Vilar**
- Profile ID: `56223de5-bb9c-413a-a75c-8f535f3f4b05`
- CSV: "solange a vilar", R$ 39,90, Pix → Plano Mensal (R$ 39,90)
- Criar subscription + payment retroativo

**3. Excluir do cruzamento**
- "ana chagas" (teste da ANAAC) → ignorar
- "Victor Gabriel Viana Neri" (teste InfinitePay) → já excluído
- 5 contas sistema (Admin ANAAC, Admin Master, ANAAC, admin@anaac.com, aluno@anaac.com)

### Inserção em Massa (subscriptions + payments)

Script Python que:
1. Re-lê o CSV da InfinitePay (preciso que reenvie ou uso dados em cache da análise anterior)
2. Para cada transação aprovada pareada com perfil ativo:
   - Insere 1 `subscription` (plan_id inferido pelo valor, status=active, payment_status=paid)
   - Insere 1 `payment` (amount, status=paid, gateway_transaction_id=NSU)
3. Inclui os 7 matches manuais + Aline + Inara Vilar

**Mapeamento valor → plano:**

| Valor CSV | Plan ID | Nome |
|-----------|---------|------|
| 3590, 3748 | c5852b5c | Mensal ANAAC10 (R$35,90) |
| 3990 | 00423c77 | Mensal (R$39,90) |
| 9800, 10230 | 3f52ae0c | Trimestral ANAAC10 (R$98,00) |
| 10900 | 91a8944a | Trimestral (R$109,00) |
| 18476 | c437a926 | Semestral ANAAC10 (R$177,00) |
| 19700 | 89639d9b | Semestral (R$197,00) |

### Lista para Revisão Manual (gerar CSV)

Gerar `/mnt/documents/pendentes_revisao_manual.csv` com:

**A) Pagamentos no CSV sem perfil identificado** (~9 transações de cartão sem nome + Anísio + Pietro)
- Colunas: Nome CSV, Valor, Meio, Data, NSU, Observação

**B) Alunas ativas sem pagamento no CSV** (~10 alunas)
- Colunas: Nome, Email, Telefone, Observação
- Inclui: Ana Beatriz Brandao Macedo, Anna Julia Machado, Clara Mann Boaroli, Giovana Danielli, Giovana Ribeiro, Joany Medeiros, Julia Araujo Santos, Karla Beatriz, Lívia Mirelly, Nicolle Franco, Ana Pais, etc.

**C) Remarketing (negadas/canceladas)** (~14 transações)
- Colunas: Nome CSV, Valor, Status, Data

### Etapas Técnicas

1. `INSERT` para desativar Mariana Honório
2. Script Python `/tmp/sync_financial.py`:
   - Cruza CSV × perfis (usa dados da análise anterior em memória)
   - Insere `subscriptions` e `payments` via psql
   - Gera `/mnt/documents/pendentes_revisao_manual.csv`
3. Atualizar telefone de Inara Vilar (se disponível na lista manual)

### Pré-requisito

O CSV `infinite_pay_report.csv` precisa ser reenviado (uploads não persistem entre mensagens). Caso contrário, uso os dados extraídos da análise anterior que tenho em contexto.

