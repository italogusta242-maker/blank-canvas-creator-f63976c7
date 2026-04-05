import { useState, useEffect } from "react";
import { Check, ShoppingCart, RefreshCw, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

const SHOPPING_ITEMS = [
  "Abacaxi", "Acém", "Alface crespa/lisa/americana", "Alface roxa", "Amora", 
  "Arroz branco", "Arroz integral", "Atum cru", "Aveia em flocos", "Banana prata", 
  "Batata inglesa", "Beterra ba", "Cebola", "Cenoura", "Chocolate ao leite", 
  "Couve manteiga", "Creme de ricota light", "Extrato de tomate", "Farelo de aveia", 
  "Feijão carioca", "Feijão preto", "Filé de frango", "Filé de tilápia", 
  "Filé mignon sem gordura", "Framboesa", "Goma de tapioca", "Iogurte natural", 
  "Kiwi", "Maçã Fuji", "Melancia", "Mirtilo ou Blueberry", "Morango", 
  "Morning Shot", "Ovo de galinha", "Peito de frango", "Pepino", 
  "Pão de Hambúrguer Wickbold", "Pão de forma integral", "Pão de forma tradicional", 
  "Pão tipo folha/rap", "Queijo minas frescal light", "Queijo muçarela", 
  "Repolho roxo", "Requeijão light zero lactose", "Rúcula", "Salada de folhas", 
  "Salmão sem pele", "Sashimi de atum", "Sashimi de salmão", "SuperCoffee", 
  "Temaki", "Tomate cereja", "Tomate salada", "Vagem", "Whey protein (concentrado)"
];

const ShoppingList = () => {
  const { user } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load checked items from Supabase
  useEffect(() => {
    const fetchCheckedItems = async () => {
      if (!user) return;
      try {
        const { data, error } = await (supabase as any)
          .from("user_shopping_list_items")
          .select("item_name")
          .eq("user_id", user.id)
          .eq("checked", true);

        if (error) throw error;

        const names: string[] = (data || []).map((item: any) => String(item.item_name));
        setCheckedItems(new Set<string>(names));
      } catch (err) {
        console.error("Error loading shopping list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckedItems();
  }, [user]);

  const toggleItem = async (itemName: string) => {
    if (!user) return;

    const isChecked = checkedItems.has(itemName);
    const newCheckedItems = new Set(checkedItems);
    
    if (isChecked) {
      newCheckedItems.delete(itemName);
    } else {
      newCheckedItems.add(itemName);
    }
    
    // Optimistic update
    setCheckedItems(newCheckedItems);

    try {
      const { error } = await (supabase as any)
        .from("user_shopping_list_items")
        .upsert({
          user_id: user.id,
          item_name: itemName,
          checked: !isChecked,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id, item_name" });

      if (error) throw error;
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Erro ao salvar item");
      // Rollback
      setCheckedItems(checkedItems);
    }
  };

  const clearChecked = async () => {
    if (!user || checkedItems.size === 0) return;

    const itemsToClear = Array.from(checkedItems);
    setCheckedItems(new Set());

    try {
      const { error } = await (supabase as any)
        .from("user_shopping_list_items")
        .update({ checked: false })
        .eq("user_id", user.id)
        .in("item_name", itemsToClear);

      if (error) throw error;
      toast.success("Lista limpa!");
    } catch (err) {
      console.error("Error clearing list:", err);
      toast.error("Erro ao limpar lista");
      setCheckedItems(new Set(itemsToClear));
    }
  };

  const filteredItems = SHOPPING_ITEMS.filter(item => 
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando sua lista...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-cinzel text-lg font-bold text-foreground">Minha Lista</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {checkedItems.size} de {SHOPPING_ITEMS.length} itens marcados
          </p>
        </div>
        <button 
          onClick={clearChecked}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw size={12} />
          Limpar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar item..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-secondary/30 border-border"
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const isChecked = checkedItems.has(item);
            return (
              <motion.button
                layout
                key={item}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => toggleItem(item)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                  isChecked 
                    ? "bg-primary/5 border-primary/20 opacity-60" 
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  isChecked 
                    ? "bg-primary border-transparent text-primary-foreground" 
                    : "bg-secondary/50 border-border text-transparent"
                }`}>
                  <Check size={14} className={isChecked ? "opacity-100" : "opacity-0"} />
                </div>
                <span className={`text-sm font-medium transition-all ${
                  isChecked ? "text-muted-foreground line-through" : "text-foreground"
                }`}>
                  {item}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart size={40} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground italic">Nenhum item encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
