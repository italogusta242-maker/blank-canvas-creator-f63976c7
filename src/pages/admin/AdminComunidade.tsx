import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PodiumCard, type PodiumEntry } from "@/components/community/PodiumCard";
import {
  useLeagueRanking,
  LEAGUE_LABELS,
  type LeagueCategory,
  type LeaguePeriod,
} from "@/hooks/useLeagueRanking";
import { CHALLENGE_START_DATE } from "@/lib/challengeConfig";
import { isoToLocalDate } from "@/lib/dateUtils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User, Heart, MessageCircle, Trash2, Search, Loader2,
  Trophy, Users, MessagesSquare, Calendar,
} from "lucide-react";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Aba 1: Feed Geral (todos os posts + filtros + moderação)
// ────────────────────────────────────────────────────────────

type PeriodFilter = "today" | "7d" | "30d" | "all";
type LeagueFilter = "all" | LeagueCategory;

function periodCutoffISO(p: PeriodFilter): string | null {
  const now = new Date();
  if (p === "today") {
    const d = new Date(now); d.setHours(0,0,0,0);
    return d.toISOString();
  }
  if (p === "7d") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (p === "30d") {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return d.toISOString();
  }
  return null;
}

function FeedGeralTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-community-feed", period, league, page],
    queryFn: async () => {
      let q = supabase
        .from("community_posts")
        .select(`
          id, content, image_url, created_at, user_id,
          profiles!community_posts_user_id_fkey ( id, full_name, avatar_url, planner_type )
        `)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const cutoff = periodCutoffISO(period);
      if (cutoff) q = q.gte("created_at", cutoff);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Counts (likes/comments) — fetched in batch
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: counts = {} } = useQuery({
    queryKey: ["admin-community-counts", postIds],
    queryFn: async () => {
      if (postIds.length === 0) return {} as Record<string, { likes: number; comments: number }>;
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds),
      ]);
      const out: Record<string, { likes: number; comments: number }> = {};
      postIds.forEach((id) => (out[id] = { likes: 0, comments: 0 }));
      (likes || []).forEach((l: any) => (out[l.post_id].likes += 1));
      (comments || []).forEach((c: any) => (out[c.post_id].comments += 1));
      return out;
    },
    enabled: postIds.length > 0,
  });

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const profile = p.profiles as any;
      const matchesLeague = league === "all" || profile?.planner_type === league;
      const text = (p.content || "").toLowerCase();
      const name = (profile?.full_name || "").toLowerCase();
      const matchesSearch =
        !search ||
        text.includes(search.toLowerCase()) ||
        name.includes(search.toLowerCase());
      return matchesLeague && matchesSearch;
    });
  }, [posts, league, search]);

  const handleDelete = async (postId: string) => {
    if (!confirm("Excluir este post permanentemente?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) {
      toast.error("Erro ao excluir post");
      console.error(error);
      return;
    }
    toast.success("Post excluído");
    queryClient.invalidateQueries({ queryKey: ["admin-community-feed"] });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar por aluna ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodFilter); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={league} onValueChange={(v) => { setLeague(v as LeagueFilter); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ligas</SelectItem>
            <SelectItem value="essencial">Essencial</SelectItem>
            <SelectItem value="constancia">Constância</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessagesSquare size={32} className="mx-auto mb-2 opacity-30" />
          Nenhum post encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const profile = post.profiles as any;
            const c = counts[post.id] || { likes: 0, comments: 0 };
            const planLabel = profile?.planner_type ? LEAGUE_LABELS[profile.planner_type as LeagueCategory] : null;
            return (
              <Card key={post.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : <User size={18} className="text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || "Anônimo"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</span>
                          {planLabel && (
                            <span className={`font-bold uppercase ${planLabel.color}`}>{planLabel.label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  {post.content && (
                    <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{post.content}</p>
                  )}

                  {post.image_url && (
                    <img src={post.image_url} alt="" className="rounded-lg max-h-80 object-cover w-full" />
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><Heart size={12} />{c.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} />{c.comments}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {page + 1}</span>
            <Button variant="outline" size="sm" disabled={posts.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
              Próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Aba 2: Perfis das Alunas
// ────────────────────────────────────────────────────────────

function PerfisTab() {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>("all");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-community-students"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, planner_type, status")
        .in("planner_type", ["essencial", "constancia", "elite"]);
      if (error) throw error;

      const userIds = (profiles || []).map((p: any) => p.id);
      if (userIds.length === 0) return [];

      const { data: posts } = await supabase
        .from("community_posts")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", new Date(CHALLENGE_START_DATE).toISOString());

      const activeDaysMap: Record<string, Set<string>> = {};
      const totalsMap: Record<string, number> = {};
      const lastActiveMap: Record<string, string> = {};
      (posts || []).forEach((p: any) => {
        const d = isoToLocalDate(p.created_at);
        if (!activeDaysMap[p.user_id]) activeDaysMap[p.user_id] = new Set();
        if (d) activeDaysMap[p.user_id].add(d);
        totalsMap[p.user_id] = (totalsMap[p.user_id] || 0) + 1;
        if (!lastActiveMap[p.user_id] || p.created_at > lastActiveMap[p.user_id]) {
          lastActiveMap[p.user_id] = p.created_at;
        }
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        active_days: activeDaysMap[p.id]?.size ?? 0,
        total_posts: totalsMap[p.id] ?? 0,
        last_active: lastActiveMap[p.id] ?? null,
      }));
    },
  });

  const filtered = useMemo(() => {
    return students.filter((s: any) => {
      const matchesLeague = leagueFilter === "all" || s.planner_type === leagueFilter;
      const matchesSearch = !search || (s.full_name || "").toLowerCase().includes(search.toLowerCase());
      return matchesLeague && matchesSearch;
    }).sort((a: any, b: any) => b.active_days - a.active_days);
  }, [students, search, leagueFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Buscar aluna..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={leagueFilter} onValueChange={(v) => setLeagueFilter(v as LeagueFilter)}>
          <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ligas</SelectItem>
            <SelectItem value="essencial">Essencial</SelectItem>
            <SelectItem value="constancia">Constância</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((s: any) => {
            const planLabel = s.planner_type ? LEAGUE_LABELS[s.planner_type as LeagueCategory] : null;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedUserId(s.id)}
                className="group bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden border-2 border-border shrink-0">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{s.full_name || "Anônima"}</p>
                    {planLabel && <p className={`text-[10px] font-bold uppercase ${planLabel.color}`}>{planLabel.label}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>🔥 {s.active_days} dias</span>
                  <span>📝 {s.total_posts}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <StudentDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}

function StudentDetailModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-detail", userId],
    queryFn: async () => {
      if (!userId) return null;
      const [{ data: profile }, { data: posts }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, planner_type, bio, email").eq("id", userId).single(),
        supabase.from("community_posts").select("id, content, image_url, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);
      const activeDays = new Set<string>();
      (posts || []).forEach((p: any) => {
        const d = isoToLocalDate(p.created_at);
        if (d) activeDays.add(d);
      });
      return { profile, posts: posts || [], active_days: activeDays.size };
    },
    enabled: !!userId,
  });

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil da Aluna</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden border-2 border-border">
                {data.profile?.avatar_url ? <img src={data.profile.avatar_url} className="w-full h-full object-cover" alt="" /> :
                  <div className="w-full h-full flex items-center justify-center"><User size={28} /></div>}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{data.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{data.profile?.email}</p>
                {data.profile?.planner_type && (
                  <span className={`text-[10px] font-bold uppercase ${LEAGUE_LABELS[data.profile.planner_type as LeagueCategory]?.color}`}>
                    Liga {LEAGUE_LABELS[data.profile.planner_type as LeagueCategory]?.label}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">{data.active_days}</p>
                <p className="text-[10px] text-muted-foreground uppercase">dias ativos</p>
              </div>
            </div>

            {data.profile?.bio && (
              <p className="text-sm text-muted-foreground italic">"{data.profile.bio}"</p>
            )}

            <div>
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><Calendar size={14} /> Histórico de Posts ({data.posts.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.posts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum post ainda.</p>
                ) : data.posts.map((post: any) => (
                  <div key={post.id} className="bg-secondary/40 rounded-lg p-3 text-xs">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {format(new Date(post.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {post.content && <p className="text-foreground/90 whitespace-pre-wrap">{post.content}</p>}
                    {post.image_url && <img src={post.image_url} alt="" className="mt-2 rounded max-h-40 object-cover" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Aba 3: Rankings das 3 Ligas
// ────────────────────────────────────────────────────────────

function LeagueColumn({ category, period }: { category: LeagueCategory; period: LeaguePeriod }) {
  const { data = [], isLoading } = useLeagueRanking(category, period);
  const meta = LEAGUE_LABELS[category];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy size={16} className={meta.color} />
          <span className={meta.color}>Liga {meta.label}</span>
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">{data.length} alunas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" size={20} /></div>
        ) : (
          <PodiumCard entries={data.slice(0, 10)} />
        )}
      </CardContent>
    </Card>
  );
}

function RankingsTab() {
  const [period, setPeriod] = useState<LeaguePeriod>("month");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Ranking de dias ativos por liga.</p>
        <Select value={period} onValueChange={(v) => setPeriod(v as LeaguePeriod)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal (7 dias)</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="all">Tudo (desde 08/04)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LeagueColumn category="essencial" period={period} />
        <LeagueColumn category="constancia" period={period} />
        <LeagueColumn category="elite" period={period} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────

export default function AdminComunidade() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="text-primary" /> Comunidade
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visão completa do feed, perfis das alunas e rankings das três ligas.</p>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed"><MessagesSquare size={14} className="mr-1.5" /> Feed</TabsTrigger>
          <TabsTrigger value="perfis"><Users size={14} className="mr-1.5" /> Perfis</TabsTrigger>
          <TabsTrigger value="rankings"><Trophy size={14} className="mr-1.5" /> Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6"><FeedGeralTab /></TabsContent>
        <TabsContent value="perfis" className="mt-6"><PerfisTab /></TabsContent>
        <TabsContent value="rankings" className="mt-6"><RankingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
