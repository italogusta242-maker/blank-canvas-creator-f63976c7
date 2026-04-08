import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceEvolutionProps {
  performanceData: any[];
  chartColor: string;
  setShowPerformanceModal: (val: boolean) => void;
  cardBg: string;
  cardBorder: string;
}

const PerformanceEvolution = ({
  performanceData,
  chartColor,
  setShowPerformanceModal,
  cardBg,
  cardBorder,
}: PerformanceEvolutionProps) => {
  // Institutional pink for performance chart
  const currentChartColor = "hsl(342, 100%, 57%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`${cardBg} rounded-2xl md:rounded-[2.5rem] border ${cardBorder} p-3 md:p-8 shadow-xl h-full flex flex-col relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 md:mb-8 z-10 shrink-0">
        <div>
          <h3 className="font-cinzel text-sm md:text-xl font-bold text-primary italic">Evolução</h3>
          <p className="hidden md:block text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.2em]">Sua trajetória rumo ao topo</p>
        </div>
        <button 
          onClick={() => setShowPerformanceModal(true)}
          className="whitespace-nowrap text-[10px] text-muted-foreground px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors font-cinzel font-black tracking-widest border border-border/50"
        >
          DETALHES →
        </button>
      </div>
      
      <div className="flex-1 min-h-[130px] md:min-h-[250px] w-full relative z-10 mt-4 md:mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="grad-geral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentChartColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={currentChartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "11px" }} />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke={currentChartColor} 
              fill="url(#grad-geral)" 
              strokeWidth={3} 
              dot={{ fill: currentChartColor, r: 4, stroke: 'hsl(var(--background))', strokeWidth: 2 }} 
              activeDot={{ r: 6, strokeWidth: 0, fill: currentChartColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default PerformanceEvolution;
