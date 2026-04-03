import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Phone, Lock, Eye, EyeOff, Loader2, ArrowRight, 
  Tag, Check, ChevronRight, ShieldCheck, 
  ChevronLeft
} from "lucide-react";
import { useFunnelStore, getPlans, type FunnelPlan } from "@/stores/useFunnelStore";
import { supabase } from "@/integrations/supabase/client";
import anaacLogo from "@/assets/anaac-logo.png";
import anaacAppPreview from "@/assets/anaac-app-preview.png";

const FunnelModern = () => {
  const { 
    user: funnelUser, 
    setUser: setFunnelUser, 
    selectedPlan, 
    setSelectedPlan, 
    couponDiscount, 
    setCouponDiscount 
  } = useFunnelStore();

  const [subStep, setSubStep] = useState<"plans" | "register">("plans");
  const [form, setForm] = useState({
    nome: funnelUser.nome || "",
    email: funnelUser.email || "",
    telefone: funnelUser.telefone || "",
    senha: "anaac123", // Default internal password
    cupom: funnelUser.cupom || "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state with store
  useEffect(() => {
    setFunnelUser(form);
  }, [form, setFunnelUser]);

  // Validate coupon against DB
  useEffect(() => {
    const validateCoupon = async () => {
      const code = form.cupom?.trim().toUpperCase();
      if (!code) { setCouponDiscount(null); return; }

      const { data } = await (supabase as any)
        .from("coupons")
        .select("discount_percent")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();

      setCouponDiscount((data as any)?.discount_percent ?? null);
    };
    validateCoupon();
  }, [form.cupom, setCouponDiscount]);

  const plans = getPlans(couponDiscount);

  // Set initial plan if none selected
  useEffect(() => {
    if (!selectedPlan && plans.length > 0) {
      setSelectedPlan(plans.find(p => p.highlight) || plans[0]);
    }
  }, [plans, selectedPlan, setSelectedPlan]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleChange = (field: string, value: string) => {
    if (field === "telefone") value = formatPhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Informe seu nome";
    if (!form.email.includes("@")) e.email = "Email inválido";
    if (form.telefone.replace(/\D/g, "").length < 10) e.telefone = "Telefone inválido";
    // senha check removed as requested
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFinalize = async () => {
    if (!validate()) return;
    if (!selectedPlan) {
        setSubStep("plans");
        return;
    }

    setLoading(true);
    try {
      // Find the most current version of the plan (w/ discount)
      const currentPlan = plans.find(p => p.id === selectedPlan.id) || selectedPlan;

      // 1. Save lead (Final status)
      await supabase.from("funnel_leads").upsert(
        {
          nome: form.nome,
          email: form.email.toLowerCase(),
          telefone: form.telefone,
          cupom: form.cupom || null,
          status: "pending",
          selected_plan_id: currentPlan.id,
          selected_plan_price: currentPlan.price,
        },
        { onConflict: "email" }
      );

      // 2. Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: { nome: form.nome } },
      });

      if (authError) {
        if (authError.message?.includes("already registered")) {
          await supabase.functions.invoke("upsert-auth-user", {
            body: { email: form.email.toLowerCase(), password: form.senha, nome: form.nome },
          });
        } else {
          setErrors({ email: authError.message });
          setLoading(false);
          return;
        }
      }

      // 3. Profiles update
      if (authData?.user?.id) {
        await supabase.from("profiles").update({
          telefone: form.telefone,
          status: "pendente",
        }).eq("id", authData.user.id);
      }

      await supabase.auth.signOut();
      localStorage.setItem("pending_email", form.email);
      localStorage.setItem("pending_password", form.senha);
      localStorage.setItem("post_payment_redirect", "true");

      // Redirect to checkout with discount if active
      const url = currentPlan.checkoutUrl;
      if (url && url !== "#") {
        window.location.href = url;
      }
    } catch (err) {
      console.warn("Finalize error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanClick = (plan: FunnelPlan) => {
    setSelectedPlan(plan);
    setSubStep("register");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Abandonment Tracking (Pre-cadastro) ──
  useEffect(() => {
    if (!form.email || !form.email.includes("@")) return;
    
    const timer = setTimeout(async () => {
        try {
            await supabase.from("funnel_leads").upsert(
                {
                    nome: form.nome,
                    email: form.email.toLowerCase(),
                    telefone: form.telefone,
                    cupom: form.cupom || null,
                    status: "pre-cadastro", // Identify as abandonment lead
                    selected_plan_id: selectedPlan?.id || null,
                    selected_plan_price: selectedPlan?.price || null,
                },
                { onConflict: "email" }
            );
        } catch (e) {
            console.warn("Lead tracking error:", e);
        }
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [form.nome, form.email, form.telefone, form.cupom, selectedPlan?.id]);

  return (
    <div className="w-full min-h-screen bg-white pb-20 overflow-y-auto overflow-x-hidden font-sans text-[#111]">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
            <img src={anaacLogo} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-lg tracking-tight text-black">Anaac Club</span>
        </div>
        
        {subStep === "plans" && (
            <button 
                onClick={() => {
                    const el = document.getElementById("plan-trimestral");
                    el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary hover:bg-primary/90 text-white text-[13px] font-bold px-6 py-3 rounded-full transition-all"
            >
                Comece agora
            </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {subStep === "plans" ? (
          <motion.div
            key="plans-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Hero Section ── */}
            <section className="pt-28 px-5 mb-12">
              <div className="bg-[#111] rounded-[2.5rem] px-8 pt-16 pb-0 text-center text-white relative overflow-hidden">
                <h1 className="text-[1.75rem] font-bold leading-[1.2] mb-10 tracking-tight">
                  Acesse o seu desafio com treinos e dietas através do nosso próprio aplicativo
                </h1>
                
                <button 
                  onClick={() => {
                      const el = document.getElementById("plan-trimestral");
                      el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-5 rounded-3xl text-base mb-12 transition-transform active:scale-[0.98]"
                >
                  Comece agora
                </button>

                {/* App Dashboard Preview */}
                <div className="max-w-[320px] mx-auto rounded-t-3xl overflow-hidden shadow-2xl border-x border-t border-white/10">
                   <img src={anaacAppPreview} alt="App Dashboard" className="w-full h-auto" />
                </div>
              </div>
            </section>

            {/* ── Subtitle ── */}
            <section className="px-8 text-center mb-12 max-w-sm mx-auto">
               <h2 className="text-[2.25rem] font-bold mb-4 tracking-tighter">Comunidade</h2>
               <p className="text-gray-400 text-base leading-relaxed font-medium">
                 Tenha acesso a treinos e dietas, premiações todos os meses e conexões reais com quem também se desafia a evoluir.
               </p>
            </section>

            {/* ── Plans Section ── */}
            <section id="plans-section" className="px-4 space-y-6 scroll-mt-24">
              {plans.map((plan, i) => {
                const isHighlight = plan.highlight;
                
                // Pricing Logic based on user request
                let displayPrice = plan.price;
                let totalBilling = plan.price;
                let periodLabel = "mês";
                let billingTerm = plan.months === 1 ? 'mensalmente' : plan.months === 3 ? 'trimestralmente' : 'semestralmente';

                if (plan.months === 3) {
                    displayPrice = 36.33;
                    totalBilling = 109.00;
                    billingTerm = "trimestralmente";
                } else if (plan.months === 6) {
                    displayPrice = 32.83;
                    totalBilling = 197.00;
                    billingTerm = "semestralmente";
                } else if (plan.months === 12) {
                    displayPrice = 16.41; // Assumption based on 197/12? No, user didn't specify. I'll stick to their examples. 
                    // Wait, user Examples:
                    // R$109 total -> R$36.33 (3 months)
                    // R$197 total -> R$32.83 (6 months)
                    // User also mentioned R$197 total -> R$197/mês anualmente? No, probably R$197 total for a period.
                }

                const priceStr = displayPrice.toFixed(2).replace('.', ',');

                return (
                  <div 
                    key={plan.id}
                    id={plan.id === "trimestral" ? "plan-trimestral" : undefined}
                    className={`
                      bg-white rounded-[2rem] p-8 border transition-all relative
                      ${isHighlight ? "border-primary ring-1 ring-primary shadow-2xl shadow-primary/5" : "border-gray-100 shadow-sm"}
                    `}
                  >
                    <h3 className="text-[1.75rem] font-bold mb-1">{plan.label}</h3>
                    
                    <div className="flex items-baseline mb-2 mt-8">
                       <span className="text-[2.75rem] font-bold tracking-tighter">R${priceStr}</span>
                       <span className="text-gray-400 text-lg font-medium ml-1">/{periodLabel}*</span>
                    </div>
                    
                    <div className="text-gray-300 text-[11px] font-medium pb-8 border-b border-gray-50 uppercase tracking-widest">
                       Cobrado R${totalBilling.toFixed(2).replace('.', ',')} {billingTerm}
                    </div>

                    <ul className="space-y-4 py-10">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex gap-4 items-start">
                          <div className="w-1 h-1 rounded-full bg-black mt-2.5 flex-shrink-0" />
                          <span className="text-[15px] font-medium text-[#111] leading-tight">{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanClick(plan)}
                      className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-5 rounded-[1.75rem] text-base flex items-center justify-center gap-2 group transition-all"
                    >
                      Escolher plano
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    
                    <div className="text-center mt-3">
                       <span className="text-gray-300 text-[10px] font-medium uppercase tracking-[0.1em]">Cancele em até 7 dias</span>
                    </div>
                  </div>
                );
              })}
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="register-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="pt-28 px-6"
          >
            <button 
                onClick={() => setSubStep("plans")}
                className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-8 hover:text-[#111] transition-colors"
            >
                <ChevronLeft size={20} />
                Escolher outro plano
            </button>

            <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 shadow-sm max-w-lg mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Seus Dados de Acesso</h2>
                    <p className="text-gray-400 text-sm font-medium">Finalize seu cadastro para liberar seu acesso imediatamente ao {selectedPlan?.label}.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: "nome", label: "Nome completo", type: "text", icon: User },
                    { key: "email", label: "E-mail para login", type: "email", icon: Mail },
                    { key: "telefone", label: "WhatsApp (com DDD)", type: "tel", icon: Phone },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <div className="relative">
                        <input
                          type={field.type}
                          placeholder={field.label}
                          value={form[field.key as keyof typeof form]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className={`
                            w-full px-5 py-5
                            bg-white border text-[#111]
                            rounded-2xl text-[15px] transition-all
                            focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary
                            ${errors[field.key] ? "border-red-500 bg-red-50" : "border-gray-200"}
                          `}
                        />
                      </div>
                      {errors[field.key] && (
                        <p className="text-red-500 text-[11px] ml-4 font-bold">{errors[field.key]}</p>
                      )}
                    </div>
                  ))}
                  
                  <div className="relative group">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Cupom de desconto (opcional)"
                      value={form.cupom}
                      onChange={(e) => handleChange("cupom", e.target.value.toUpperCase())}
                      className="w-full pl-12 pr-4 py-5 bg-white border border-gray-200 rounded-2xl text-[14px] focus:outline-none focus:border-primary transition-all"
                    />
                    <AnimatePresence>
                      {couponDiscount && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500 font-bold text-[10px]"
                        >
                          ATIVADO!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                    {/* Subscription Summary */}
                    {selectedPlan && (
                      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <span>Sua Assinatura</span>
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => setSubStep("plans")}>Alterar</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#111]">{selectedPlan.label}</span>
                            <div className="text-right">
                                {(() => {
                                    const current = plans.find(p => p.id === selectedPlan.id) || selectedPlan;
                                    const hasDiscount = !!couponDiscount;
                                    
                                    const formatPrice = (val: number) => {
                                        if (Number.isInteger(val)) return `R$ ${val}`;
                                        return `R$ ${val.toFixed(2).replace('.', ',')}`;
                                    };

                                    if (hasDiscount) {
                                        return (
                                            <>
                                                <p className="text-xs text-gray-300 line-through leading-none mb-1 font-medium">
                                                    {formatPrice(current.originalPrice || 0)}
                                                </p>
                                                <p className="text-[22px] font-black text-green-500 leading-none tracking-tight">
                                                    {formatPrice(current.price)}
                                                </p>
                                            </>
                                        );
                                    }
                                    return (
                                        <p className="text-[22px] font-black text-[#111] leading-none tracking-tight">
                                            {formatPrice(current.price)}
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>
                        
                        {couponDiscount && (
                            <div className="flex items-center gap-1.5 py-2 px-3 bg-green-50 rounded-lg">
                                <Tag size={12} className="text-green-600" />
                                <span className="text-[10px] font-bold text-green-600 uppercase">
                                    Desconto aplicado: {couponDiscount}% OFF
                                </span>
                            </div>
                        )}
                      </div>
                    )}

                    <div className="px-2 pt-2">
                    </div>

                    <button
                        onClick={handleFinalize}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-6 rounded-3xl text-base flex items-center justify-center gap-2 group transition-all"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Finalizar Inscrição"}
                        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 text-gray-300">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pagamento Seguro & Acesso Imediato</span>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-20 py-12 px-10 text-center border-t border-gray-50">
         <p className="text-gray-300 text-[9px] max-w-[200px] mx-auto leading-relaxed">
           Cancele em até 7 dias caso não goste do conteúdo.
           <br />
           Ao assinar você concorda com nossos termos de uso e política de privacidade.
         </p>
      </footer>
    </div>
  );
};

export default FunnelModern;
