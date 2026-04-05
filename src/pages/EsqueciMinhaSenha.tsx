import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import InsanoLogo from "@/components/InsanoLogo";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import authBg from "@/assets/login-bg.avif";

const EsqueciMinhaSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Informe um email válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
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

        {sent ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Email enviado! 📧</h2>
            <p className="text-white/70 text-sm max-w-xs">
              Verifique sua caixa de entrada (e o spam). Clique no link do email para redefinir sua senha.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mt-4 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao login
            </Link>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="w-full space-y-4"
          >
            <h2 className="text-xl font-bold text-white text-center">Esqueceu sua senha?</h2>
            <p className="text-white/60 text-sm text-center">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 py-6 bg-card/80 border-border text-white placeholder:text-white/40 rounded-xl"
                required
                autoComplete="email"
                autoFocus
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
                  <Loader2 size={18} className="animate-spin" /> ENVIANDO...
                </>
              ) : (
                "ENVIAR LINK DE REDEFINIÇÃO"
              )}
            </motion.button>

            <Link
              to="/"
              className="block text-center text-white/60 hover:text-white text-xs py-2 transition-colors"
            >
              ← Voltar ao login
            </Link>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default EsqueciMinhaSenha;
