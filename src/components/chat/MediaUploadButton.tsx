import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PhotoSourcePicker from "@/components/PhotoSourcePicker";

interface MediaUploadButtonProps {
  conversationId: string;
  onMediaSent: (url: string, type: "image" | "video", metadata: { width: number; height: number; size: number }) => void;
  disabled?: boolean;
}

const MediaUploadButton = ({ conversationId, onMediaSent, disabled }: MediaUploadButtonProps) => {
  const handleFile = async (file: File) => {
    toast.info("Upload de mídia temporariamente desativado.");
  };

  return (
    <PhotoSourcePicker accept="image/*,video/*" onFile={handleFile} disabled={disabled}>
      <button
        disabled={disabled}
        className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50 shrink-0"
      >
        <ImagePlus size={18} className="text-muted-foreground" />
      </button>
    </PhotoSourcePicker>
  );
};

export default MediaUploadButton;
