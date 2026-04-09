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

  // Pre-render the sticker off-screen after 500ms (Safari compat)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!hiddenRef.current) { setIsGenerating(false); return; }
      try {
        const canvas = await html2canvas(hiddenRef.current, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          logging: false,
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

  // Cleanup blob URL
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
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": preparedBlob }),
      ]);
      toast.success("Figurinha copiada!");
    } catch {
      // Fallback: download instead
      handleDownload();
    }
  }, [preparedBlob, handleDownload]);

  const flameColor = flameState === "ativa" ? "text-orange-500" : "text-muted-foreground";

  return (
    <>
      {/* Hidden off-screen card for html2canvas capture */}
      <div
        ref={hiddenRef}
        style={{ position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <div
          style={{
            width: 360,
            padding: 32,
            borderRadius: 24,
            background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 56 }}>🔥</div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#f97316",
              lineHeight: 1,
            }}
          >
            {streak}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            Dias Ativos
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#94a3b8",
              marginTop: 4,
            }}
          >
            {userName}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#64748b",
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            ANAAC CLUB
          </div>
        </div>
      </div>

      {/* Visible preview in Sheet */}
      <div className="flex flex-col items-center gap-4 pb-4">
        {isGenerating ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : blobUrl ? (
          <img
            src={blobUrl}
            alt={`${streak} dias ativos`}
            className="w-64 rounded-2xl shadow-lg"
            draggable
          />
        ) : (
          /* Fallback static card if html2canvas failed */
          <div className="w-64 rounded-2xl p-8 flex flex-col items-center gap-3 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
            <Flame size={48} className="text-orange-500" />
            <p className="text-5xl font-black text-orange-500">{streak}</p>
            <p className="text-sm font-bold text-white uppercase tracking-widest">Dias Ativos</p>
            <p className="text-xs text-slate-400">{userName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-[4px] font-bold mt-2">ANAAC CLUB</p>
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
