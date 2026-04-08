

## Plano: Inserir 11 Assinaturas Confirmadas + Criar Plano Anual

### 1. Migration: Criar plano Anual

Inserir na `subscription_plans` um novo plano "Anual" com price = 348.00 e period_months = 12.

### 2. Script de inserção em massa (11 alunas)

Usar `psql` para INSERT direto nas tabelas `subscriptions` e `payments` para as 11 alunas confirmadas:

| Aluna | Profile ID | Plano | Valor |
|-------|-----------|-------|-------|
| Lívia Mirelly | 7d6e5d09 | Mensal ANAAC10 (c5852b5c) | 35,90 |
| Karla Beatriz | 2905b855 | Mensal ANAAC10 | 35,90 |
| Giovana Ribeiro | ed2908e4 | Mensal ANAAC10 | 35,90 |
| Giovana Danielli | 5638258e | Mensal ANAAC10 | 35,90 |
| Clara Mann Boaroli | c37b3573 | Mensal ANAAC10 | 35,90 |
| Ana Pais | f55abdf1 | Mensal ANAAC10 | 35,90 |
| Julia Araujo Santos | 3c10aeaa | Mensal (00423c77) | 39,90 |
| Joany Medeiros | c0a0e3fe | Mensal | 39,90 |
| Anna Julia Machado | 4f196c85 | Mensal | 39,90 |
| Ana Beatriz Brandao Macedo | 0d21d683 | Mensal | 39,90 |
| Nicolle Franco | 6cf1a939 | Trimestral ANAAC10 (3f52ae0c) | 98,00 |

Cada INSERT cria:
- 1 row em `subscriptions` (status=active, payment_status=paid, plan_price, subscription_plan_id, started_at=now)
- 1 row em `payments` (status=paid, amount, subscription_plan_id)

### 3. Pendentes (nao executo agora)

- **Rafaela Goncalves**: preciso do email/telefone para criar perfil + associar ao plano Anual R$ 348
- **Maria Luiza Lira Marques**: sem pagamento confirmado, manter como esta

### 4. Atualizar CSV de pendentes

Regenerar `/mnt/documents/pendentes_revisao_manual.csv` com apenas Rafaela e Maria Luiza.

### Arquivos alterados

| Arquivo | Acao |
|---------|------|
| Migration SQL | INSERT plano Anual na subscription_plans |
| Script Python `/tmp/` | INSERT subscriptions + payments para 11 alunas |
| `/mnt/documents/pendentes_revisao_manual.csv` | Atualizado com 2 pendentes |

