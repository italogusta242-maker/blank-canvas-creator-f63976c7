import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, MessageCircle, Send, User,
  Loader2, CornerDownRight, BadgeCheck
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PostDetailModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  autoFocusComment?: boolean;
}

/* ── Skeleton for loading comments ── */
const CommentSkeleton = () => (
  <div className="space-y-5">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <div className="w-6 h-6 rounded-full bg-secondary/80 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-secondary/80 rounded-full w-24" />
          <div className="h-3 bg-secondary/60 rounded-full w-3/4" />
          <div className="h-2 bg-secondary/40 rounded-full w-16 mt-1" />
        </div>
      </div>
    ))}
  </div>
);

export function PostDetailModal({ post, isOpen, onClose, autoFocusComment }: PostDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AutoFocus comment input when modal opens
  useEffect(() => {
    if (isOpen && autoFocusComment) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, autoFocusComment]);

  // ── Fetch comments + profiles separately to avoid broken FK join ──
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["post-comments-detail", post?.id],
    queryFn: async () => {
      if (!post?.id) return [];

      // Step 1: fetch raw comments (no join)
      const { data: rawComments, error } = await supabase
        .from("post_comments")
        .select("id, content, created_at, user_id, post_id")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }
      if (!rawComments || rawComments.length === 0) return [];

      // Step 2: batch-fetch profiles for all unique commenter user_ids
      const uniqueUserIds = [...new Set(rawComments.map((c) => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", uniqueUserIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      // Step 3: merge profiles into comments
      return rawComments.map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || { full_name: "Usuário", avatar_url: null, is_verified: false },
      }));
    },
    enabled: !!post?.id && isOpen,
    staleTime: 5000,
    retry: 2,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ["post-likes", post?.id],
    queryFn: async () => {
      if (!post?.id) return [];
      const { data, error } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", post.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!post?.id && isOpen,
  });

  const hasLiked = likes.some((l: any) => l.user_id === user?.id);

  const likeMutation = useMutation({
    mutationFn: async (_unused?: undefined) => {
      if (!user || !post?.id) return;
      if (hasLiked) {
        await supabase.from("post_likes").delete()
          .eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post-likes", post?.id] });
      const prev = queryClient.getQueryData(["post-likes", post?.id]);
      queryClient.setQueryData(["post-likes", post?.id], (old: any[] = []) => {
        if (hasLiked) return old.filter((l: any) => l.user_id !== user?.id);
        return [...old, { user_id: user?.id }];
      });
      return { prev };
    },
    onError: (_err: any, _vars: any, context: any) => {
      if (context?.prev) queryClient.setQueryData(["post-likes", post?.id], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post-likes", post?.id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !post?.id) return;
      let finalContent = text;
      if (replyingTo) {
        finalContent = `[reply:${replyingTo.id}] ${text}`;
      }
      const { error } = await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: user.id,
        content: finalContent,
      });
      if (error) throw error;
    },
    onMutate: async (text: string) => {
      // Optimistic comment
      await queryClient.cancelQueries({ queryKey: ["post-comments-detail", post?.id] });
      const prev = queryClient.getQueryData(["post-comments-detail", post?.id]);
      const optimistic = {
        id: `temp-${Date.now()}`,
        content: replyingTo ? `[reply:${replyingTo.id}] ${text}` : text,
        created_at: new Date().toISOString(),
        user_id: user?.id,
        profiles: { full_name: "Você", avatar_url: null, is_verified: false },
      };
      queryClient.setQueryData(["post-comments-detail", post?.id], (old: any[] = []) => [...old, optimistic]);
      return { prev };
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      // Force immediate refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ["post-comments-detail", post?.id] });
      queryClient.invalidateQueries({ queryKey: ["post-comment-count", post?.id] });
      toast.success("Comentário enviado! 🔥");
    },
    onError: (_err: any, _vars: any, context: any) => {
      if (context?.prev) queryClient.setQueryData(["post-comments-detail", post?.id], context.prev);
      toast.error("Erro ao comentar.");
    },
  });

  if (!post) return null;

  const processedComments = comments.filter((c: any) => !c.content.startsWith("[reply:"));
  const replies = comments.filter((c: any) => c.content.startsWith("[reply:"));
  const getRepliesFor = (id: string) =>
    replies.filter((r: any) => r.content.includes(`[reply:${id}]`)).map((r: any) => ({
      ...r,
      cleanContent: r.content.split("] ").slice(1).join("] "),
    }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-background shadow-2xl h-[90vh] md:h-[85vh] [&>button]:hidden">
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left: Image */}
          {post.image_url && (
            <div className="w-full h-[40vh] md:h-full md:w-7/12 bg-black flex items-center justify-center relative overflow-hidden shrink-0">
              <img src={post.image_url + '?width=800&resize=contain'} alt="Post" className="max-w-full max-h-full object-contain" decoding="async" />
            </div>
          )}

          {/* Right: Interaction */}
          <div className={`w-full flex-1 ${post.image_url ? "md:w-5/12" : ""} flex flex-col bg-card border-l border-border overflow-hidden`}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-primary/20">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="bg-secondary"><User size={16} /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-black font-cinzel uppercase flex items-center gap-1.5 leading-none">
                    {post.profiles?.full_name || "Usuário"}
                    {post.profiles?.is_verified && <BadgeCheck size={14} className="text-blue-500 fill-blue-500/20" />}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors border border-border/30">
                <X size={18} />
              </button>
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
              {post.content && (
                <div className="flex gap-3">
                  <Avatar className="w-6 h-6 border border-primary/20">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback className="bg-secondary"><User size={12} /></AvatarFallback>
                  </Avatar>
                  <p className="text-[11px] leading-relaxed flex items-center gap-1 flex-wrap mt-0.5">
                    <span className="font-black font-cinzel uppercase mr-1 flex items-center gap-1">
                      {post.profiles?.full_name}:
                      {post.profiles?.is_verified && <BadgeCheck size={12} className="text-blue-500 fill-blue-500/20" />}
                    </span>
                    {post.content}
                  </p>
                </div>
              )}

              <div className="space-y-6 pt-4 border-t border-border/50">
                {isLoadingComments ? (
                  <CommentSkeleton />
                ) : processedComments.length === 0 ? (
                  <p className="text-center text-[10px] text-muted-foreground italic py-10">Seja a primeira a comentar! 🔥</p>
                ) : (
                  processedComments.map((comment: any) => (
                    <div key={comment.id} className="space-y-4">
                      <div className="flex gap-3">
                        <Avatar className="w-6 h-6 border border-primary/20">
                          <AvatarImage src={comment.profiles?.avatar_url} />
                          <AvatarFallback className="bg-secondary"><User size={12} /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-[11px] leading-snug flex items-center gap-1 flex-wrap">
                            <span className="font-cinzel text-sm font-bold text-foreground">
                              {comment.profiles?.full_name || "Usuário"}
                            </span>
                            {comment.profiles?.is_verified && <BadgeCheck size={12} className="text-blue-500 fill-blue-500/20" />}
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-3 opacity-60">
                            <span className="text-[9px] uppercase font-bold tracking-tighter">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false, locale: ptBR })}
                            </span>
                            <button onClick={() => setReplyingTo(comment)} className="text-[9px] uppercase font-black hover:text-primary transition-colors">
                              Responder
                            </button>
                          </div>
                        </div>
                      </div>
                      {getRepliesFor(comment.id).length > 0 && (
                        <div className="pl-9 space-y-4">
                          {getRepliesFor(comment.id).map((rep: any) => (
                            <div key={rep.id} className="flex gap-2">
                              <CornerDownRight size={12} className="text-muted-foreground/30 mt-1" />
                              <Avatar className="w-5 h-5 border border-primary/10">
                                <AvatarImage src={rep.profiles?.avatar_url} />
                                <AvatarFallback className="bg-secondary text-[8px]"><User size={8} /></AvatarFallback>
                              </Avatar>
                              <p className="text-[10px] leading-snug flex items-center gap-1 flex-wrap flex-1">
                                <span className="font-black font-cinzel uppercase flex items-center gap-1">
                                  {rep.profiles?.nome}:
                                  {rep.profiles?.is_verified && <BadgeCheck size={10} className="text-blue-500 fill-blue-500/20" />}
                                </span>
                                {rep.cleanContent}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions + Input */}
            <div className="p-4 border-t border-border bg-card shrink-0 pb-6 md:pb-4">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => likeMutation.mutate(undefined)}
                  className={`flex items-center gap-1.5 transition-all ${hasLiked ? "text-red-500 scale-110" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Heart size={20} className={hasLiked ? "fill-current" : ""} />
                </button>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => inputRef.current?.focus()}>
                  <MessageCircle size={20} />
                </button>
                <div className="flex-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {likes.length} {likes.length === 1 ? "Curtida" : "Curtidas"}
                </span>
              </div>

              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center justify-between bg-primary/5 px-3 py-1.5 rounded-lg mb-3 border border-primary/10"
                  >
                    <p className="text-[9px] font-bold text-primary italic">Respondendo a {replyingTo.profiles?.nome}...</p>
                    <button onClick={() => setReplyingTo(null)} className="text-primary hover:text-primary/70"><X size={12} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newComment.trim() && addCommentMutation.mutate(newComment)}
                  placeholder="Adicione um comentário..."
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary/30 pr-10"
                />
                <button
                  onClick={() => newComment.trim() && addCommentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70 disabled:opacity-30"
                >
                  {addCommentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
