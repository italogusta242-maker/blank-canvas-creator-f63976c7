import anaacLogo from "@/assets/anaac-logo.png";

interface InsanoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const InsanoLogo = ({ size = 24, className = "", showText = true }: InsanoLogoProps) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img src={anaacLogo} alt="ANAAC Club" style={{ width: size, height: size }} className="object-contain" fetchPriority="high" loading="eager" />
      {showText && (
        <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground mt-1 font-light">ANAAC Club</span>
      )}
    </div>
  );
};

export default InsanoLogo;
