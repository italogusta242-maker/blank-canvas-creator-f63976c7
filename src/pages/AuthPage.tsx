import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import InsanoLogo from "@/components/InsanoLogo";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const NETWORK_ERROR_PATTERNS = [
  /load failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /tempo limite excedido/i,
  /timeout/i,
  /aborterror/i,
];

const isNetworkError = (msg: string) => NETWORK_ERROR_PATTERNS.some((re) => re.test(msg));

const translateError = (msg: string): string => {
  if (!msg) return "Erro ao fazer login.";
  if (isNetworkError(msg)) {
    return "Falha de conexão. Verifique seu 4G/Wi-Fi e tente novamente.";
  }
  if (/invalid login credentials|invalid_grant/i.test(msg)) {
    return "E-mail ou senha incorretos.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  return msg;
};

const AuthPage = () => {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const attemptSignIn = async (cleanEmail: string, pwd: string) => {
    return await signIn(cleanEmail, pwd);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      let { error } = await attemptSignIn(cleanEmail, password);

      // Retry once on network errors (not on credential errors)
      if (error && isNetworkError(error)) {
        console.warn("[AuthPage] network error on first attempt, retrying...", { email: cleanEmail, message: error });
        await new Promise((r) => setTimeout(r, 800));
        ({ error } = await attemptSignIn(cleanEmail, password));
      }

      if (error) {
        console.error("[AuthPage] sign-in failed", {
          email: cleanEmail,
          errorType: isNetworkError(error) ? "network" : "credential",
          message: error,
        });
        setErrorMsg(translateError(error));
      }
    } catch (err: any) {
      const raw = err?.message ?? "Erro de conexão.";
      console.error("[AuthPage] sign-in exception", { email: cleanEmail, message: raw, stack: err?.stack });
      setErrorMsg(translateError(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[hsl(0,0%,8%)]">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center"
      >
        <InsanoLogo size={100} className="mx-auto mb-3" showText={false} />
        <p className="font-cinzel text-sm text-white tracking-[0.3em] uppercase mb-1 text-center">
          ANAAC Club
        </p>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-6" />

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-xs font-mono break-all">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl"
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 crimson-gradient text-white font-cinzel font-bold rounded-xl crimson-shadow tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> ENTRANDO...</>
            ) : (
              "ENTRAR"
            )}
          </motion.button>
        </form>

        <div className="flex flex-col gap-2 mt-4 text-center">
          <a
            href="/esqueci-minha-senha"
            className="text-white/60 hover:text-white text-xs py-1 transition-colors"
          >
            Esqueci minha senha
          </a>
        </div>

        <p className="text-white/40 text-xs text-center mt-6 font-cinzel tracking-wider">
          "Grandes resultados exigem consistência.<br />Sua transformação começa agora."
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
