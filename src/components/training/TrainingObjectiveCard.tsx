import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ChevronDown, ChevronUp, Star, Quote } from "lucide-react";

export function TrainingObjectiveCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-sm hover:border-primary/20 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            <Star size={20} className="fill-primary/20" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">OBJETIVO DO PLANO</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">MENSAGEM DA KAROL DIAS</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-5 rounded-2xl bg-secondary/30 border border-border/40 relative">
              <Quote className="absolute top-4 right-4 text-primary/5 w-16 h-16 pointer-events-none" />
              <div className="space-y-4 relative z-10">
                <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">OII, MENINAS!</p>
                <div className="space-y-3">
                  <p className="text-[13px] leading-relaxed text-foreground/90 font-medium italic">
                    "SOU <span className="text-primary font-black not-italic">KAROL DIAS</span>, PERSONAL TRAINER. PREPAREI O PLANEJAMENTO DE TREINO PARA VOCÊS COM OS MELHORES MÉTODOS PARA QUE ALCANCEM REALMENTE UMA EVOLUÇÃO SÓLIDA NO SEU FÍSICO."
                  </p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    O TREINO PODE SER SEGUIDO TANTO POR ALUNAS INICIANTES QUANTO ALUNAS INTERMEDIÁRIAS. ENTÃO SE VOCÊ É INICIANTE FAÇA COM CARGA LEVE E MODERADA APROVEITANDO A OPORTUNIDADE PARA APRIMORAR SEU MOVIMENTO.
                  </p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    PARA ALUNAS QUE JÁ PRATICAM MUSCULAÇÃO DEDIQUEM-SE AO MÁXIMO A CADA TREINO QUE EU TENHO CERTEZA QUE SEU RESULTADO SERÁ EXTRAORDINÁRIO.
                  </p>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[11px] leading-relaxed font-bold text-foreground/70 uppercase">
                      MAS LEMBRE-SE QUE O TREINO NÃO SUBSTITUI UM ACOMPANHAMENTO INDIVIDUALIZADO QUE CUIDA DE CADA LIMITAÇÃO E ROTINA DE VOCÊS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
