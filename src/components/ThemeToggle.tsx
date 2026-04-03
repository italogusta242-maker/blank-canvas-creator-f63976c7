import { Sun } from "lucide-react";

const ThemeToggle = () => {
  return (
    <button
      className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      aria-label="Theme"
      disabled
    >
      <Sun className="w-5 h-5 text-accent" strokeWidth={2.5} />
    </button>
  );
};

export default ThemeToggle;
