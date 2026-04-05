import { motion } from "framer-motion";
import { User, Crown, Flame, Trophy } from "lucide-react";

export interface PodiumEntry {
  user_id: string;
  nome: string;
  avatar_url?: string;
  score: number;
  streak: number;
  rank: number;
}

interface PodiumCardProps {
  entries: PodiumEntry[];
  onAvatarClick?: (userId: string) => void;
  scoreLabel?: string;
}

// ── Tier config ──
const TIERS = [
  { rank: 2, label: "2º", heightClass: "h-24", gradient: "from-gray-400 to-gray-300", textColor: "text-gray-300", crownColor: "", barDelay: 0.2 },
  { rank: 1, label: "1º", heightClass: "h-36", gradient: "from-yellow-500 to-amber-300", textColor: "text-yellow-300", crownColor: "text-yellow-300", barDelay: 0 },
  { rank: 3, label: "3º", heightClass: "h-16", gradient: "from-amber-700 to-amber-600", textColor: "text-amber-500", crownColor: "", barDelay: 0.4 },
];

function PodiumBar({ entry, tier, onClick }: {
  entry: PodiumEntry | undefined;
  tier: typeof TIERS[0];
  onClick?: (id: string) => void;
}) {
  if (!entry) {
    return (
      <div className="flex flex-col items-center gap-2 flex-1">
        <div className="w-12 h-12 rounded-full bg-secondary/30 border border-border flex items-center justify-center">
          <User size={18} className="text-muted-foreground/30" />
        </div>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "100%" }}
          transition={{ duration: 0.6, delay: tier.barDelay, ease: "easeOut" }}
          className={`w-full ${tier.heightClass} rounded-t-xl bg-secondary/20 border border-border/30`}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier.barDelay + 0.1 }}
      className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
      onClick={() => onClick?.(entry.user_id)}
    >
      {/* Crown for 1st place */}
      {tier.rank === 1 && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        >
          <Crown size={20} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
        </motion.div>
      )}
      {tier.rank !== 1 && <div className="h-5" />}

      {/* Avatar */}
      <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${
        tier.rank === 1 ? "border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]" :
        tier.rank === 2 ? "border-gray-400" : "border-amber-700"
      } group-hover:scale-110 transition-transform`}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt={entry.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <User size={20} className="text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-[10px] font-bold text-foreground truncate max-w-[80px] text-center leading-tight">
        {entry.nome.split(" ")[0]}
      </p>

      {/* Bar */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.7, delay: tier.barDelay, ease: "easeOut" }}
        style={{ transformOrigin: "bottom" }}
        className={`w-full ${tier.heightClass} rounded-t-xl bg-gradient-to-t ${tier.gradient} relative overflow-hidden shadow-lg`}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        {/* Rank badge */}
        <div className="absolute top-2 inset-x-0 flex flex-col items-center gap-0.5">
          <span className={`text-xs font-black ${tier.textColor}`}>{tier.label}</span>
        </div>
        {/* Score at bottom */}
        <div className="absolute bottom-2 inset-x-0 flex flex-col items-center">
          <span className="text-[9px] font-black text-white/90">{entry.score.toLocaleString()}</span>
          <span className="text-[8px] text-white/60">pts</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PodiumCard({ entries, onAvatarClick, scoreLabel = "pts" }: PodiumCardProps) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const first = top3.find((e) => e.rank === 1);
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Trophy className="mx-auto mb-3 opacity-20" size={40} />
        <p className="text-sm">Nenhuma aluna nesta categoria ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Podium ── */}
      <div className="flex items-end gap-2 px-4 pt-4 pb-0">
        {[
          { tier: TIERS[0], entry: second },
          { tier: TIERS[1], entry: first },
          { tier: TIERS[2], entry: third },
        ].map(({ tier, entry }) => (
          <PodiumBar key={tier.rank} entry={entry} tier={tier} onClick={onAvatarClick} />
        ))}
      </div>

      {/* ── Base ── */}
      <div className="h-1.5 bg-gradient-to-r from-transparent via-border to-transparent mx-2 rounded-full" />

      {/* ── Positions 4–10 ── */}
      {rest.length > 0 && (
        <div className="space-y-1 px-1">
          {rest.map((entry) => (
            <motion.button
              key={entry.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: entry.rank * 0.05 }}
              onClick={() => onAvatarClick?.(entry.user_id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
            >
              <span className="w-5 text-xs font-black text-muted-foreground/40 text-center">{entry.rank}</span>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User size={14} className="text-muted-foreground" />
                )}
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {entry.nome}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {entry.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-bold">
                    <Flame size={10} />{entry.streak}
                  </span>
                )}
                <span className="text-xs font-black text-primary">{entry.score.toLocaleString()} {scoreLabel}</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
