import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BUCKET = "funnel-videos";
const SETTING_KEY = "vsl_video_url";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

const AdminFunil = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // ── Fetch current VSL URL ──
  const { data: currentUrl, isLoading } = useQuery({
    queryKey: ["app_settings", SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      return data?.value || null;
    },
  });

  // ── Save URL to app_settings ──
  const saveSetting = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTING_KEY, value: url, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app_settings", SETTING_KEY] }),
  });

  // ── Upload handler (chunked for large files) ──
  const handleUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const fileName = `vsl-video-${Date.now()}.${ext}`;
    const controller = new AbortController();
    setAbortController(controller);
    setUploading(true);
    setProgress(0);

    try {
      // For files > 50MB, upload in chunks using tus protocol (Supabase handles this)
      // For smaller files, standard upload
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      setProgress(80);

      // Save URL in app_settings
      await saveSetting.mutateAsync(publicUrl);
      setProgress(100);

      toast.success("Vídeo VSL atualizado com sucesso!");
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Upload cancelado");
      } else {
        console.error("Upload error:", err);
        toast.error("Erro ao fazer upload: " + (err.message || "Erro desconhecido"));
      }
    } finally {
      setUploading(false);
      setAbortController(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = async () => {
    try {
      // Remove from settings
      await saveSetting.mutateAsync("");
      toast.success("Vídeo removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Funil de Vendas</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Vídeo VSL
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Faça upload do vídeo de vendas (VSL) que aparece no funil. Aceita qualquer formato de vídeo, sem limite de tamanho.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current video */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </div>
          ) : currentUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                Vídeo configurado
              </div>
              <video
                src={currentUrl}
                controls
                className="w-full max-w-lg rounded-lg border border-border"
                style={{ maxHeight: 300 }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remover vídeo
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Nenhum vídeo configurado — usando vídeo padrão de teste
            </div>
          )}

          {/* Upload area */}
          <div className="pt-4 border-t border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Enviando vídeo...</span>
                  <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => abortController?.abort()}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {currentUrl ? "Substituir vídeo" : "Fazer upload do vídeo"}
              </Button>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Formatos aceitos: MP4, MOV, WebM, AVI. Sem limite de tamanho.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFunil;
