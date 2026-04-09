import { useEffect, useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { Flame, Download, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ActiveDaysStickerProps {
  streak: number;
  userName: string;
  flameState: string;
  onClose?: () => void;
}

const ActiveDaysSticker = ({ streak, userName, flameState, onClose }: ActiveDaysStickerProps) => {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [preparedBlob, setPreparedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!hiddenRef.current) { setIsGenerating(false); return; }
      try {
        const canvas = await html2canvas(hiddenRef.current, {
          scale: 3,
          backgroundColor: null,
          useCORS: true,
          logging: false,
          removeContainer: true,
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 1.0)
        );
        if (blob) {
          setPreparedBlob(blob);
          setBlobUrl(URL.createObjectURL(blob));
        }
      } catch (e) {
        console.error("Sticker render failed:", e);
      } finally {
        setIsGenerating(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [streak, userName]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  const handleDownload = useCallback(() => {
    if (!preparedBlob) return;
    const url = URL.createObjectURL(preparedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anaac-${streak}-dias-ativos.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Figurinha salva!");
  }, [preparedBlob, streak]);

  const handleCopy = useCallback(async () => {
    if (!preparedBlob) return;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": preparedBlob }),
        ]);
        toast.success("Figurinha copiada!");
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  }, [preparedBlob, handleDownload]);

  const flameColor = flameState === "frozen" ? "hsl(200, 100%, 60%)" : "#ff2a5f";

  return (
    <>
      {/* Hidden off-screen card — identical to VictoryCard */}
      <div
        ref={hiddenRef}
        style={{ position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <div
          style={{
            width: 280,
            padding: "30px 0",
            backgroundColor: "transparent",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Flame icon as inline SVG for html2canvas compatibility */}
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke={flameColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 4 }}
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>

          <p
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: flameColor,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: -4,
            }}
          >
            {flameState === "frozen" ? "CHAMA CONGELADA" : "DIAS ATIVOS"}
          </p>
          <p
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1,
              marginBottom: 0,
            }}
          >
            {streak}
          </p>

          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginTop: 24,
              opacity: 0.8,
            }}
          >
            ANAAC CLUB
          </p>
        </div>
      </div>

      {/* Visible preview */}
      <div className="flex flex-col items-center gap-4 pb-4">
        {/* Checkerboard background for transparency preview */}
        <style>{`
          .checkerboard-bg {
            background-color: #1a1a1a;
            background-image:
              linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
              linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
            background-size: 16px 16px;
            background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
          }
        `}</style>
        {isGenerating ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : blobUrl ? (
          <div className="checkerboard-bg rounded-2xl p-2">
            <img
              src={blobUrl}
              alt={`${streak} dias ativos`}
              className="w-64 rounded-xl"
              draggable
            />
          </div>
        ) : (
          /* Fallback static card matching VictoryCard style */
          <div className="w-64 rounded-2xl p-8 flex flex-col items-center gap-1 bg-black/40 border border-white/5">
            <Flame size={42} strokeWidth={2.5} color="#ff2a5f" />
            <p className="text-[26px] font-black uppercase tracking-wider" style={{ color: "#ff2a5f" }}>Dias Ativos</p>
            <p className="text-6xl font-black text-white leading-none">{streak}</p>
            <p className="text-sm font-medium text-white/80 uppercase mt-6" style={{ letterSpacing: "4px" }}>ANAAC CLUB</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Pressione e segure a imagem para salvar no celular
        </p>

        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 gap-2"
            onClick={handleDownload}
            disabled={!preparedBlob}
          >
            <Download size={16} /> Baixar
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCopy}
            disabled={!preparedBlob}
          >
            <Copy size={16} /> Copiar
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActiveDaysSticker;
