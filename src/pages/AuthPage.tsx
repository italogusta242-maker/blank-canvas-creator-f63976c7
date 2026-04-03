import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, Phone, CheckCircle } from "lucide-react";
import InsanoLogo from "@/components/InsanoLogo";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Login background image placeholder — replace with official image later

const AuthPage = () => {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Reset password state
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Bypass state
  const [bypassMode, setBypassMode] = useState(false);
  const [bypassEmail, setBypassEmail] = useState("");
  const [bypassLoading, setBypassLoading] = useState(false);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pending_email");
    if (pendingEmail) setEmail(pendingEmail);
  }, []);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error === "Invalid login credentials") {
        toast.error("Email ou senha incorretos. Verifique seus dados ou redefina sua senha.");
      } else if (error.includes("Email not confirmed")) {
        toast.error("Email não confirmado. Verifique sua caixa de entrada.");
      } else if (error.includes("too many requests")) {
        toast.error("Muitas tentativas. Aguarde alguns minutos.");
      } else {
        toast.error(error);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.includes("@")) { toast.error("Informe um email válido"); return; }
    if (resetPhone.replace(/\D/g, "").length < 10) { toast.error("Informe um telefone válido"); return; }
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password-verify", {
        body: { email: resetEmail.toLowerCase().trim(), telefone: resetPhone, newPassword },
      });

      console.log("reset-password-verify response:", { data, error });

      if (error) {
        // Edge function returned non-2xx - try to parse error body
        const errMsg = typeof error === 'object' && error?.message ? error.message : "Erro ao redefinir senha. Verifique seus dados.";
        toast.error(errMsg);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        setResetSuccess(true);
        toast.success("Senha redefinida com sucesso!");
        setTimeout(() => {
          setResetMode(false);
          setResetSuccess(false);
          setEmail(resetEmail);
          setResetEmail("");
          setResetPhone("");
          setNewPassword("");
          setConfirmPassword("");
        }, 2000);
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    }
    setResetLoading(false);
  };

  const handleBypassLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassEmail.includes("@")) { toast.error("Informe um email válido"); return; }
    
    setBypassLoading(true);
    try {
      const emailLower = bypassEmail.trim().toLowerCase();
      
      const { data, error } = await supabase.functions.invoke('verify-bypass-email', {
        body: { email: emailLower }
      });
      
      if (error || !data?.allowed) {
        toast.error(data?.error || "E-mail não encontrado em nossa base de dados. Verifique a ortografia ou use o e-mail exato da compra.");
        setBypassLoading(false);
        return;
      }

      // Record the bypass log
      await supabase.from("webhook_logs").insert({
          email: emailLower,
          event_type: "emergency_bypass",
          status_log: "bypass_acionado",
          raw_payload: { 
            message: `Bypass acionado para o e-mail ${emailLower}`, 
            source: data.found_in,
            timestamp: new Date().toISOString()
          }
      });

      // Set the emergency session and violently transition to /cronometro
      localStorage.setItem("emergency_bypass_email", emailLower);
      window.location.href = "/cronometro";
    } catch (err: any) {
      toast.error("Erro ao verificar acesso restrito. Tente novamente.");
      setBypassLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[hsl(0,0%,8%)]">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }} className="mb-4">
          <InsanoLogo size={120} className="mx-auto" showText={false} />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.25 }} className="font-cinzel text-sm text-white tracking-[0.3em] uppercase mb-2 text-center">
          ANAAC Club
        </motion.p>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-6" />

        {resetMode ? (
          resetSuccess ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-white text-sm">Senha redefinida! Voltando ao login...</p>
            </motion.div>
          ) : (
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} onSubmit={handleResetPassword} className="w-full space-y-3">
              <p className="text-white/80 text-sm text-center mb-2">
                Confirme seus dados de cadastro para redefinir sua senha.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type="email" placeholder="Email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="email" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type="tel" placeholder="Telefone" value={resetPhone} onChange={(e) => setResetPhone(formatPhone(e.target.value))} className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="tel" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type={showNewPassword ? "text" : "password"} placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black">
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type={showNewPassword ? "text" : "password"} placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="new-password" />
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={resetLoading} className="w-full py-4 crimson-gradient text-white font-cinzel font-bold rounded-xl crimson-shadow tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {resetLoading ? <><Loader2 size={18} className="animate-spin" /> REDEFININDO...</> : "REDEFINIR SENHA"}
              </motion.button>
              <button type="button" onClick={() => setResetMode(false)} className="w-full text-white/60 hover:text-white text-xs text-center py-2 transition-colors">
                ← Voltar ao login
              </button>
            </motion.form>
          )
        ) : bypassMode ? (
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} onSubmit={handleBypassLogin} className="w-full space-y-4">
            <p className="text-white/80 text-sm text-center mb-4 leading-relaxed">
              Sistema de <strong className="text-pink-400">Primeiro Acesso</strong> ativado.<br/>Insira o e-mail que você utilizou no momento da compra.
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
              <Input type="email" placeholder="E-mail de cadastro" value={bypassEmail} onChange={(e) => setBypassEmail(e.target.value)} className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="email" />
            </div>
            
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={bypassLoading} className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-cinzel font-bold rounded-xl shadow-lg shadow-pink-500/20 tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {bypassLoading ? <><Loader2 size={18} className="animate-spin" /> VERIFICANDO...</> : "ACESSAR PLATAFORMA"}
            </motion.button>
            <button type="button" onClick={() => setBypassMode(false)} className="w-full text-white/60 hover:text-white text-xs text-center py-2 transition-colors">
              ← Voltar ao login normal
            </button>
          </motion.form>
        ) : (
          <>
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.25 }} onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="email" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" size={18} />
                <Input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 py-6 bg-card/80 border-border text-black placeholder:text-black/40 rounded-xl" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full py-4 crimson-gradient text-white font-cinzel font-bold rounded-xl crimson-shadow tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> ENTRANDO...</> : "ENTRAR"}
              </motion.button>
            </motion.form>

            <div className="flex flex-col gap-2 mt-4 text-center">
              <a href="/esqueci-minha-senha" className="text-white/60 hover:text-white text-xs py-1 transition-colors">
                Esqueci minha senha
              </a>
              <button onClick={() => setBypassMode(true)} className="text-white/40 hover:text-white text-[11px] underline underline-offset-2 py-1 transition-colors">
                Problemas de acesso após a compra? (Primeiro Acesso)
              </button>
            </div>
          </>
        )}

        <p className="text-white/40 text-xs text-center mt-6 font-cinzel tracking-wider">
          "Grandes resultados exigem consistência.<br />Sua transformação começa agora."
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
