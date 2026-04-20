

## Resposta direta

**Não.** Hoje as alunas **não recebem nenhuma notificação** quando alguém curte ou comenta nos posts delas. Verifiquei:

- `PostCard.tsx` e `PostDetailModal.tsx` apenas inserem em `post_likes` / `post_comments` — sem criar `notifications`.
- Não existe trigger no banco em `post_likes` ou `post_comments` (consulta retornou vazio).
- Não há nenhum código no projeto com termos como "curtiu", "comentou" ou similar.

A única notificação social existente é a de **broadcast** quando a conta oficial ANAAC posta algo (auto-follow no `handle_new_user`).

## Plano: Notificações de Curtida e Comentário

### O que vou criar

**1. Trigger no banco `notify_on_post_like`** (`post_likes` AFTER INSERT)
- Busca o `user_id` do dono do post via `community_posts`
- Se `liker ≠ dono`, insere em `notifications`:
  - `title`: "❤️ Nova curtida"
  - `body`: "{Nome da pessoa} curtiu seu post"
  - `type`: "social_like"
  - `metadata`: `{ post_id, liker_id, trigger: "post_like" }`
- O trigger existente `trigger_push_on_notification` já dispara push automaticamente

**2. Trigger no banco `notify_on_post_comment`** (`post_comments` AFTER INSERT)
- Mesma lógica: dono do post recebe notificação
- `title`: "💬 Novo comentário"
- `body`: "{Nome} comentou: {primeiros 60 chars}"
- `type`: "social_comment"
- `metadata`: `{ post_id, commenter_id }`
- **Bônus**: se for resposta (`[reply:xxx]`), também notifica o autor do comentário original

**3. Anti-spam (debounce de curtidas)**
- Quando uma aluna curte/descurte/curte de novo em segundos, evita spam:
- Antes de inserir, deleta notificações `social_like` do mesmo `liker` para o mesmo `post_id` criadas nos últimos 5 minutos e ainda não lidas.

**4. Deep link no `NotificationCenter.tsx`**
- Adicionar handler para `type === "social_like"` e `social_comment`: abrir o post na comunidade (modal ou rota `/comunidade?post=xxx`).
- Ícone próprio para cada tipo (❤️ e 💬).

### O que NÃO vou fazer

- Não notifico a própria pessoa quando ela curte/comenta no próprio post.
- Não crio nova tabela — uso `notifications` que já existe e já tem push integrado.
- Não toco no fluxo de curtir/comentar do front (lógica fica 100% no banco, sem latência extra).

### Detalhes técnicos

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _post_owner uuid;
  _liker_name text;
BEGIN
  SELECT user_id INTO _post_owner FROM community_posts WHERE id = NEW.post_id;
  IF _post_owner IS NULL OR _post_owner = NEW.user_id THEN RETURN NEW; END IF;
  
  -- anti-spam: remove curtidas recentes não-lidas do mesmo liker
  DELETE FROM notifications 
  WHERE user_id = _post_owner AND type = 'social_like' AND read = false
    AND metadata->>'liker_id' = NEW.user_id::text
    AND metadata->>'post_id' = NEW.post_id::text
    AND created_at > now() - interval '5 minutes';
  
  SELECT full_name INTO _liker_name FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, title, body, type, metadata)
  VALUES (_post_owner, '❤️ Nova curtida',
    COALESCE(_liker_name,'Alguém') || ' curtiu seu post',
    'social_like',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id));
  RETURN NEW;
END; $$;

CREATE TRIGGER tr_notify_on_post_like
AFTER INSERT ON post_likes FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();
```
(Análogo para `post_comments`.)

**Arquivo a editar:** `src/components/NotificationCenter.tsx` — mapear `social_like`/`social_comment` para emoji e navegação.

### Resultado esperado

- Aluna recebe push + badge no app sempre que alguém curte/comenta seu post
- Tap na notificação → abre direto no post
- Sem spam de curte/descurte
- Aumento esperado de engajamento na comunidade

