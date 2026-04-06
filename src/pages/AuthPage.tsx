import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import InsanoLogo from "@/components/InsanoLogo";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type AuthTab = "login" | "signup";

const AuthPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AuthTab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      // AuthContext listener will pick up session and redirect
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setErrorMsg("Conta criada mas não foi possível obter o ID. Tente fazer login.");
        return;
      }

      // Insert profile
      const { error: profileErr } = await supabase.from("profiles").upsert(
        {
          id: userId,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          status: "active",
          onboarded: true,
        },
        { onConflict: "id" }
      );
      if (profileErr) {
        console.error("Profile insert error:", profileErr);
        setErrorMsg(`Perfil: ${profileErr.message}`);
        return;
      }

      // Insert admin role
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );
      if (roleErr) {
        console.error("Role insert error:", roleErr);
        setErrorMsg(`Role: ${roleErr.message}`);
        return;
      }

      toast.success("Conta criada com sucesso!");
      // AuthContext will detect the session and redirect
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao criar conta.");
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

        {/* Tabs */}
        <div className="flex w-full mb-6 rounded-xl overflow-hidden border border-white/10">
          <button
            type="button"
            onClick={() => { setTab("login"); resetForm(); }}
            className={`flex-1 py-3 text-sm font-cinzel font-bold tracking-wider transition-colors ${
              tab === "login"
                ? "bg-accent text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); resetForm(); }}
            className={`flex-1 py-3 text-sm font-cinzel font-bold tracking-wider transition-colors ${
              tab === "signup"
                ? "bg-accent text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            CRIAR CONTA
          </button>
        </div>

        {/* Error display */}
        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-xs font-mono break-all">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={tab === "login" ? handleLogin : handleSignUp}
          className="w-full space-y-4"
        >
          {tab === "signup" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
              <Input
                type="text"
                placeholder="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl"
                required
                autoComplete="name"
              />
            </div>
          )}

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
              autoComplete={tab === "login" ? "current-password" : "new-password"}
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
              <><Loader2 size={18} className="animate-spin" /> {tab === "login" ? "ENTRANDO..." : "CRIANDO..."}</>
            ) : (
              tab === "login" ? "ENTRAR" : "CRIAR CONTA"
            )}
          </motion.button>
        </form>

        {tab === "login" && (
          <div className="flex flex-col gap-2 mt-4 text-center">
            <a
              href="/esqueci-minha-senha"
              className="text-white/60 hover:text-white text-xs py-1 transition-colors"
            >
              Esqueci minha senha
            </a>
          </div>
        )}

        <p className="text-white/40 text-xs text-center mt-6 font-cinzel tracking-wider">
          "Grandes resultados exigem consistência.<br />Sua transformação começa agora."
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
