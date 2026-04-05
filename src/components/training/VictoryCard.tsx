/**
 * @purpose Victory Card (Strava-style) — replaces the old completion form and WorkoutShareCard.
 * Uses html2canvas for image generation and clipboard.write() for copy-to-clipboard.
 * Implement "Zero Friction" strategy with pre-rendering for Safari/iOS compatibility.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Clock, Check, Copy, Camera, Share2, Navigation, Download, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { formatTime } from "./helpers";
import { useFlameState } from "@/hooks/useFlameState";
import insanoLogo from "@/assets/anaac-logo.png";
import { cn } from "@/lib/utils";

interface VictoryCardProps {
  groupName: string;
  duration: number;
  completedSets: number;
  totalSets: number;
  volume: number;
  /** If true, shows KM field (for running activities) */
  isRunning?: boolean;
  runDistance?: number;
  streak: number;
  onPublishToCommunity?: (caption: string, imageBlob?: Blob) => void;
  onDismiss: () => void;
}

const VictoryCard = ({
  groupName,
  duration,
  completedSets,
  totalSets,
  volume,
  isRunning = false,
  runDistance,
  streak,
  onPublishToCommunity,
  onDismiss,
}: VictoryCardProps) => {
  const { state: flameState } = useFlameState();
  const cardRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [showPublisher, setShowPublisher] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [preparedBlob, setPreparedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const volumeDisplay = volume > 0 ? `${(volume / 1000).toFixed(1)}T` : "—";

  /** Generate image blob from the card DOM */
  const generateImage = useCallback(async (scale = 3): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: scale,
        backgroundColor: "rgba(0,0,0,0)",
        useCORS: true,
        logging: false,
        removeContainer: true,
      });
      
      return new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1.0)
      );
    } catch (err) {
      console.error("html2canvas error:", err);
      return null;
    }
  }, []);

  /** Background Pre-render on Mount */
  useEffect(() => {
    const timer = setTimeout(async () => {
      const blob = await generateImage(3);
      if (blob) setPreparedBlob(blob);
    }, 500); 
    return () => clearTimeout(timer);
  }, [generateImage]);

  /** Download fallback */
  const downloadImageFallback = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treino-anaac-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Imagem salva com sucesso! 📥");
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Copy card as image — Zero Friction Strategy */
  const handleCopy = useCallback(async () => {
    if (isCopying) return;
    setIsCopying(true);

    try {
      // 1. Synchronous write if blob is ready (Best for Safari)
      if (preparedBlob && navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": preparedBlob }),
        ]);
        toast.success("Copiado! 🔥");
        setIsCopying(false);
        return;
      }

      // 2. Promise pattern for ClipboardItem (Safety net)
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
           "image/png": (async () => {
              const blob = preparedBlob || await generateImage(3);
              if (!blob) throw new Error("Generation failed");
              return blob;
           })()
        });
        await navigator.clipboard.write([item]);
        toast.success("Copiado! 🔥");
      } else {
        // 3. Last resort fallback
        const blob = preparedBlob || await generateImage(3);
        if (blob) downloadImageFallback(blob);
      }
    } catch (err) {
      console.error("Clipboard Error:", err);
      const lastResort = preparedBlob || await generateImage(3);
      if (lastResort) downloadImageFallback(lastResort);
      else toast.error("Erro ao gerar imagem.");
    } finally {
      setIsCopying(false);
    }
  }, [preparedBlob, generateImage, isCopying]);

  /** Direct download handler */
  const handleDownloadClick = useCallback(async () => {
    setIsCopying(true);
    try {
      const blob = preparedBlob || await generateImage(3);
      if (blob) downloadImageFallback(blob);
    } catch (err) {
      toast.error("Erro ao processar imagem");
    } finally {
      setIsCopying(false);
    }
  }, [preparedBlob, generateImage]);

  /** Publish to community */
  const handlePublish = useCallback(async () => {
    if (posted) return;
    setIsCopying(true);
    try {
      const blob = selectedFile || preparedBlob || await generateImage(3);
      onPublishToCommunity?.(caption, blob || undefined);
      setPosted(true);
      setShowPublisher(false);
      toast.success("Publicado na Comunidade! 🔥");
    } catch (err) {
      toast.error("Erro ao publicar");
    } finally {
      setIsCopying(false);
    }
  }, [caption, posted, generateImage, preparedBlob, selectedFile, onPublishToCommunity]);

  return (
    <div className="p-4 max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col items-center justify-center pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 w-full"
      >
        {/* ─── Card Preview (capture target) ─── */}
        <div className="bg-black/40 p-10 rounded-3xl border border-white/5 backdrop-blur-sm">
          <div
            ref={cardRef}
            className="w-[280px] relative px-4"
            style={{
              backgroundColor: "transparent",
              fontFamily: "'Inter', sans-serif",
              padding: "30px 0",
            }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              {/* Flame Header */}
              <div className="flex items-center justify-center relative mb-1">
                <Flame
                  size={42}
                  strokeWidth={2.5}
                  color={flameState === "frozen" ? "hsl(200, 100%, 60%)" : "#ff2a5f"}
                  className="relative z-10"
                />
              </div>

            {/* Days Active */}
            <p
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: flameState === "frozen" ? "hsl(200, 100%, 60%)" : "#ff2a5f",
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

            {/* Logo + Branding */}
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
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="w-full max-w-[360px] flex flex-col gap-3">
          {/* Action Buttons: Copy & Download */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopy}
              disabled={isCopying}
              className="py-3.5 bg-secondary/80 hover:bg-secondary text-foreground font-cinzel font-bold text-[10px] rounded-xl tracking-wider disabled:opacity-50 flex flex-col items-center justify-center gap-1 border border-border/50 transition-colors"
            >
              {isCopying ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
              COPIAR
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadClick}
              disabled={isCopying}
              className="py-3.5 bg-secondary/80 hover:bg-secondary text-foreground font-cinzel font-bold text-[10px] rounded-xl tracking-wider disabled:opacity-50 flex flex-col items-center justify-center gap-1 border border-border/50 transition-colors"
            >
              {isCopying ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              BAIXAR
            </motion.button>
          </div>

          {/* Publish to community */}
          {!showPublisher ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPublisher(true)}
              disabled={posted}
              className="w-full py-4 crimson-gradient text-primary-foreground font-cinzel font-bold text-base rounded-xl crimson-shadow tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="text-xl">🔥</span>
              {posted ? "PUBLICADO!" : "PUBLICAR NA COMUNIDADE"}
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative flex border border-border/50 rounded-xl overflow-hidden bg-secondary/50 p-2 min-h-[160px] items-center justify-center cursor-pointer hover:bg-secondary transition-colors"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                />
                
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={previewUrl} className="w-full h-40 object-cover rounded-lg" alt="Preview" />
                    <button 
                      onClick={removeSelectedFile}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    >
                      <Check size={14} className="rotate-45" /> {/* Close icon substitute */}
                    </button>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-bold flex flex-col items-center gap-2">
                    <Camera size={24} />
                    Tirar Foto / Galeria
                  </p>
                )}
              </div>
              <textarea
                placeholder="Como foi o treino hoje? (ex: 'Perna destruída!')"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-background border border-border/50 text-foreground resize-none h-20 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePublish}
                disabled={posted}
                className="w-full py-3.5 crimson-gradient text-primary-foreground font-cinzel font-bold text-sm rounded-xl crimson-shadow tracking-widest disabled:opacity-50"
              >
                🚀 PUBLICAR POST
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={onDismiss}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular
        </button>
      </motion.div>
    </div>
  );
};

export default VictoryCard;
