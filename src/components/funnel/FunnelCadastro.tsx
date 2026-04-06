import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, ArrowRight, Tag } from "lucide-react";
import { useFunnelStore } from "@/stores/useFunnelStore";
import { supabase } from "@/integrations/supabase/client";
import InsanoLogo from "@/components/InsanoLogo";

const FunnelCadastro = () => {
  const { setUser, next } = useFunnelStore();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    senha: "",
    cupom: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleChange = (field: string, value: string) => {
    if (field === "phone") value = formatPhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Informe seu nome";
    if (!form.email.includes("@")) e.email = "Email inválido";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    if (form.senha.length < 6) e.senha = "Mínimo 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Save lead (upsert on email to avoid duplicates)
      const { error: leadError } = await supabase.from("funnel_leads").upsert(
        {
          full_name: form.full_name,
          email: form.email.toLowerCase(),
          phone: form.phone,
          cupom: form.cupom || null,
          status: "pending",
        },
        { onConflict: "email" }
      );
      if (leadError) console.warn("Lead upsert error:", leadError.message);

      // 2. Create real Auth account BEFORE checkout
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: { full_name: form.full_name },
        },
      });

      if (authError) {
        if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
          // User exists — sync password via edge function (with security guardrail)
          try {
            const { data: upsertData, error: upsertError } = await supabase.functions.invoke("upsert-auth-user", {
              body: { email: form.email.toLowerCase(), password: form.senha, full_name: form.full_name },
            });
            if (upsertError || upsertData?.error) {
              const msg = upsertData?.error || upsertError?.message || "Erro ao sincronizar conta";
              console.warn("upsert-auth-user:", msg);
              // If user is active, show friendly error
              if (msg.includes("assinatura ativa")) {
                setErrors({ email: "Este email já possui conta ativa. Faça login." });
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn("upsert-auth-user call failed:", err);
          }
        } else {
          console.error("SignUp error:", authError.message);
          setErrors({ email: authError.message });
          setLoading(false);
          return;
        }
      }

      // 3. If user was created, update profile with phone and status pendente
      if (authData?.user?.id) {
        await supabase.from("profiles").update({
          phone: form.phone,
          status: "pendente",
        }).eq("id", authData.user.id);
      }

      // 4. Sign out immediately to prevent AuthContext from redirecting away from funnel
      await supabase.auth.signOut();

      // 5. Store credentials for auto-login after payment
      localStorage.setItem("pending_email", form.email);
      localStorage.setItem("pending_password", form.senha);

    } catch (err) {
      console.warn("Failed during signup:", err);
    }

    setUser(form);
    setLoading(false);
    next();
  };

  const inputFields = [
    { key: "full_name", label: "Nome completo", type: "text", icon: User, autoComplete: "name" },
    { key: "email", label: "Email", type: "email", icon: Mail, autoComplete: "email" },
    { key: "phone", label: "Telefone", type: "tel", icon: Phone, autoComplete: "tel" },
    { key: "senha", label: "Senha", type: showPassword ? "text" : "password", icon: Lock, autoComplete: "new-password", hasToggle: true },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* ── Top decorative gradient ── */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
        <div className="w-full max-w-md">
          {/* ── Header ── */}
          <div className="text-center mb-4">
            <InsanoLogo size={40} className="mx-auto" />
            <h1 className="text-xl font-bold text-foreground mt-2 font-sans">
              Crie sua conta
            </h1>
            <p className="text-muted-foreground text-xs">
              Preencha seus dados para acessar o aplicativo
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {inputFields.map(({ key, label, type, icon: Icon, autoComplete, hasToggle }) => (
              <div key={key}>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type={type}
                    placeholder={label}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    autoComplete={autoComplete}
                    className={`
                      w-full pl-10 ${hasToggle ? "pr-10" : "pr-3"} py-3
                      bg-card border rounded-xl
                      text-foreground placeholder-muted-foreground/50
                      text-sm transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                      ${errors[key] ? "border-destructive/50" : "border-border"}
                    `}
                  />
                  {hasToggle && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {errors[key] && (
                  <p className="text-destructive text-[10px] mt-0.5 pl-3">{errors[key]}</p>
                )}
              </div>
            ))}

            {/* ── Coupon field (optional) ── */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Cupom de desconto (opcional)"
                value={form.cupom}
                onChange={(e) => handleChange("cupom", e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground/50 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* ── Submit button ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 rounded-xl text-primary-foreground font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-primary hover:bg-primary/90 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted-foreground/40 text-[10px] mt-3">
            Seus dados estão protegidos e seguros 🔒
          </p>
        </div>
      </div>
    </div>
  );
};

export default FunnelCadastro;
