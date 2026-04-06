import fs from 'fs';
import xlsx from 'xlsx';

const wb = xlsx.readFile('c:\\\\Users\\\\lucas\\\\Downloads\\\\importacao_auth.csv.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1});

let emails = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  let text = String(row[0]).trim();
  let email = text.split(',')[0].trim();
  if (email && email.includes('@')) {
    emails.push(email);
  }
}

const sqlStr = emails.join('\n');

const sql = `---------- INJEÇÃO CIRÚRGICA DE SEGURANÇA MÁXIMA ----------
DO $$ 
DECLARE
  csv_row text;
  new_uid uuid;
  existing_id uuid;
  csv_data text := '
${sqlStr}
'; 

BEGIN
  FOR csv_row IN SELECT unnest(string_to_array(csv_data, E'\\n'))
  LOOP
    IF trim(csv_row) = '' THEN CONTINUE; END IF;

    -- Verifica se o auth.users ja tem
    SELECT id INTO existing_id FROM auth.users WHERE email = trim(csv_row) LIMIT 1;
    
    IF existing_id IS NULL THEN
      -- Pega ID do public.profiles existente
      SELECT id INTO new_uid FROM public.profiles WHERE email = trim(csv_row) LIMIT 1;
      IF new_uid IS NULL THEN
         new_uid := gen_random_uuid();
      END IF;

      -- A. CRIA O LOGIN NATIVO E DESTRAVA TUDO
      INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password, 
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
          new_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', trim(csv_row), 
          '$2b$10$vwWNnKCArbaf.EOBecweOemBI7QUgY9CEMo3MVazy.A0dsKmBLd.a', 
          now(), '{"provider": "email", "providers": ["email"]}'::jsonb, 
          '{}'::jsonb, now(), now()
      );

      -- B. CRIA A IDENTIDADE
      INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
      VALUES (gen_random_uuid(), new_uid::text, new_uid, jsonb_build_object('sub', new_uid::text, 'email', trim(csv_row)), 'email', now(), now())
      ON CONFLICT DO NOTHING;
    ELSE
      new_uid := existing_id;
      UPDATE auth.users 
      SET encrypted_password = '$2b$10$vwWNnKCArbaf.EOBecweOemBI7QUgY9CEMo3MVazy.A0dsKmBLd.a',
          raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = new_uid;
    END IF;

    -- C. ATUALIZA O PERFIL DE VOLTA PARA ATIVO
    UPDATE public.profiles 
    SET status = 'ativo', onboarded = true
    WHERE id = new_uid;

    -- D. ASSINA A PERMISSÃO DEFAULT
    INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'user') ON CONFLICT DO NOTHING;
    
  END LOOP;
END $$;`;

fs.writeFileSync('rebuild_login_war_room.sql', sql);
console.log('Script gerado com sucesso! ' + emails.length + ' emails processados.');
