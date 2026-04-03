import { create } from "zustand";

// ── Types ──────────────────────────────────────────────
export type FunnelStep = "modern" | "vsl" | "cadastro" | "planos" | "membros";

export interface FunnelUser {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  cupom: string;
}

export interface FunnelPlan {
  id: string;
  label: string;
  months: number;
  price: number;
  originalPrice?: number;
  priceLabel: string;
  originalPriceLabel?: string;
  highlight?: boolean;
  badge?: string;
  checkoutUrl: string;
  benefits: string[];
}

interface FunnelState {
  step: FunnelStep;
  goTo: (step: FunnelStep) => void;
  next: () => void;

  user: FunnelUser;
  setUser: (partial: Partial<FunnelUser>) => void;

  selectedPlan: FunnelPlan | null;
  setSelectedPlan: (plan: FunnelPlan) => void;

  couponDiscount: number | null;
  setCouponDiscount: (d: number | null) => void;

  persistCheckout: () => void;
  restoreCheckout: () => void;
  clearCheckout: () => void;

  reset: () => void;
}

const STEP_ORDER: FunnelStep[] = ["modern", "vsl", "cadastro", "planos", "membros"];

// ── Base plans (regular prices & links) ──
const BASE_PLANS = [
  {
    id: "mensal",
    label: "Mensal",
    months: 1,
    price: 39.9,
    checkoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/3led6EKG9p",
    discountCheckoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/NNrb0KZgt",
    discountPrice: 35.9,
    benefits: [
      "Gerenciador de treinos (iniciante ao avançado)",
      "Guia alimentar completo + substituições",
      "Monitoramento de hábitos e checklist do desafio",
      "Grupo de apoio entre mulheres",
      "Desafios com níveis + sorteios de premiações",
      "Rede social interna",
    ],
  },
  {
    id: "trimestral",
    label: "3 Meses",
    months: 3,
    price: 109,
    checkoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/2VllE5N1U9",
    discountCheckoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/1VXSl9QwRF",
    discountPrice: 98,
    highlight: true,
    badge: "MELHOR CUSTO-BENEFÍCIO",
    benefits: [
      "Gerenciador de treinos (iniciante ao avançado)",
      "Guia alimentar completo + substituições",
      "Monitoramento de hábitos e checklist do desafio",
      "Grupo de apoio entre mulheres",
      "Desafios com níveis + sorteios de premiações",
      "Rede social interna",
      "🎁 Desconto em todas as renovações",
    ],
  },
  {
    id: "semestral",
    label: "6 Meses",
    months: 6,
    price: 197,
    checkoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/3tGdFPNgP",
    discountCheckoutUrl: "https://invoice.infinitepay.io/plans/anaacclub/3lqfTLOy8R",
    discountPrice: 177,
    benefits: [
      "Gerenciador de treinos (iniciante ao avançado)",
      "Guia alimentar completo + substituições",
      "Monitoramento de hábitos e checklist do desafio",
      "Grupo de apoio entre mulheres",
      "Desafios com níveis + sorteios de premiações",
      "Rede social interna",
      "🎁 Desconto em todas as renovações",
    ],
  },
];

const formatBRL = (v: number) =>
  `R$ ${v.toFixed(2).replace(".", ",")}`;

export const getPlans = (discountPercent: number | null): FunnelPlan[] => {
  return BASE_PLANS.map((p) => {
    if (discountPercent && discountPercent > 0) {
      return {
        ...p,
        originalPrice: p.price,
        originalPriceLabel: formatBRL(p.price),
        price: p.discountPrice,
        priceLabel: formatBRL(p.discountPrice),
        checkoutUrl: p.discountCheckoutUrl,
        badge: p.highlight ? "DESCONTO EXCLUSIVO 🔥" : undefined,
      };
    }
    return {
      ...p,
      priceLabel: formatBRL(p.price),
    };
  });
};

export const DEFAULT_PLANS = getPlans(null);

const initialUser: FunnelUser = { nome: "", email: "", telefone: "", senha: "", cupom: "" };
const STORAGE_KEY = "funnel_checkout_state";

export const useFunnelStore = create<FunnelState>((set, get) => ({
  step: "modern",
  goTo: (step) => set({ step }),
  next: () => {
    const idx = STEP_ORDER.indexOf(get().step);
    if (idx < STEP_ORDER.length - 1) set({ step: STEP_ORDER[idx + 1] });
  },

  user: { ...initialUser },
  setUser: (partial) => set((s) => ({ user: { ...s.user, ...partial } })),

  selectedPlan: null,
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),

  couponDiscount: null,
  setCouponDiscount: (d) => set({ couponDiscount: d }),

  persistCheckout: () => {
    const { selectedPlan, user } = get();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedPlan, user })); } catch {}
  },
  restoreCheckout: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.selectedPlan) set({ selectedPlan: data.selectedPlan });
      if (data.user) set((s) => ({ user: { ...s.user, ...data.user } }));
    } catch {}
  },
  clearCheckout: () => { localStorage.removeItem(STORAGE_KEY); },
  reset: () => set({ step: "vsl", user: { ...initialUser }, selectedPlan: null, couponDiscount: null }),
}));
