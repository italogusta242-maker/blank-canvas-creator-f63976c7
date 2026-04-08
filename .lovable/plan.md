

## Correção Urgente: Falha de Segurança na Página de Login

### Problema Encontrado

No arquivo `src/pages/AuthPage.tsx`, a aba **"CRIAR CONTA"** está visível para qualquer pessoa. Quando alguém se cadastra por ali, o código na **linha 94-97** executa:

```typescript
// Insert admin role
await supabase.from("user_roles").upsert(
  { user_id: userId, role: "admin" },
  { onConflict: "user_id,role" }
);
```

Ou seja, **qualquer pessoa que cria uma conta pela tela de login recebe automaticamente a role `admin`**. Este é o "botão de emergência" que foi criado anteriormente para recuperação de acesso, mas ficou como o fluxo padrão de signup.

Como as alunas acessam a plataforma pelo link e algumas podem ter clicado em "Criar Conta" ao invés de usar a senha que receberam, elas viraram admin.

### Plano de Correção

**1. Remover a aba "CRIAR CONTA" da AuthPage**

A página de login deve ter APENAS o formulário de login. Alunas não devem poder se auto-cadastrar — contas são criadas pelo admin. Remover:
- A aba/tab de signup
- A função `handleSignUp` inteira
- O campo "Nome completo"

**2. Limpar roles admin incorretas (novamente)**

Verificar e remover qualquer role admin que não seja do `anaac.master@gmail.com`.

**3. Resultado**

A tela de auth fica apenas com email + senha + botão "ENTRAR" + link "Esqueci minha senha". Ninguém mais poderá se auto-atribuir admin.

### Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/pages/AuthPage.tsx` | Remover signup tab e função handleSignUp |

