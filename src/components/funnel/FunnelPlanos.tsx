import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Zap, Star, Dumbbell, Utensils, Users, TrendingUp, Trophy, MessageCircle, Gift, ClipboardCheck, ChevronDown } from "lucide-react";
import {
  useFunnelStore,
  getPlans,
  type FunnelPlan,
} from "@/stores/useFunnelStore";
import { supabase } from "@/integrations/supabase/client";

const planIcons = [Zap, Crown, Star];

const benefitIcons: Record<string, any> = {
  "Gerenciador de treinos (iniciante ao avançado)": Dumbbell,
  "Guia alimentar completo + substituições": Utensils,
  "Monitoramento de hábitos e checklist do desafio": ClipboardCheck,
  "Grupo de apoio entre mulheres": Users,
  "Desafios com níveis + sorteios de premiações": Trophy,
  "Rede social interna": MessageCircle,
  "🎁 Desconto em todas as renovações": Gift,
};

const FunnelPlanos = () => {
  const { selectedPlan, setSelectedPlan, user, couponDiscount, setCouponDiscount } = useFunnelStore();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Validate coupon against DB on mount
  useEffect(() => {
    const validateCoupon = async () => {
      const code = user.cupom?.trim().toUpperCase();
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
  }, [user.cupom, setCouponDiscount]);

  const plans = getPlans(couponDiscount);

  const handleSelect = (plan: FunnelPlan) => {
    setSelectedPlan(plan);
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    // Credentials already stored in FunnelCadastro, just ensure they're set
    localStorage.setItem("pending_email", user.email);
    localStorage.setItem("pending_password", user.senha);
    localStorage.setItem("post_payment_redirect", "true");

    // Save selected plan to funnel_leads BEFORE redirect (upsert because user is anon — RLS blocks UPDATE)
    try {
      const { error } = await supabase.from("funnel_leads").upsert(
        {
          full_name: user.full_name,
          email: user.email.toLowerCase(),
          phone: user.phone || null,
          cupom: user.cupom || null,
          status: "pending",
          selected_plan_id: selectedPlan.id,
          selected_plan_price: selectedPlan.price,
        },
        { onConflict: "email" }
      );
      if (error) console.warn("Failed to upsert lead plan:", error.message);
    } catch (err) {
      console.warn("Failed to update lead:", err);
    }

    // Redirect to checkout
    const url = selectedPlan.checkoutUrl;
    if (url && url !== "#") {
      window.location.href = url;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-y-auto">
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center px-3 py-3 min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold text-foreground mb-0.5 font-sans">
              Escolha seu plano
            </h1>
            <p className="text-muted-foreground text-xs">
              {couponDiscount
                ? `🔥 Cupom "${user.cupom}" — ${couponDiscount}% OFF!`
                : "Selecione o melhor plano para você"}
            </p>
          </div>

          <div className="space-y-2.5 mb-4">
            {plans.map((plan, i) => {
              const Icon = planIcons[i] ?? Zap;
              const isSelected = selectedPlan?.id === plan.id;
              const isHighlight = plan.highlight;

              return (
                <motion.button
                  key={plan.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                  onClick={() => handleSelect(plan)}
                  className={`
                    w-full relative p-3 rounded-xl border-2 transition-all duration-200 text-left
                    ${isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : isHighlight
                        ? "border-primary/30 bg-card"
                        : "border-border bg-card"
                    }
                  `}
                >
                  {plan.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider text-primary-foreground bg-primary">
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary/15" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-semibold text-sm leading-tight">{plan.label}</h3>
                      <p className="text-muted-foreground text-[10px]">
                        {plan.months === 1
                          ? "Cobrança mensal"
                          : `${plan.months}x de R$ ${(plan.price / plan.months).toFixed(2).replace(".", ",")}/mês`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {plan.originalPriceLabel && (
                        <span className="text-muted-foreground text-[10px] line-through block">{plan.originalPriceLabel}</span>
                      )}
                      <span className={`text-base font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {plan.priceLabel}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPlan(expandedPlan === plan.id ? null : plan.id);
                    }}
                    className="w-full flex items-center justify-center pt-1"
                  >
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedPlan === plan.id ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {expandedPlan === plan.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-1 pt-2 pl-0.5">
                          {plan.benefits.map((benefit) => {
                            const BIcon = benefitIcons[benefit] || Check;
                            return (
                              <div key={benefit} className="flex items-center gap-1.5">
                                <BIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/60"}`} />
                                <span className="text-[10px] text-muted-foreground">{benefit}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={selectedPlan ? { scale: 0.98 } : undefined}
            onClick={handleCheckout}
            disabled={!selectedPlan}
            className={`
              w-full py-3 rounded-xl font-bold text-sm tracking-wide
              flex items-center justify-center gap-2 transition-all duration-300
              ${selectedPlan
                ? "bg-primary text-primary-foreground cursor-pointer shadow-lg hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {selectedPlan ? "Ir para Checkout →" : "Selecione um plano"}
          </motion.button>

          <p className="text-center text-muted-foreground/50 text-[10px] mt-2">
            Você será redirecionada para a página de pagamento seguro
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default FunnelPlanos;
