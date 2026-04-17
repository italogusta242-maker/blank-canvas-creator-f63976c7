import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Camera, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { shouldIncrementFlame } from "@/hooks/useDailyFlameCheck";
import { optimisticFlameUpdate } from "@/lib/flameOptimistic";
import { checkAndUpdateFlame } from "@/lib/flameMotor";
import { enqueue } from "@/lib/offlineQueue";

/* ── Compress image client-side before upload ── */
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function CreatePost({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
  };
  const removeImage = () => { setImage(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; };

  const queryClient = useQueryClient();

  const postMutation = useMutation({
    onMutate: async ({ content, image, preview }: any) => {
      if (!user || (!content.trim() && !image)) return;
      
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previousData = queryClient.getQueryData(["community-posts"]);
      
      const tempId = `temp-${Date.now()}`;
      const tempPost = {
         id: tempId,
         content: content.trim(),
         image_url: preview, 
         created_at: new Date().toISOString(),
         user_id: user.id,
         isOptimistic: true, 
         profiles: { full_name: profile?.full_name, avatar_url: profile?.avatar_url },
         community_reactions: []
      };
      
      queryClient.setQueryData(["community-posts"], (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) return old;
        return {
           ...old,
           pages: [[tempPost, ...old.pages[0]], ...old.pages.slice(1)]
        };
      });
      
      setContent(""); 
      removeImage();
      setOpen(false);

      // Optimistic flame update
      const shouldIncrement = await shouldIncrementFlame(user.id);
      if (shouldIncrement) {
        await queryClient.cancelQueries({ queryKey: ["flame-state", user.id] });
        optimisticFlameUpdate(queryClient, user.id, {
          adherenceDelta: 15,
          forceActive: true,
          streakIncrement: true,
        });
      }
      
      return { previousData };
    },
    mutationFn: async ({ content, image }: any) => {
      if (!user || (!content.trim() && !image)) return;

      // Se offline, joga direto na fila e sai (UI já mostra otimisticamente)
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const blob = image ? await compressImage(image) : undefined;
        await enqueue({
          type: "community_post",
          userId: user.id,
          content: content.trim(),
          imageBlob: blob,
          imageType: "image/jpeg",
        });
        toast.success("Salvo offline. Será enviado ao voltar a conexão.");
        return;
      }

      try {
        let mediaUrl: string | null = null;
        if (image) {
          const compressed = await compressImage(image);
          const path = `${user.id}/${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("community_media").upload(path, compressed, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from("community_media").getPublicUrl(path);
          mediaUrl = publicUrl;
        }
        const { error: insErr } = await (supabase as any).from("community_posts").insert({
          user_id: user.id,
          content: content.trim(),
          image_url: mediaUrl,
        });
        if (insErr) throw insErr;

        // Update flame in DB
        try {
          await checkAndUpdateFlame(user.id);
        } catch (e) {
          console.warn("Flame update failed (non-critical):", e);
        }

        // If verified user, trigger global broadcast notification
        if ((profile as any)?.is_verified) {
          try {
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            await fetch(`https://${projectId}.supabase.co/functions/v1/gamification-engine`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "admin_broadcast_webhook",
                payload: { record: { user_id: user.id, content: content.trim() } },
              }),
            });
          } catch (e) {
            console.warn("Broadcast notification failed (non-critical):", e);
          }
        }
      } catch (e: any) {
        // Falha de rede / timeout / Load failed → cai pra fila offline
        const msg = String(e?.message || "");
        const isNetworkErr =
          msg.includes("Load failed") ||
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("network") ||
          msg.includes("timeout");
        if (isNetworkErr) {
          const blob = image ? await compressImage(image) : undefined;
          await enqueue({
            type: "community_post",
            userId: user.id,
            content: content.trim(),
            imageBlob: blob,
            imageType: "image/jpeg",
          });
          toast.success("Conexão instável. Salvo offline e será enviado em breve.");
          return;
        }
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("Publicado! 🔥");
    },
    onError: (err: any, newPost, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(["community-posts"], context.previousData);
      }
      console.error("Post creation error:", err);
      toast.error(err.message || "Erro ao publicar.");
    },
    onSettled: () => {
      // Invalida TODAS as queries relacionadas à chama/streak para refletir
      // imediatamente o novo post como dia ativo (regra: post = chama acesa).
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["flame-state"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["week-activity"] });
      queryClient.invalidateQueries({ queryKey: ["streak-history"] });
      queryClient.invalidateQueries({ queryKey: ["daily-flame-check"] });
      if (user?.id) {
        queryClient.refetchQueries({ queryKey: ["flame-state", user.id] });
        queryClient.refetchQueries({ queryKey: ["streak", user.id] });
      }
      onPosted();
    }
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-deep">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/20 overflow-hidden shrink-0">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={18} />}
          </div>
          <span className="text-sm bg-secondary/50 rounded-xl border border-border px-4 py-2.5 flex-1 text-left">
            Compartilhe sua conquista...
          </span>
          <Plus size={18} className="text-primary shrink-0" />
        </button>
      ) : (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que você conquistou hoje? Inspire a galera! 🔥"
            rows={3}
            className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />
          {/* Image preview */}
          <AnimatePresence>
            {preview && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative rounded-xl overflow-hidden aspect-video border border-border">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between">
            <div>
              <input type="file" hidden ref={fileRef} accept="image/*" onChange={handleImagePick} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs px-3 py-1.5 rounded-lg hover:bg-secondary">
                <Camera size={16} /> Foto
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setOpen(false); removeImage(); }} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
              <button
                onClick={() => postMutation.mutate({ content, image, preview })}
                disabled={(!content.trim() && !image) || postMutation.isPending}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                {postMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
