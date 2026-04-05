import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import InsanoLogo from "@/components/InsanoLogo";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import authBg from "@/assets/login-bg.avif";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase handles the token exchange automatically via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success("Senha redefinida com sucesso!");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={authBg} alt="" fetchPriority="high" loading="eager" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center"
      >
        <InsanoLogo size={80} className="mx-auto mb-4" showText={false} />
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-6" />

        {success ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Senha redefinida! 🎉</h2>
            <p className="text-white/70 text-sm">Redirecionando para o login...</p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </motion.div>
        ) : !sessionReady ? (
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-white/70 text-sm">Verificando link de redefinição...</p>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="w-full space-y-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Nova senha</h2>
            <p className="text-white/60 text-sm text-center">
              Digite sua nova senha abaixo.
            </p>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 py-6 bg-card/80 border-border text-white placeholder:text-white/40 rounded-xl"
                required
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 py-6 bg-card/80 border-border text-white placeholder:text-white/40 rounded-xl"
                required
                autoComplete="new-password"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 crimson-gradient text-white font-cinzel font-bold rounded-xl crimson-shadow tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> REDEFININDO...
                </>
              ) : (
                "REDEFINIR SENHA"
              )}
            </motion.button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default RedefinirSenha;
