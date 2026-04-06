export interface DietPlanType {
  title: string;
  totalCalories: number;
  meals: {
    time: string;
    name: string;
    options: {
      title: string;
      principal: string;
      substitutions: string;
    }[];
  }[];
  shoppingList: Record<string, string[]>;
}

export const DIET_1650: DietPlanType = {
  title: "Cardápio Personalizado - 1650 kcal",
  totalCalories: 1650,
  meals: [
    {
      time: "08:00",
      name: "Café da Manhã",
      options: [
        {
          title: "Opção 1: Pão com Ovo",
          principal: "Café (80ml), 2 Ovos de galinha (110g) ou Peito de frango desfiado (50g), Mamão (170g), 2 Fatias de Pão de forma integral (50g) e 1 Fatia pequena de Queijo minas meia cura (20g).",
          substitutions: "Chá preto (180ml); Melão (230g), Morango (200g) ou Banana prata (65g); Pão francês (50g), Cuscuz (90g) ou Tapioca (40g); Muçarela (15g), Creme de ricota light (30g) ou Cottage (30g)."
        },
        {
          title: "Opção 2: Smoothie",
          principal: "Café (80ml), Banana prata (65g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (25.5g) e Mel (15g).",
          substitutions: "Morango (200g), Mamão (170g) ou Maracujá (100g); Farelo de aveia (30g) ou Granola caseira (22g); Leite desnatado (240ml); Whey protein isolado (23g) ou Proteína vegetal (30g)."
        }
      ]
    },
    {
      time: "12:00",
      name: "Almoço",
      options: [
        {
          title: "Refeição Principal",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (100g) e Feijão carioca (97.5g). Sobremesa: Doce de leite (25g), Chocolate (15g) ou Paçoquinha (20g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (240g) ou Batata doce (160g); Feijão preto (97.5g) ou Lentilha (53g)."
        }
      ]
    },
    {
      time: "16:00",
      name: "Lanche da Tarde",
      options: [
        {
          title: "Opção 1: Sanduíche",
          principal: "Alface (20g), Tomate (45g), Maçã Fuji (90g), 2 Fatias de Pão integral (50g), Queijo minas (20g) e Frango desfiado (30g).",
          substitutions: "Rúcula (24g); Cenoura (34g) ou Pepino (50g); Tangerina (135g) ou Banana (65g); Pão francês (50g) ou Rap (40g); Muçarela (15g); Patinho moído (25g) ou Atum (32g)."
        },
        {
          title: "Opção 2: Iogurte",
          principal: "Uva (120g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (17g) e Mel (8g).",
          substitutions: "Maçã (90g) ou Morango (200g); Farelo de aveia (30g) ou Granola (22g); Whey isolado (15g)."
        }
      ]
    },
    {
      time: "20:00",
      name: "Jantar",
      options: [
        {
          title: "Opção 1: Comida",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (100g) e Feijão carioca (97.5g).",
          substitutions: "Rúcula (48g) ou Couve (40g); Tomate (90g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (240g); Feijão preto (97.5g)."
        },
        {
          title: "Opção 2: Hambúrguer Caseiro",
          principal: "Alface (20g), Tomate (45g), 1 Pão de hambúrguer (50g), Queijo muçarela (30g) e Patinho moído cru (130g).",
          substitutions: "Cebola (20g) ou Pepino (50g); Pão integral (50g) ou Rap (40g); Requeijão light (60g) ou Creme de ricota (60g)."
        }
      ]
    }
  ],
  shoppingList: {
    "Proteínas": ["Ovo de galinha", "Peito de frango", "Patinho moído", "Filé de tilápia", "Atum", "Whey protein"],
    "Carboidratos": ["Arroz (branco/integral)", "Aveia (flocos/farelo)", "Feijão", "Goma de tapioca", "Pão de forma integral", "Pão francês", "Batata (inglesa/doce)"],
    "Laticínios": ["Iogurte natural", "Queijo minas", "Queijo muçarela", "Creme de ricota light", "Leite desnatado"],
    "Frutas": ["Banana prata", "Maçã Fuji", "Mamão", "Morango", "Uva"],
    "Vegetais": ["Alface", "Brócolis", "Cebola", "Cenoura", "Tomate"]
  }
};

export const DIET_1450: DietPlanType = {
  title: "Cardápio Personalizado - 1450 kcal",
  totalCalories: 1450,
  meals: [
    {
      time: "08:00",
      name: "Café da Manhã",
      options: [
        {
          title: "Opção 1: Pão com Ovo",
          principal: "Café (80ml), Peito de frango desfiado (50g) ou 2 ovos de galinha grandes (110g), Melão (115g) ou Mamão (85g), Pão francês (50g) ou 2 fatias de pão integral (50g) e 1 fatia pequena de Queijo minas (20g).",
          substitutions: "Chá preto (180ml); Morango (100g) ou Abacaxi (75g); Cuscuz de milho (90g) ou Goma de tapioca (40g); Muçarela (15g), Creme de ricota light (30g) ou Cottage (30g)."
        },
        {
          title: "Opção 2: Smoothie",
          principal: "Café (80ml), Banana prata (65g), Farelo de aveia (30g), Iogurte natural (170ml) e Whey protein concentrado (25.5g).",
          substitutions: "Morango (200g) ou Mamão (170g); Aveia em flocos (21g) ou Granola Caseira (22g); Leite de vaca desnatado (240ml); Whey protein isolado (23g) ou Proteína vegetal (30g)."
        }
      ]
    },
    {
      time: "12:00",
      name: "Almoço",
      options: [
        {
          title: "Refeição Principal",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (75g), Feijão carioca (65g) e Doce de leite (25g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura crua (68g); Patinho moído (100g), Tilápia (120g) ou Filé mignon suíno (125g); Batata inglesa (150g-180g) ou Batata doce (120g); Feijão preto (65g), Grão de bico (45g) ou Lentilha (35g)."
        }
      ]
    },
    {
      time: "16:00",
      name: "Lanche da Tarde",
      options: [
        {
          title: "Opção 1: Sanduíche",
          principal: "Alface (20g), Tomate (45g), 2 fatias de Pão integral (50g), Queijo minas meia cura (20g) e Frango desfiado (30g).",
          substitutions: "Rúcula (24g), Cenoura (34g) ou Pepino (50g); Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Cottage (30g); Patinho moído (25g) ou Atum em conserva (32g)."
        },
        {
          title: "Opção 2: Iogurte",
          principal: "Uva (120g), Aveia em flocos (10.5g), Iogurte natural (170ml) e Whey protein concentrado (17g).",
          substitutions: "Maçã (90g), Morango (200g) ou Melão (230g); Granola (11g) ou Bolacha de arroz (10g); Whey isolado (15g) ou Proteína vegetal (20g)."
        },
        {
          title: "Opção 3: Panqueca",
          principal: "1 Ovo grande (55g), 1 Banana prata (65g), Farelo de aveia (30g) e Whey protein concentrado (17g).",
          substitutions: "Aveia em flocos (21g) ou Farinha de aveia (18g)."
        }
      ]
    },
    {
      time: "20:00",
      name: "Jantar",
      options: [
        {
          title: "Opção 1: Comida",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (75g) e Feijão carioca (65g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (150g-180g) ou Batata doce (120g); Feijão preto (65g) ou Lentilha (35g)."
        },
        {
          title: "Opção 2: Hambúrguer",
          principal: "Alface (20g), Tomate (45g), 1 Pão de hambúrguer (50g), Queijo muçarela (15g) e Patinho moído cru (130g).",
          substitutions: "Cebola (20g) ou Pepino (50g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Queijo minas (20g) ou Requeijão light (30g)."
        },
        {
          title: "Opção 3: Lanche",
          principal: "Alface (20g), Tomate (45g), 3 Ovos cozidos (165g), Goma de tapioca (40g) e Queijo minas (20g).",
          substitutions: "Pepino (50g) ou Cenoura (34g); Frango desfiado (75g) ou Patinho moído (75g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Requeijão light (30g)."
        }
      ]
    }
  ],
  shoppingList: {
    "Proteínas": ["Acém", "Atum", "Filé de frango", "Peito de frango", "Filé de tilápia", "Filé mignon suíno", "Patinho moído", "Ovo de galinha", "Salmão", "Whey protein"],
    "Vegetais e Folhas": ["Alface (crespa/lisa/americana/roxa)", "Brócolis", "Cenoura", "Cebola", "Couve manteiga", "Pepino", "Repolho roxo", "Rúcula", "Salada de folhas", "Tomate (salada/cereja)", "Vagem"],
    "Frutas": ["Abacaxi", "Amora", "Banana prata", "Framboesa", "Kiwi", "Maçã Fuji", "Melancia", "Melão", "Mirtilo/Blueberry", "Morango"],
    "Grãos, Pães e Outros": ["Arroz (branco/integral)", "Aveia em flocos", "Farelo de aveia", "Feijão (carioca/preto)", "Goma de tapioca", "Iogurte natural", "Pão de hambúrguer", "Pão de forma (integral/tradicional)", "Pão tipo folha/rap", "Queijo (minas frescal light/muçarela)", "Requeijão light", "Extrato de tomate", "Chocolate ao leite"]
  }
};

export const DIET_1850: DietPlanType = {
  title: "Cardápio Personalizado - 1850 kcal",
  totalCalories: 1850,
  meals: [
    {
      time: "08:00",
      name: "Café da Manhã",
      options: [
        {
          title: "Opção 1: Pão com Ovo",
          principal: "Café (80ml), 2 Ovos de galinha (110g) ou Peito de frango desfiado (50g), Mamão formosa (170g), Semente de chia (15g), 2 Fatias de Pão de forma integral (50g) e 1 Fatia pequena de Queijo minas meia cura (20g).",
          substitutions: "Chá preto (180ml); Melão (230g), Morango (200g) ou Banana prata (65g); Pasta de amendoim (10g) ou Semente de linhaça (15g); Pão francês (50g), Cuscuz (90g) ou Goma de tapioca (40g); Muçarela (15g), Creme de ricota light (30g) ou Cottage (30g)."
        },
        {
          title: "Opção 2: Smoothie",
          principal: "Café (80ml), Banana prata (65g), Semente de chia (15g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (25.5g) e Mel (15g).",
          substitutions: "Morango (200g), Mamão (170g) ou Maracujá (100g); Pasta de amendoim integral (10g) ou Castanha-do-Brasil (8g); Farelo de aveia (30g) ou Granola caseira (22g); Leite de vaca desnatado (240ml); Whey protein isolado (22.5g) ou Proteína vegetal (30g)."
        }
      ]
    },
    {
      time: "12:00",
      name: "Almoço",
      options: [
        {
          title: "Refeição Principal",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (150g), Feijão carioca (130g) e Doce de leite cremoso (25g).",
          substitutions: "Rúcula (48g), Couve refogada (40g) ou Espinafre (50g); Tomate salada (90g), Abóbora (110g) ou Cenoura crua (68g); Patinho moído (100g), Tilápia (120g) ou Filé mignon suíno (125g); Batata inglesa (300g-360g) ou Macarrão cozido (120g); Feijão preto (130g), Grão de bico (90g) ou Lentilha (70g)."
        }
      ]
    },
    {
      time: "16:00",
      name: "Lanche da Tarde",
      options: [
        {
          title: "Opção 1: Sanduíche",
          principal: "Alface (20g), Tomate (45g), Maçã Fuji (90g), 2 Fatias de Pão de forma integral (50g), Queijo minas meia cura (20g) e Frango desfiado (60g).",
          substitutions: "Rúcula (24g); Cenoura (34g), Pepino (50g) ou Beterraba (16g); Tangerina (135g), Manga (140g) ou Banana (65g); Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Cottage (30g); Patinho moído (45g) ou Atum em conserva (55g)."
        },
        {
          title: "Opção 2: Iogurte",
          principal: "Uva (120g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (34g) e Mel (8g).",
          substitutions: "Maçã (90g), Morango (200g) ou Melão (230g); Farelo de aveia (30g), Granola (22g) ou Bolacha de arroz (20g); Whey isolado (30g) ou Proteína vegetal (40g)."
        },
        {
          title: "Opção 3: Panqueca",
          principal: "1 Banana prata (65g), Farelo de aveia (30g), Whey protein concentrado (34g), Mel (15g) e 1 Ovo (50g).",
          substitutions: "Aveia em flocos (21g) ou Farinha de aveia (18g); Whey isolado (30g) ou Proteína vegetal (40g)."
        }
      ]
    },
    {
      time: "20:00",
      name: "Jantar",
      options: [
        {
          title: "Opção 1: Comida",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (100g) e Feijão carioca (97.5g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (200g-240g) ou Batata doce (160g); Feijão preto (97.5g) ou Lentilha (52.5g)."
        },
        {
          title: "Opção 2: Hambúrguer",
          principal: "Alface (20g), Tomate (45g), 1 Pão de hambúrguer (50g), Queijo muçarela (30g) e Patinho moído cru (130g).",
          substitutions: "Cebola (20g), Cenoura (34g) ou Pepino (50g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Requeijão light (60g), Queijo minas (40g) ou Creme de ricota light (60g)."
        },
        {
          title: "Opção 3: Lanche",
          principal: "Alface (20g), Tomate (45g), 4 Ovos cozidos (220g) ou Peito de frango desfiado (100g), Goma de tapioca (40g) e Queijo minas meia cura (20g).",
          substitutions: "Pepino (50g), Cenoura (34g) ou Cebola (20g); Patinho moído (100g) ou Atum sólido (120g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Muçarela (15g), Requeijão light (30g) ou Ricota light (30g)."
        }
      ]
    }
  ],
  shoppingList: {
    "Proteínas": ["Ovos", "Filé de frango", "Peito de frango", "Patinho moído", "Filé de tilápia", "Atum", "Filé mignon suíno", "Whey protein"],
    "Carboidratos": ["Arroz (branco/integral)", "Macarrão", "Feijão (carioca/preto)", "Goma de tapioca", "Aveia (flocos/farelo)", "Pão de hambúrguer", "Pão de forma integral", "Pão francês", "Batata (inglesa/doce)", "Pão tipo folha/rap"],
    "Sementes e Fibras": ["Semente de chia (ou linhaça)", "Pasta de amendoim", "Castanha-do-Brasil"],
    "Laticínios": ["Iogurte natural", "Queijo minas meia cura", "Queijo muçarela", "Creme de ricota light", "Leite desnatado"],
    "Frutas": ["Banana prata", "Maçã Fuji", "Mamão", "Manga", "Melão", "Morango", "Tangerina", "Uva"],
    "Vegetais e Folhas": ["Alface", "Brócolis", "Cebola", "Cenoura", "Couve", "Pepino", "Rúcula", "Tomate"],
    "Extras": ["Café", "Doce de leite (ou chocolate/paçoquinha)", "Mel"]
  }
};

export const DIET_2000: DietPlanType = {
  title: "Cardápio Personalizado - 2000 kcal (Bulking)",
  totalCalories: 2000,
  meals: [
    {
      time: "08:00",
      name: "Café da Manhã",
      options: [
        {
          title: "Opção 1: Pão com Ovo",
          principal: "Café (80ml), 2 Ovos de galinha (110g) ou Peito de frango desfiado (50g), Mamão formosa (170g), Pasta de amendoim (10g) ou Semente de chia (15g), 2 Fatias de Pão de forma integral (50g) e 1 Fatia pequena de Queijo minas meia cura (20g).",
          substitutions: "Chá preto (180ml); Melão (230g), Morango (200g) ou Banana prata (65g); Castanha-do-Brasil (8g) ou Castanha de caju (10g); Pão francês (50g), Cuscuz (90g) ou Goma de tapioca (40g); Muçarela (15g), Creme de ricota light (30g) ou Cottage (30g)."
        },
        {
          title: "Opção 2: Smoothie",
          principal: "Café (80ml), Banana prata (65g), Semente de chia (15g) ou Pasta de amendoim (10g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (25.5g) e Mel (15g).",
          substitutions: "Morango (200g), Mamão (170g) ou Maracujá (100g); Semente de linhaça (15g) ou Castanha-do-Brasil (8g); Farelo de aveia (30g) ou Granola caseira (22g); Leite de vaca desnatado (240ml); Whey protein isolado (22.5g) ou Proteína vegetal (30g)."
        }
      ]
    },
    {
      time: "12:00",
      name: "Almoço",
      options: [
        {
          title: "Opção 1: Arroz e Feijão",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (150g), Feijão carioca (130g), Suco de uva concentrado (240ml) ou Laranja (360ml) e Doce de leite cremoso (25g).",
          substitutions: "Rúcula (48g), Couve refogada (40g) ou Espinafre (50g); Tomate salada (90g), Abóbora (110g) ou Cenoura crua (68g); Patinho moído (100g), Tilápia (120g) ou Filé mignon suíno (125g); Batata inglesa (300g-360g) ou Macarrão cozido (120g); Feijão preto (130g), Grão de bico (90g) ou Lentilha (70g)."
        },
        {
          title: "Opção 2: Macarrão",
          principal: "Brócolis cozido (120g), Filé de frango grelhado (100g), Macarrão cozido (160g), Extrato de tomate (30g), Suco de uva concentrado (240ml) e Doce de leite (25g).",
          substitutions: "Tomate salada (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g), Peito de frango desfiado (100g) ou Atum sólido (120g); Suco de laranja (360ml)."
        }
      ]
    },
    {
      time: "16:00",
      name: "Lanche da Tarde",
      options: [
        {
          title: "Opção 1: Sanduíche",
          principal: "Alface (20g), Tomate (45g), Maçã Fuji (90g), 2 Fatias de Pão de forma integral (50g), Queijo minas meia cura (20g) e Frango desfiado (60g).",
          substitutions: "Rúcula (24g); Cenoura (34g), Pepino (50g) ou Beterraba (16g); Tangerina (135g), Manga (140g) ou Banana (65g); Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Cottage (30g); Patinho moído (45g) ou Atum em conserva (55g)."
        },
        {
          title: "Opção 2: Iogurte",
          principal: "Uva (120g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (34g) e Mel (8g).",
          substitutions: "Maçã (90g), Morango (200g) ou Melão (230g); Farelo de aveia (30g), Granola (22g) ou Bolacha de arroz (20g); Whey isolado (30g) ou Proteína vegetal (40g)."
        },
        {
          title: "Opção 3: Panqueca",
          principal: "1 Banana prata (65g), Farelo de aveia (30g), Whey protein concentrado (34g), Mel (15g) e 1 Ovo (50g).",
          substitutions: "Aveia em flocos (21g) ou Farinha de aveia (18g); Whey isolado (30g) ou Proteína vegetal (40g)."
        }
      ]
    },
    {
      time: "20:00",
      name: "Jantar",
      options: [
        {
          title: "Opção 1: Comida",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (100g) e Feijão carioca (97.5g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (200g-240g) ou Batata doce (160g); Feijão preto (97.5g) ou Lentilha (52.5g)."
        },
        {
          title: "Opção 2: Hambúrguer",
          principal: "Alface (20g), Tomate (45g), 1 Pão de hambúrguer (50g), Queijo muçarela (30g) e Patinho moído cru (130g).",
          substitutions: "Cebola (20g), Cenoura (34g) ou Pepino (50g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Requeijão light (60g), Queijo minas (40g) ou Creme de ricota light (60g)."
        },
        {
          title: "Opção 3: Lanche",
          principal: "Alface (20g), Tomate (45g), 4 Ovos cozidos (220g) ou Peito de frango desfiado (100g), Goma de tapioca (40g) e Queijo minas meia cura (20g).",
          substitutions: "Pepino (50g), Cenoura (34g) ou Cebola (20g); Patinho moído (100g) ou Atum sólido (120g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Muçarela (15g), Requeijão light (30g) ou Ricota light (30g)."
        }
      ]
    }
  ],
  shoppingList: {
    "Proteínas": ["Ovos", "Filé de frango", "Peito de frango", "Patinho moído", "Filé de tilápia", "Atum", "Filé mignon suíno", "Whey protein"],
    "Carboidratos": ["Arroz (branco/integral)", "Macarrão", "Feijão (carioca/preto)", "Goma de tapioca", "Aveia (flocos/farelo)", "Pão de hambúrguer", "Pão de forma integral", "Pão francês", "Batata (inglesa/doce)", "Pão tipo folha/rap"],
    "Sementes e Fibras": ["Semente de chia (ou linhaça)", "Pasta de amendoim", "Castanhas (Brasil/Caju)"],
    "Laticínios": ["Iogurte natural", "Queijo minas meia cura", "Queijo muçarela", "Creme de ricota light", "Leite desnatado"],
    "Frutas e Bebidas": ["Banana prata", "Maçã Fuji", "Mamão", "Manga", "Melão", "Morango", "Tangerina", "Uva", "Suco de uva concentrado", "Suco de laranja"],
    "Vegetais e Folhas": ["Alface", "Brócolis", "Cebola", "Cenoura", "Couve", "Pepino", "Rúcula", "Tomate"],
    "Extras": ["Café", "Doce de leite (ou chocolate/paçoquinha)", "Extrato de tomate", "Mel"]
  }
};

export const DIET_2200: DietPlanType = {
  title: "Cardápio Personalizado - 2200 kcal (Bulking)",
  totalCalories: 2200,
  meals: [
    {
      time: "08:00",
      name: "Café da Manhã",
      options: [
        {
          title: "Opção 1: Pão com Ovo",
          principal: "Café (80ml), 2 Ovos de galinha (110g) ou Peito de frango desfiado (50g), Mamão formosa (170g), Pasta de amendoim integral (20g), 2 Fatias de Pão de forma integral (50g) e 1 Fatia pequena de Queijo minas meia cura (20g).",
          substitutions: "Chá preto (180ml); Melão (230g), Morango (200g) ou Banana prata (65g); Semente de chia (30g), Castanha-do-Brasil (16g) ou Castanha de caju (20g); Pão francês (50g), Cuscuz (90g) ou Goma de tapioca (40g); Muçarela (15g), Creme de ricota light (30g) ou Cottage (30g)."
        },
        {
          title: "Opção 2: Smoothie",
          principal: "Café (80ml), Banana prata (65g), Semente de chia (30g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (25.5g) e Mel (15g).",
          substitutions: "Morango (200g), Mamão (170g) ou Maracujá (100g); Semente de linhaça (30g), Pasta de amendoim integral (20g) ou Castanha-do-Brasil (16g); Farelo de aveia (30g) ou Granola caseira (22g); Leite desnatado (240ml); Whey protein isolado (22.5g) ou Proteína vegetal (30g)."
        }
      ]
    },
    {
      time: "12:00",
      name: "Almoço",
      options: [
        {
          title: "Opção 1: Arroz e Feijão",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (150g), Feijão carioca (130g), Azeite de oliva (4ml), Suco de uva concentrado (240ml) e Doce de leite cremoso (25g).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura crua (68g); Patinho moído (100g), Tilápia (120g) ou Filé mignon suíno (125g); Batata inglesa (300g-360g) ou Macarrão cozido (120g); Feijão preto (130g), Grão de bico (90g) ou Lentilha (70g); Suco de laranja (360ml)."
        },
        {
          title: "Opção 2: Macarrão",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Macarrão cozido (160g), Azeite de oliva (4ml), Extrato de tomate (30g), Suco de uva concentrado (240ml) e Doce de leite (25g).",
          substitutions: "Mesmas opções de salada, vegetais e proteínas acima; Suco de laranja (360ml)."
        }
      ]
    },
    {
      time: "16:00",
      name: "Lanche da Tarde",
      options: [
        {
          title: "Opção 1: Sanduíche",
          principal: "Alface (20g), Tomate (45g), Maçã Fuji (90g), 2 Fatias de Pão de forma integral (50g), Queijo minas meia cura (20g) e Frango desfiado (60g).",
          substitutions: "Rúcula (24g), Cenoura (34g) ou Pepino (50g); Tangerina (135g), Manga (140g) ou Banana prata (65g); Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Cottage (30g); Patinho moído (45g) ou Atum em conserva (55g)."
        },
        {
          title: "Opção 2: Iogurte",
          principal: "Uva (120g), Aveia em flocos (21g), Iogurte natural (170ml), Whey protein concentrado (34g) e Mel (8g).",
          substitutions: "Maçã (90g), Morango (200g) ou Melão (230g); Farelo de aveia (30g), Granola (22g) ou Bolacha de arroz (20g); Whey isolado (30g) ou Proteína vegetal (40g)."
        },
        {
          title: "Opção 3: Panqueca",
          principal: "1 Banana prata (65g), Farelo de aveia (30g), Whey protein concentrado (34g), Mel (15g) e 1 Ovo (50g).",
          substitutions: "Aveia em flocos (21g) ou Farinha de aveia (18g); Whey isolado (30g) ou Proteína vegetal (40g)."
        }
      ]
    },
    {
      time: "20:00",
      name: "Jantar",
      options: [
        {
          title: "Opção 1: Comida",
          principal: "Alface (40g), Brócolis cozido (120g), Filé de frango grelhado (100g), Arroz branco/integral (100g), Feijão carioca (97.5g) e Suco de uva concentrado (200ml).",
          substitutions: "Rúcula (48g), Couve (40g) ou Espinafre (50g); Tomate (90g), Abóbora (110g) ou Cenoura (68g); Patinho moído (100g) ou Tilápia (120g); Batata inglesa (200g-240g) ou Batata doce (160g); Feijão preto (97.5g) ou Lentilha (52.5g); Suco de laranja (300ml)."
        },
        {
          title: "Opção 2: Lanche (Crepioca/Wrap/Sanduíche)",
          principal: "Alface (20g), Tomate (45g), 4 Ovos cozidos (220g) ou Frango desfiado (100g), Goma de tapioca (40g), Queijo minas meia cura (20g) e Suco de uva concentrado (200ml).",
          substitutions: "Pepino (50g) ou Cenoura (34g); Patinho moído (100g) ou Atum sólido (120g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Muçarela (15g) ou Requeijão light (30g); Suco de laranja (300ml)."
        },
        {
          title: "Opção 3: Hambúrguer",
          principal: "Alface (20g), Tomate (45g), 1 Pão de hambúrguer (50g), Queijo muçarela (30g), Patinho moído cru (130g) e Suco de uva concentrado (200ml).",
          substitutions: "Cebola (20g) ou Pepino (50g); Pão integral (50g), Pão francês (50g) ou Rap (40g); Requeijão light (60g), Queijo minas (40g) ou Creme de ricota light (60g); Suco de laranja (300ml)."
        }
      ]
    }
  ],
  shoppingList: {
    "Proteínas": ["Ovos de galinha", "Filé de frango", "Peito de frango", "Patinho moído", "Filé de tilápia", "Atum em óleo", "Filé mignon suíno", "Whey protein"],
    "Carboidratos": ["Arroz (branco/integral)", "Macarrão", "Feijão (carioca/preto)", "Goma de tapioca", "Aveia (flocos/farelo)", "Pão de hambúrguer", "Pão de forma integral", "Pão francês", "Batata (inglesa/doce)", "Pão tipo folha/rap"],
    "Sementes e Gorduras": ["Azeite de oliva", "Pasta de amendoim integral", "Semente de chia", "Semente de linhaça", "Castanha-do-Brasil", "Castanha de caju"],
    "Laticínios": ["Iogurte natural", "Queijo minas meia cura", "Queijo muçarela", "Creme de ricota light", "Leite desnatado"],
    "Frutas e Bebidas": ["Banana prata", "Maçã Fuji", "Mamão formosa", "Manga", "Melão", "Morango", "Tangerina", "Uva", "Suco de uva concentrado", "Suco de laranja"],
    "Vegetais e Folhas": ["Alface", "Brócolis", "Cebola", "Cenoura", "Couve", "Espinafre", "Pepino", "Rúcula", "Tomate"],
    "Extras": ["Café", "Doce de leite cremoso (ou chocolate/paçoquinha)", "Extrato de tomate", "Mel"]
  }
};

export const ALL_DIETS: DietPlanType[] = [DIET_1450, DIET_1650, DIET_1850, DIET_2000, DIET_2200];

// Backward compat
export const DIET_DATA = DIET_1650;
