import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Camera, CreditCard, LogOut, Shield,
  MessageCircle, MoreHorizontal,
  Flame, ImageIcon, Trophy, Grid3x3, Settings, Check, Users, Loader2, X,
  CheckCircle2, ExternalLink, Zap, Gift, HelpCircle, BadgeCheck
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import PhotoSourcePicker from "@/components/PhotoSourcePicker";
import { useChangePasswordTrigger } from "@/components/ChangePasswordSection";
import { getUnlockedRewards } from "@/lib/flameMotor";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStreak } from "@/hooks/useStreak";
import { PostDetailModal } from "@/components/community/PostDetailModal";

// ── Photo Zoom Dialog Component ──
function PhotoZoomDialog({ url, isOpen, onClose }: { url: string | null; isOpen: boolean; onClose: () => void }) {
  if (!url) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full">
        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={url}
          alt="Zoom"
          className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Follow Hook ──
function useFollowState(targetUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return false;
      const { data } = await (supabase as any)
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !targetUserId) return;
      if (isFollowing) {
        await (supabase as any).from("followers").delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
      } else {
        await (supabase as any).from("followers").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      const prev = queryClient.getQueryData(["is-following", user?.id, targetUserId]);
      queryClient.setQueryData(["is-following", user?.id, targetUserId], !isFollowing);
      return { prev };
    },
    onError: (_, __, context: any) => {
      queryClient.setQueryData(["is-following", user?.id, targetUserId], context?.prev);
      toast.error("Erro ao seguir.");
    },
    onSuccess: () => {
      toast.success(isFollowing ? "Você deixou de seguir." : "Você agora segue esta pessoa! 🔥");
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["social-counts", targetUserId] });
    },
  });

  return { isFollowing, followMutation };
}

