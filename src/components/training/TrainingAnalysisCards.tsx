import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ClipboardList, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";

interface TrainingAnalysisCardsProps {
  avaliacaoPostural?: string | null;
  pontosMelhoria?: string | null;
  objetivoMesociclo?: string | null;
}

const TrainingAnalysisCards = ({ avaliacaoPostural, pontosMelhoria, objetivoMesociclo }: TrainingAnalysisCardsProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const cards = [
    { key: "objetivo", label: "Objetivo do Mesociclo", icon: Target, content: objetivoMesociclo },
    { key: "avaliacao", label: "Avaliação Postural", icon: ClipboardList, content: avaliacaoPostural },
    { key: "pontos", label: "Pontos de Melhoria", icon: TrendingUp, content: pontosMelhoria },
  ].filter(c => c.content);

  if (cards.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {cards.map(({ key, label, icon: Icon, content }) => (
        <div key={key} className="bg-secondary/50 border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedCard(expandedCard === key ? null : key)}
            className="w-full flex items-center gap-3 p-3 text-left"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/15 border border-primary/30">
              <Icon size={14} className="text-primary" />
            </div>
            <span className="font-cinzel text-xs font-bold text-foreground flex-1">{label}</span>
            {expandedCard === key ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {expandedCard === key && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default TrainingAnalysisCards;
