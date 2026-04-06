import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, User, Send, Loader2, BadgeCheck, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PostDetailModal } from "./PostDetailModal";

interface CommunityPost {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  isOptimistic?: boolean;
  profiles?: { full_name: string; avatar_url?: string; is_verified?: boolean };
  community_reactions?: { user_id: string; reaction_type: string }[];
}

export function PostCard({ post, onAvatarClick }: { post: CommunityPost; onAvatarClick: (userId: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [heartBurst, setHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Fetch real likes from post_likes table ──
  const { data: likes = [] } = useQuery({
    queryKey: ["post-likes", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", post.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !post.isOptimistic,
  });

  // ── Fetch comment count ──
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["post-comment-count", post.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("post_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !post.isOptimistic,
  });

  const hasLiked = likes.some((l: any) => l.user_id === user?.id);
  const likeCount = likes.length;

  // ── Like mutation with optimistic UI ──
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (hasLiked) {
        await supabase.from("post_likes").delete()
          .eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post-likes", post.id] });
      const prev = queryClient.getQueryData(["post-likes", post.id]);
      queryClient.setQueryData(["post-likes", post.id], (old: any[] = []) => {
        if (hasLiked) return old.filter((l: any) => l.user_id !== user?.id);
        return [...old, { user_id: user?.id }];
      });
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev) queryClient.setQueryData(["post-likes", post.id], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post-likes", post.id] });
    },
  });

  const handleHeartClick = () => {
    if (post.isOptimistic || !user) return;
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 600);
    likeMutation.mutate();
  };

  // ── Edit post mutation ──
  const editMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const { error } = await supabase.from("community_posts")
        .update({ content: newContent } as any)
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Post atualizado!");
    },
    onError: () => toast.error("Erro ao editar post."),
  });

  // ── Delete post mutation ──
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Post excluído!");
    },
    onError: () => toast.error("Erro ao excluir post."),
  });

  const isOwner = user?.id === post.user_id;

  return (
    <>
      <div className={`bg-card border-b border-border overflow-hidden transition-all duration-300 ${post.isOptimistic ? "opacity-50 pointer-events-none" : ""}`}>
        {/* ── Header ── */}
        <div className="p-4 flex items-center justify-between">
          <button className="flex items-center gap-3 text-left" onClick={() => !post.isOptimistic && onAvatarClick(post.user_id)}>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold font-cinzel text-foreground leading-tight flex items-center gap-1.5">
                {post.profiles?.full_name || "Anônimo"}
                {post.profiles?.is_verified && (
                  <BadgeCheck size={14} className="text-blue-500 fill-blue-500/20" />
                )}
              </p>
              <span className="text-[10px] text-muted-foreground/50">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </button>

          {/* 3-dot menu for own posts */}
          {isOwner && !post.isOptimistic && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
              >
                <MoreHorizontal size={18} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-20 min-w-[140px] overflow-hidden"
                  >
                    <button
                      onClick={() => { setIsEditing(true); setEditContent(post.content); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir este post?")) deleteMutation.mutate(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Media ── */}
        {post.image_url && (
          <div className="relative" onDoubleClick={handleHeartClick}>
            <div className="overflow-hidden bg-secondary/20 relative">
              <img src={post.image_url} alt="Post media" className="w-full max-h-[600px] object-cover" />
              <AnimatePresence>
                {heartBurst && (
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Heart size={80} className="text-red-500 fill-red-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Content / Edit mode ── */}
        {isEditing ? (
          <div className="px-4 py-3 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground px-3 py-1.5">Cancelar</button>
              <button
                onClick={() => editMutation.mutate(editContent)}
                disabled={editMutation.isPending || !editContent.trim()}
                className="text-xs font-bold bg-primary text-white px-4 py-1.5 rounded-lg disabled:opacity-40"
              >
                {editMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Salvar"}
              </button>
            </div>
          </div>
        ) : post.content ? (
          <div className="px-4 py-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{post.content}</p>
          </div>
        ) : null}

        {/* ── Actions ── */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <button
            onClick={handleHeartClick}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 outline-none ${
              hasLiked
                ? "text-red-500 bg-red-500/10 ring-1 ring-red-500/30"
                : "text-muted-foreground hover:bg-secondary ring-1 ring-transparent"
            }`}
          >
            <motion.span animate={heartBurst ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart size={16} className={hasLiked ? "fill-red-500 text-red-500" : "group-hover:text-red-500 transition-colors"} />
            </motion.span>
            <span className="text-xs font-bold leading-none">{likeCount}</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => !post.isOptimistic && setShowDetailModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle size={16} />
            <span className="text-xs font-bold">{commentCount > 0 ? commentCount : "Comentar"}</span>
          </button>
        </div>
      </div>

      {/* Detail Modal for comments */}
      <PostDetailModal
        post={post}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        autoFocusComment
      />
    </>
  );
}
