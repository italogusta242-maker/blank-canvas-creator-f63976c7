/**
 * Espelha o token de sessão do Supabase entre localStorage e um cookie
 * de longa duração. Isso protege o login contra a Intelligent Tracking
 * Prevention (ITP) do Safari, que apaga localStorage após ~7 dias sem
 * visita — fazendo a aluna "perder o login" toda vez.
 *
 * Como o cliente Supabase é gerado automaticamente (read-only), não
 * podemos plugar um storage adapter customizado. Em vez disso, sincronizamos
 * passivamente: lemos do cookie no boot (se localStorage estiver vazio)
 * e gravamos no cookie sempre que o token muda.
 */
import { supabase } from "@/integrations/supabase/client";

const PROJECT_REF = "iimkmfhgjupjvrsseqro";
const TOKEN_KEY = `sb-${PROJECT_REF}-auth-token`;
const COOKIE_KEY = `sb_auth_${PROJECT_REF}`;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // Cookie pode estourar ~4KB — corta valores muito grandes
  if (value.length > 3800) return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Restaura o token do cookie para o localStorage caso ele tenha sido
 * limpo pelo navegador. Deve rodar ANTES do client Supabase tentar
 * hidratar a sessão.
 */
export function restoreSessionFromCookie() {
  if (typeof window === "undefined") return;
  try {
    const ls = localStorage.getItem(TOKEN_KEY);
    if (ls) return; // já tem, nada a restaurar
    const cookie = readCookie(COOKIE_KEY);
    if (cookie) {
      localStorage.setItem(TOKEN_KEY, cookie);
      console.info("[sessionPersistence] sessão restaurada do cookie");
    }
  } catch {
    // localStorage indisponível (modo privado)
  }
}

/**
 * Acompanha mudanças de auth e mantém o cookie em sincronia com o
 * localStorage. Idempotente.
 */
let attached = false;
export function startSessionPersistence() {
  if (attached) return;
  attached = true;

  supabase.auth.onAuthStateChange((event, session) => {
    try {
      if (event === "SIGNED_OUT" || !session) {
        deleteCookie(COOKIE_KEY);
        return;
      }
      // Lê o que o SDK acabou de salvar no localStorage e mirra no cookie
      const raw = localStorage.getItem(TOKEN_KEY);
      if (raw) writeCookie(COOKIE_KEY, raw);
    } catch {
      // ignore
    }
  });

  // Sincroniza periodicamente (autoRefreshToken atualiza o token a cada ~50min)
  setInterval(() => {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (raw) writeCookie(COOKIE_KEY, raw);
    } catch {
      // ignore
    }
  }, 60_000);
}