// ── Photo Grid ──
function PhotoGrid({ userId }: { userId?: string }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["user-photo-posts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          id, 
          image_url, 
          created_at, 
          content,
          user_id,
          profiles (id, full_name, avatar_url, is_verified),
          community_reactions (id),
          post_comments (id)
        `)
        .eq("user_id", userId)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(21);
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        likesCount: p.community_reactions?.length || 0,
        commentsCount: p.post_comments?.length || 0
      }));
    },
    enabled: !!userId,
  });

  const isOwner = currentUser?.id === userId;

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-photo-posts", userId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Post excluído!");
    },
    onError: () => toast.error("Erro ao excluir post."),
  });

  if (isLoading) return (
    <div className="grid grid-cols-3 gap-px">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square bg-secondary/50 animate-pulse" />
      ))}
    </div>
  );

  if (posts.length === 0) return (
    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
      <ImageIcon className="mx-auto mb-3 opacity-20" size={40} />
      <p className="text-sm">Nenhuma foto publicada ainda.</p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden">
        {posts.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelectedPost(p)}
            className="aspect-square overflow-hidden relative group cursor-pointer"
          >
            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
            
            {/* Instagram-style Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5 text-white">
                <Flame size={18} className="fill-white" />
                <span className="font-black text-sm">{p.likesCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white">
                <MessageCircle size={18} className="fill-white" />
                <span className="font-black text-sm">{p.commentsCount}</span>
              </div>
            </div>

            {/* Delete button for own posts */}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Excluir este post?")) deleteMutation.mutate(p.id);
                }}
                className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 z-10"
              >
                <X size={12} />
              </button>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Detail Modal (Instagram-style) */}
      <PostDetailModal 
        post={selectedPost} 
        isOpen={!!selectedPost} 
        onClose={() => setSelectedPost(null)} 
      />
    </>
  );
}

// ── Badges ──
function UserBadges({ streak }: { streak: number }) {
  const unlocked = getUnlockedRewards(streak);

  if (unlocked.length === 0) return null;

  const tierColors: Record<string, string> = {
    bronze: "from-amber-700 to-amber-500",
    silver: "from-gray-400 to-gray-200",
    gold: "from-yellow-500 to-amber-300",
    diamond: "from-cyan-400 to-blue-300",
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {unlocked.map((r) => (
        <motion.div
          key={r.days}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border border-border bg-gradient-to-br ${tierColors[r.tier] || "from-gray-500 to-gray-400"} text-white shadow-deep`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} />
            <span className="text-xs font-black uppercase">{r.days} Dias</span>
          </div>
          <p className="font-cinzel text-sm font-bold">{r.title}</p>
          <p className="text-[10px] mt-1 opacity-80 leading-snug">{r.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

const Perfil = () => {
  const { userId } = useParams();
  const { signOut, user: currentUser } = useAuth();
  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, status, phone, avatar_url, created_at, is_verified, planner_type")
        .eq("id", targetUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const { isFollowing, followMutation } = useFollowState(isOwnProfile ? null : (targetUserId || null));

  const [editOpen, setEditOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { setOpen: setPwOpen, ChangePasswordSheet } = useChangePasswordTrigger();

  const avatarUrl = profile?.avatar_url ?? null;
  const full_name = profile?.full_name ?? "Usuário";

  const { data: socialCounts } = useQuery({
    queryKey: ["social-counts", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { followers: 0, following: 0, posts: 0, workoutsCount: 0, points: 0 };
      const [
        { data: followers }, 
        { data: following }, 
        { count: posts }, 
        { count: workoutsCount },
        { data: newPoints },
      ] = await Promise.all([
        (supabase as any).from("followers").select("id").eq("following_id", targetUserId),
        (supabase as any).from("followers").select("id").eq("follower_id", targetUserId),
        (supabase as any).from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).not("image_url", "is", null),
        supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).not("finished_at", "is", null),
        supabase.from("hustle_points").select("points").eq("user_id", targetUserId),
      ]);

      const totalPoints = (newPoints || []).reduce((acc: number, curr: any) => acc + (curr.points || 0), 0);

      return {
        followers: (followers || []).length,
        following: (following || []).length,
        posts: posts || 0,
        workoutsCount: workoutsCount || 0,
        points: totalPoints,
      };
    },
    enabled: !!targetUserId,
  });

  const { data: streakData } = useStreak(targetUserId);
  const streakNum = Number(streakData?.streak || 0);

  const [editForm, setEditForm] = useState({ full_name: "" });
  const [stickerOpen, setStickerOpen] = useState(false);
  useEffect(() => {
    if (profile && isOwnProfile) setEditForm({ full_name: profile.full_name || "" });
  }, [profile, isOwnProfile]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: editForm.full_name.trim() }).eq("id", currentUser.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
      queryClient.invalidateQueries({ queryKey: ["profile", currentUser.id] });
      setEditOpen(false);
    }
  };

  const handleAvatarFile = async (file: File) => {
    if (!currentUser) return;
    const ext = file.name.split(".").pop();
    const path = `${currentUser.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar foto");
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", currentUser.id);
    toast.success("Avatar atualizado!");
    queryClient.invalidateQueries({ queryKey: ["profile", currentUser.id] });
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-xl mx-auto px-4 pt-8">
        
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {!isOwnProfile && (
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground">
                <X size={20} />
              </button>
            )}
            <h1 className="font-cinzel text-xl font-bold text-foreground">
              {isOwnProfile ? "Perfil" : full_name}
            </h1>
          </div>
          {isOwnProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors border border-border">
                  <MoreHorizontal size={20} className="text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border shadow-xl">
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                  <Settings size={15} /> Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => window.open('https://wa.me/556196383321?text=Oi%20Ana!%20quero%20gerenciar%20minha%20assinatura', '_blank')} 
                  className="gap-2 cursor-pointer"
                >
                  <CreditCard size={15} /> Assinatura
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPwOpen(true)} className="gap-2 cursor-pointer">
                  <Shield size={15} /> Segurança
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive">
                  <LogOut size={15} /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Profile identity info */}
        <div className="flex flex-col items-center gap-4 mb-8">
           <div className="relative">
             {isOwnProfile ? (
               <PhotoSourcePicker onFile={handleAvatarFile}>
                 <button className="relative group overflow-hidden rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                    <Avatar className="w-24 h-24 border-4 border-background">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" /> : null}
                      <AvatarFallback className="bg-secondary"><User size={40} /></AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-1 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={20} className="text-white" />
                    </div>
                  </button>
               </PhotoSourcePicker>
             ) : (
                <div className="relative p-1 rounded-full bg-secondary">
                  <Avatar className="w-24 h-24 border-4 border-background">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" /> : null}
                    <AvatarFallback className="bg-secondary"><User size={40} /></AvatarFallback>
                  </Avatar>
                </div>
             )}
           </div>
           
           <div className="text-center space-y-1">
              <h2 className="font-cinzel text-xl font-bold text-foreground leading-tight flex items-center justify-center gap-1.5">
                {full_name}
                {profile?.is_verified && <BadgeCheck size={18} className="text-blue-500 fill-blue-500/20" />}
              </h2>
             <p className="text-xs text-muted-foreground uppercase tracking-widest">Aluno ANAAC · Desde {memberSince}</p>
           </div>
           
           <div className="grid grid-cols-4 gap-1 w-full pt-4">
               <div className="text-center">
                 <p className="text-base font-black text-foreground">{socialCounts?.posts ?? 0}</p>
                 <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">Posts</p>
               </div>
               <div className="text-center">
                 <p className="text-base font-black text-foreground">{socialCounts?.followers ?? 0}</p>
                 <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">Seguidores</p>
               </div>
                <div className="text-center text-orange-500">
                  <p className="text-base font-black">{streakNum}</p>
                  <p className="text-[9px] uppercase tracking-tighter">Dias Ativos</p>
                </div>
               <div className="text-center">
                 <p className="text-base font-black text-foreground">{socialCounts?.workoutsCount ?? 0}</p>
                 <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">Treinos</p>
               </div>
            </div>

           {!isOwnProfile && (
             <div className="w-full pt-2">
               <button
                 onClick={() => followMutation.mutate()}
                 disabled={followMutation.isPending}
                 className={`w-full h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                   isFollowing 
                     ? "bg-secondary text-foreground" 
                     : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                 }`}
               >
                 {followMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : isFollowing ? <><Check size={16} /> Seguindo</> : <><Users size={16} /> Seguir</>}
               </button>
               
             </div>
           )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-4 mb-4">
          <Grid3x3 size={18} />
          <span className="text-xs font-bold uppercase tracking-widest font-sans opacity-70">Publicações</span>
        </div>
        <PhotoGrid userId={targetUserId} />

        {/* Badges Section */}
        {streakNum > 0 && getUnlockedRewards(streakNum).length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-widest font-sans">Selos de Disciplina</span>
            </div>
            <UserBadges streak={streakNum} />
          </div>
        )}
      </div>

      <ChangePasswordSheet />
      
      {/* Subscription Sheet */}
      <Sheet open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-[2rem] max-h-[90vh] overflow-y-auto no-scrollbar">
          <SheetHeader className="pb-6">
            <SheetTitle className="font-cinzel text-xl text-center">Minha Assinatura</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-8 pb-10">
            {/* Current Plan Badge */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 shadow-xl">
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Status: Ativo</span>
                    <Zap size={16} className="text-accent animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-cinzel font-black uppercase italic tracking-tighter text-foreground">
                    {profile?.planner_type === 'elite' ? 'Plano Elite' : 
                     profile?.planner_type === 'constancia' ? 'Plano Constância' : 'Plano Essencial'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Sua transformação continua ativa! 🔥</p>
               </div>
               <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Benefits List */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">O que está incluído:</h4>
              <div className="grid gap-3">
                {[
                  "Acesso completo à plataforma ANAAC",
                  "Treinos personalizados p/ seu objetivo",
                  "Comunidade exclusiva de alunas",
                  profile?.planner_type === 'elite' ? "Consultoria direta c/ Especialistas" : null,
                  profile?.planner_type === 'elite' ? "Protocolos hormonais avançados" : null,
                  profile?.planner_type === 'constancia' || profile?.planner_type === 'elite' ? "Cardápios flexíveis e receitas Fit" : null,
                ].filter(Boolean).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border/50">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-foreground/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Section */}
            {profile?.planner_type !== 'elite' && (
              <div className="p-5 rounded-3xl bg-accent/5 border border-accent/20 border-dashed space-y-3">
                 <div className="flex items-center gap-2 text-accent">
                   <Zap size={16} />
                   <span className="text-xs font-black uppercase tracking-widest">Upgrade Disponível</span>
                 </div>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Você pode subir de nível para o **Plano Elite** e garantir protocolos ainda mais avançados e acompanhamento próximo.
                 </p>
                 <Button onClick={() => window.open('https://anaacclub.com', '_blank')} variant="outline" className="w-full border-accent/30 text-accent hover:bg-accent/10 rounded-xl h-10 text-xs font-black uppercase tracking-widest">
                   Melhorar meu Plano <ExternalLink size={14} className="ml-2" />
                 </Button>
              </div>
            )}

            {/* Support / Cancel Section */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => window.open('https://wa.me/556196383321?text=Oii%20Ana!%20quero%20cancelar', '_blank')}
                  variant="ghost" 
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-12 rounded-2xl text-xs font-bold gap-2"
                >
                  <HelpCircle size={16} /> Cancelar minha assinatura
                </Button>
                <p className="text-[10px] text-center text-muted-foreground px-6 italic">
                  O cancelamento será processado pelo nosso time de suporte via WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit nome Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-cinzel">Editar Perfil</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome de Exibição</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default Perfil;

